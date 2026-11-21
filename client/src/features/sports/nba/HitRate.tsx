import type { NbaHitRate, NbaRosterPlayer, NbaSide, NbaStat, NbaTeam } from "../../../types/nba";
import { getHitRate } from "../../../api/nba/nbaPlayerGamesApi";
import { getOne, getRoster } from "../../../api/nba/nbaTeamsApi";
import { useCallback, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LIMITS, readLimit, readLine, readSide, withBet } from "../../../utils/betParams";
import { STATS } from "./hitRateStats";
import HitRateResult from "./HitRateResult";
import HitRateSplits from "./HitRateSplits";
import TeammateSplits from "./TeammateSplits";
import AddToParlay from "../../parlays/AddToParlay";
import useWatchlist from "../../watchlist/useWatchlist";
import BetValue from "../../props/BetValue";
import OddsField from "../../props/OddsField";
import { parseOdds, readOdds } from "../../../utils/odds";
import WatchPicks from "../../watchlist/WatchPicks";
import WatchStar from "../../watchlist/WatchStar";
import useStableSetSearchParams from "../../../utils/useStableSetSearchParams";

// prop checker of a game page: pick either team's player, a stat and a line
// the checked prop goes to the url (?team=...&player=...&stat=...) and is checked again when the page opens,
// so signing in to save it to a parlay comes back to the same result
// members can pick their watched players of these two teams, and star the picked one
function HitRate({ team1_id, team2_id }: { team1_id: number, team2_id?: number }) {

    const watch = useWatchlist();

    const [searchParams] = useSearchParams();
    // stable: the url's bet is restored once, not again after every url change
    const setSearchParams = useStableSetSearchParams();
    // the url as the page opened, read once; its team must be one of the game's
    const [initialParams] = useState(() => new URLSearchParams(searchParams));
    const urlTeam = Number(initialParams.get("team"));
    const initialTeam = urlTeam === team1_id || urlTeam === team2_id ? urlTeam : team1_id;

    const [loading, setLoading] = useState(true);

    const [team1, setTeam1] = useState<NbaTeam | null>(null);
    const [team2, setTeam2] = useState<NbaTeam | null>(null);

    const [team1Roster, setTeam1Roster] = useState<NbaRosterPlayer[]>([]);
    const [team2Roster, setTeam2Roster] = useState<NbaRosterPlayer[]>([]);

    const [rosterSelected, setRosterSelected] = useState<number>(initialTeam);
    const [playerSelected, setPlayerSelected] = useState<number | null>(() => Number(initialParams.get("player")) || null);

    // bet selections, from the url if a prop was checked there
    const [stat, setStat] = useState<NbaStat>(() => STATS.find((s) => s.value === initialParams.get("stat"))?.value ?? "pts");
    const [line, setLine] = useState(() => readLine(initialParams) ?? "");
    const [side, setSide] = useState<NbaSide>(() => readSide(initialParams));
    const [limit, setLimit] = useState(() => readLimit(initialParams));
    const [vsOpponent, setVsOpponent] = useState(() => initialParams.get("vs") === "1");
    const [odds, setOdds] = useState(() => readOdds(initialParams));   // bookmaker's decimal odds as typed, optional

    const [calculating, setCalculating] = useState(false);
    const [result, setResult] = useState<NbaHitRate | null>(null);
    // player the result was calculated for, the select may already show another one
    const [resultPlayer, setResultPlayer] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // fetch everything in parallel, use the local values (state isn't updated yet inside this effect)
                const [t1, r1, t2, r2] = await Promise.all([
                    getOne(team1_id),
                    getRoster(team1_id),
                    team2_id ? getOne(team2_id) : null,
                    team2_id ? getRoster(team2_id) : [],
                ]);
                if (!cancelled) {
                    setTeam1(t1);
                    setTeam1Roster(r1);
                    setTeam2(t2);
                    setTeam2Roster(r2);
                }
            } catch {
                if (cancelled) return;
                alert("Something went wrong, please try again");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [team1_id, team2_id]);

    // switching team clears the player, since the old one isn't in the new roster
    const changeTeam = (team_id: number) => {
        setRosterSelected(team_id);
        setPlayerSelected(null);
        setResult(null);
    };

    // a watchlist pick: switch to the player's team and pick them
    const pickWatched = (player_id: number) => {
        const watched = watch.watchlist?.players.find((p) => p.id === player_id);
        if (!watched?.team_id) return;
        setRosterSelected(watched.team_id);
        setPlayerSelected(player_id);
        setResult(null);
    };

    // opponent is the team that isn't selected, undefined if there's only one team
    const opponent = rosterSelected === team1_id ? team2 : team1;

    // checks the prop and puts it in the url (opponent_id = only games vs the other team)
    const check = useCallback(async (
        bet: { team_id: number, player_id: number, stat: NbaStat, line: number, side: NbaSide, limit: number, odds: number | null },
        opponent_id?: number,
    ) => {
        setCalculating(true);
        setErrorMessage("");
        try {
            const res = await getHitRate(bet.player_id, { stat: bet.stat, line: bet.line, side: bet.side, limit: bet.limit }, opponent_id);
            setResult(res);
            setResultPlayer(bet.player_id);
            setSearchParams((params) => withBet(params, {
                team: bet.team_id, player: bet.player_id, stat: bet.stat, line: bet.line, side: bet.side, last: bet.limit, vs: opponent_id !== undefined, odds: bet.odds,
            }), { replace: true });
        } catch {
            setResult(null);
            setErrorMessage("Couldn't calculate hit rate, please try again");
        } finally {
            setCalculating(false);
        }
    }, [setSearchParams]);

    const calculate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerSelected || line === "") return;
        await check(
            { team_id: rosterSelected, player_id: playerSelected, stat, line: Number(line), side, limit, odds: parseOdds(odds) },
            vsOpponent && opponent ? opponent.id : undefined,
        );
    };

    // a prop in the url (e.g. back from signing in): check it again once the rosters are loaded
    // the form already starts with the url's values
    useEffect(() => {
        const player_id = Number(initialParams.get("player"));
        const urlStat = STATS.find((s) => s.value === initialParams.get("stat"))?.value;
        const urlLine = readLine(initialParams);
        if (loading || !player_id || !urlStat || urlLine === null) return;
        const other = initialTeam === team1_id ? team2_id : team1_id;
        check(
            { team_id: initialTeam, player_id, stat: urlStat, line: Number(urlLine), side: readSide(initialParams), limit: readLimit(initialParams), odds: parseOdds(initialParams.get("odds")) },
            initialParams.get("vs") === "1" && other ? other : undefined,
        );
    }, [loading, initialParams, initialTeam, team1_id, team2_id, check]);

    if (loading) return <p className="text-zinc-400">Loading hit rate...</p>;

    const roster = rosterSelected === team1_id ? team1Roster : team2Roster;
    const canCalculate = playerSelected !== null && line !== "" && !calculating;
    const pickedPlayer = roster.find((p) => p.id === playerSelected);
    // watched players who play in this game (their current team is one of the two)
    const watchedHere = (watch.watchlist?.players ?? []).filter((p) => p.team_id !== null && (p.team_id === team1_id || p.team_id === team2_id));

    // shared look of the form controls
    const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";
    const label = "text-xs font-medium uppercase tracking-wide text-zinc-400";

    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-xl font-semibold">Calculate hit rate</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4" onSubmit={calculate}>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                            <span className={label}>Team</span>
                            <select
                                className={control}
                                value={rosterSelected}
                                onChange={(e) => changeTeam(Number(e.target.value))}
                            >
                                <option value={team1_id}>{team1?.name}</option>
                                {team2_id && <option value={team2_id}>{team2?.name}</option>}
                            </select>
                        </label>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className={label} id="player-label">Player</span>
                                <WatchPicks items={watchedHere} selectedId={playerSelected} onPick={pickWatched} label="Pick a player from your watchlist" />
                            </div>
                            <div className="flex items-center gap-1">
                                <select
                                    className={`${control} flex-1 min-w-0`}
                                    aria-labelledby="player-label"
                                    value={playerSelected ?? ""}
                                    onChange={(e) => setPlayerSelected(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">-- choose player --</option>
                                    {roster.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                {pickedPlayer && <WatchStar list={watch} kind="player" id={pickedPlayer.id} name={pickedPlayer.name} />}
                            </div>
                        </div>
                    </div>
                    {watch.error && <span className="text-xs text-rose-400">{watch.error}</span>}
                    <label className="flex flex-col gap-1">
                        <span className={label}>Stat</span>
                        <select
                            className={control}
                            value={stat}
                            onChange={(e) => setStat(e.target.value as NbaStat)}
                        >
                            {STATS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className={label}>Side</span>
                            {/* over / under as a two-button toggle */}
                            <div className="flex rounded-md border border-zinc-700 overflow-hidden">
                                {(["over", "under"] as NbaSide[]).map((s) => (
                                    <button
                                        key={s}
                                        className={`flex-1 py-1.5 cursor-pointer capitalize ${side === s ? "bg-sky-500 text-on-accent" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                                        type="button"
                                        onClick={() => setSide(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="flex flex-col gap-1">
                            <span className={label}>Line</span>
                            <input
                                className={control}
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="e.g. 24.5"
                                value={line}
                                onChange={(e) => setLine(e.target.value)}
                            />
                        </label>
                        <OddsField value={odds} onChange={setOdds} control={control} label={label} />
                        <label className="flex flex-col gap-1">
                            <span className={label}>Last games</span>
                            <select
                                className={control}
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                            >
                                {LIMITS.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {opponent &&
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-fit">
                            <input
                                className="accent-sky-500 w-4 h-4"
                                type="checkbox"
                                checked={vsOpponent}
                                onChange={(e) => setVsOpponent(e.target.checked)}
                            />
                            <span>Only games against {opponent.name}</span>
                        </label>
                    }
                    <button
                        className="mt-1 bg-sky-500 hover:bg-sky-400 text-on-accent font-medium rounded-md px-4 py-2 cursor-pointer disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={!canCalculate}
                    >
                        {calculating ? "Calculating..." : "Calculate"}
                    </button>
                </div>

                <div className="flex flex-col gap-3 md:border-l md:border-zinc-800 md:pl-6">
                    {errorMessage && <p className="text-rose-400">{errorMessage}</p>}
                    {!result && !errorMessage &&
                        <p className="text-zinc-500">Choose a player, stat and line to see how often it would have hit.</p>
                    }
                    {result && resultPlayer !== null &&
                        <HitRateResult result={result}>
                            <BetValue hit_rate={result.hit_rate} games={result.games} odds={parseOdds(odds)} />
                            <HitRateSplits player_id={resultPlayer} result={result} opponent_id={opponent?.id} />
                            <TeammateSplits player_id={resultPlayer} result={result} />
                            <AddToParlay leg={{ player_id: resultPlayer, stat: result.stat, line: result.line, side: result.side, odds: parseOdds(odds) }} />
                        </HitRateResult>
                    }
                </div>
            </form>
        </section>
    )
}

export default HitRate;
