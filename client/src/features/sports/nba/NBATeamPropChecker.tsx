import type { NbaGame, NbaHitRateSplit, NbaSide, NbaTeam, NbaTeamHitRate, NbaTeamMarket } from "../../../types/nba";
import OlderGamesNote from "../../../components/OlderGamesNote";
import { getAll, getTeamHitRate, getTeamHitRateSplits } from "../../../api/nba/nbaTeamsApi";
import { getTeamsNextGame } from "../../../api/nba/nbaGamesApi";
import { useCallback, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SplitRow } from "./HitRateSplits";
import AddToParlay from "../../parlays/AddToParlay";
import { TEAM_MARKETS, betLabel, signed } from "./teamMarkets";
import { gameDateTime, overtimeLabel } from "../../../utils/nbaGame";
import { LIMITS, opponentIn, readLimit, readLine, readSide, withBet } from "../../../utils/betParams";
import useWatchlist from "../../watchlist/useWatchlist";
import TeamPlayerSplits from "./TeamPlayerSplits";
import BetValue from "../../props/BetValue";
import OddsField from "../../props/OddsField";
import { parseOdds, readOdds } from "../../../utils/odds";
import WatchPicks from "../../watchlist/WatchPicks";
import WatchStar from "../../watchlist/WatchStar";
import useStableSetSearchParams from "../../../utils/useStableSetSearchParams";

// shared look of the form controls
const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";
const label = "text-xs font-medium uppercase tracking-wide text-zinc-400";

// the checked bet over other samples, loaded after the result
// uses the result's market, line and side (what was checked), not the form's current values
function TeamHitRateSplits({ team_id, result, opponent_id }: { team_id: number, result: NbaTeamHitRate, opponent_id?: number }) {

    const [splits, setSplits] = useState<NbaHitRateSplit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = async () => {
            try {
                const res = await getTeamHitRateSplits(team_id, { market: result.market, line: result.line, side: result.side }, opponent_id);
                if (!cancelled) setSplits(res.splits);
            } catch {
                if (!cancelled) setSplits([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [team_id, result.market, result.line, result.side, opponent_id]);

    if (loading) return <p className="text-sm text-zinc-500">Loading splits...</p>;
    if (splits.length === 0) return null;

    return (
        <div className="flex flex-col gap-1">
            <span className={label}>Splits</span>
            <ul className="flex flex-col text-sm">
                {splits.map((s) => <SplitRow key={s.key} split={s} />)}
            </ul>
        </div>
    )
}

// hit rate, a bar, the splits and every game with its score and the bet's value
function TeamHitRateResult({ team, result, children }: { team: NbaTeam, result: NbaTeamHitRate, children?: React.ReactNode }) {

    if (result.games === 0) return result.older_hidden ? <OlderGamesNote /> : <p className="text-zinc-500">No games found</p>;

    const good = result.hit_rate !== null && result.hit_rate >= 50;
    const margins = result.market === "win" || result.market === "spread";

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <span className={`text-5xl font-bold tabular-nums ${good ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.hit_rate}%
                </span>
                <span className="pb-1 text-zinc-400">
                    {betLabel(team.abbreviation, result.market, result.line, result.side)} · {result.hits}/{result.games} games
                    · {margins ? `avg margin ${signed(result.average ?? 0)}` : `avg ${result.average}`}
                </span>
            </div>
            {/* hit rate bar */}
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full ${good ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${result.hit_rate ?? 0}%` }} />
            </div>
            {children}
            <ul className="flex flex-col divide-y divide-zinc-800 text-sm">
                {result.results.map((r) => {
                    const won = r.team_score > r.opp_score;
                    return (
                        <li key={r.game_id} className="flex items-center gap-3 py-1.5">
                            <span className={`w-6 text-center text-xs font-bold rounded ${r.hit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                                {r.hit ? "✓" : "✗"}
                            </span>
                            <span className="text-zinc-400 w-24">{new Date(r.game_date).toLocaleDateString("fi-FI")}</span>
                            <Link className="w-16 hover:text-sky-400 hover:underline" to={`/nba/game/${r.game_id}`}>
                                {r.is_home ? "vs" : "@"} {r.opponent}
                            </Link>
                            <span className="w-20 tabular-nums text-zinc-400">
                                <span className={won ? "text-emerald-400" : "text-rose-400"}>{won ? "W" : "L"}</span> {r.team_score}-{r.opp_score}
                            </span>
                            {result.market !== "win" &&
                                <span className="font-semibold tabular-nums w-10 text-right">{margins ? signed(r.value) : r.value}</span>
                            }
                            {overtimeLabel(r.overtime_periods) &&
                                <span className="px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400" title="Game went to overtime">
                                    {overtimeLabel(r.overtime_periods)}
                                </span>
                            }
                        </li>
                    );
                })}
            </ul>
            {result.older_hidden && <OlderGamesNote />}
        </div>
    )
}

// team and game bets: pick a team, a bet (win, spread, totals, team stats) and a line, see how often it hit
// game totals are checked from the chosen team's games
// the checked bet goes to the url (?bet=team&team=...) and is checked again from it when the page opens
// members can pick a team from their watchlist and star the picked one
function NBATeamPropChecker() {

    const watch = useWatchlist();

    const [searchParams] = useSearchParams();
    // stable: the url's bet is restored once, not again after every url change
    const setSearchParams = useStableSetSearchParams();
    // the url as the page opened, read once
    const [initialParams] = useState(() => new URLSearchParams(searchParams));

    const [teams, setTeams] = useState<NbaTeam[]>([]);
    const [teamId, setTeamId] = useState<number | null>(null);

    // bet selections
    const [market, setMarket] = useState<NbaTeamMarket>("spread");
    const [line, setLine] = useState("");
    const [side, setSide] = useState<NbaSide>("over");
    const [limit, setLimit] = useState(10);
    const [vsNext, setVsNext] = useState(false);
    const [odds, setOdds] = useState("");   // bookmaker's decimal odds as typed, optional

    // team's next game, its opponent can be used as a filter
    const [nextGame, setNextGame] = useState<NbaGame | null>(null);

    const [calculating, setCalculating] = useState(false);
    const [result, setResult] = useState<NbaTeamHitRate | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const team = teams.find((t) => t.id === teamId) ?? null;
    const rules = TEAM_MARKETS.find((m) => m.value === market)!;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getAll();
                if (!cancelled) setTeams([...result].sort((a, b) => a.name.localeCompare(b.name)));
            } catch {
                if (!cancelled) setErrorMessage("Couldn't load the teams, please try again");
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    useEffect(() => {
        if (!teamId) return;
        let cancelled = false;
        const load = async () => {
            try {
                const game = await getTeamsNextGame(teamId);
                if (!cancelled) setNextGame(game);
            } catch {
                // 404 = no upcoming games, the opponent filter is just not shown
                if (!cancelled) setNextGame(null);
            }
        };
        load();
        return () => { cancelled = true };
    }, [teamId]);

    // new team: old result, next game and opponent filter don't apply anymore
    const chooseTeam = (id: number | null) => {
        setTeamId(id);
        setNextGame(null);
        setVsNext(false);
        setResult(null);
        setErrorMessage("");
        setSearchParams((params) => withBet(params, { bet: "team" }), { replace: true });
    };

    // next opponent is the team in the next game that isn't the chosen one
    const nextOpponent = nextGame && teamId ? opponentIn(nextGame, teamId) : null;

    // checks the bet and puts it in the url (opponent_id = only games vs the next opponent)
    const check = useCallback(async (bet: { team_id: number, market: NbaTeamMarket, line: number, side: NbaSide, limit: number, odds: number | null }, opponent_id?: number) => {
        setCalculating(true);
        setErrorMessage("");
        try {
            const res = await getTeamHitRate(bet.team_id, { market: bet.market, line: bet.line, side: bet.side, limit: bet.limit }, opponent_id);
            setResult(res);
            setSearchParams((params) => withBet(params, {
                bet: "team", team: bet.team_id, market: bet.market, line: bet.line, side: bet.side, last: bet.limit, vs: opponent_id !== undefined, odds: bet.odds,
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
        if (!teamId || (rules.line && line === "")) return;
        await check(
            { team_id: teamId, market, line: rules.line ? Number(line) : 0, side: rules.side ? side : "over", limit, odds: parseOdds(odds) },
            vsNext && nextOpponent ? nextOpponent.id : undefined,
        );
    };

    // a bet in the url (e.g. back from signing in): fill the form and check it again
    useEffect(() => {
        const team_id = Number(initialParams.get("team"));
        const urlMarket = TEAM_MARKETS.find((m) => m.value === initialParams.get("market"));
        const urlLine = urlMarket?.line ? readLine(initialParams) : "0";
        if (initialParams.get("bet") !== "team" || !team_id || !urlMarket || urlLine === null) return;
        let cancelled = false;
        const restore = async () => {
            const bet = {
                team_id,
                market: urlMarket.value,
                line: Number(urlLine),
                side: urlMarket.side ? readSide(initialParams) : "over" as NbaSide,
                limit: readLimit(initialParams),
                odds: parseOdds(initialParams.get("odds")),
            };
            setTeamId(team_id);
            setMarket(bet.market);
            if (urlMarket.line) setLine(urlLine);
            setSide(bet.side);
            setLimit(bet.limit);
            setOdds(readOdds(initialParams));
            // vs the next opponent: that game is needed first
            let opponent_id: number | undefined;
            if (initialParams.get("vs") === "1") {
                const game = await getTeamsNextGame(team_id).catch(() => null);
                if (cancelled) return;
                if (game) {
                    opponent_id = opponentIn(game, team_id).id;
                    setVsNext(true);
                }
            }
            await check(bet, opponent_id);
        };
        restore();
        return () => { cancelled = true };
    }, [initialParams, check]);

    const canCalculate = teamId !== null && (!rules.line || line !== "") && !calculating;

    return (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={calculate}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className={label} id="team-label">Team</span>
                        <WatchPicks
                            items={watch.watchlist?.teams ?? []}
                            selectedId={teamId}
                            onPick={(id) => { if (id !== teamId) chooseTeam(id); }}
                            label="Pick a team from your watchlist"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <select className={`${control} flex-1 min-w-0`} aria-labelledby="team-label" value={teamId ?? ""} onChange={(e) => chooseTeam(e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Choose a team...</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {team && <WatchStar list={watch} kind="team" id={team.id} name={team.name} />}
                    </div>
                    {watch.error && <span className="text-xs text-rose-400">{watch.error}</span>}
                </div>
                <label className="flex flex-col gap-1">
                    <span className={label}>Bet</span>
                    <select className={control} value={market} onChange={(e) => setMarket(e.target.value as NbaTeamMarket)}>
                        {TEAM_MARKETS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {rules.side &&
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
                    }
                    {rules.line &&
                        <label className="flex flex-col gap-1">
                            <span className={label}>{market === "spread" ? "Team's line" : "Line"}</span>
                            <input
                                className={control}
                                type="number"
                                step="0.5"
                                min={market === "spread" ? undefined : "0"}
                                placeholder={rules.placeholder}
                                value={line}
                                onChange={(e) => setLine(e.target.value)}
                            />
                        </label>
                    }
                    <OddsField value={odds} onChange={setOdds} control={control} label={label} />
                    <label className="flex flex-col gap-1">
                        <span className={label}>Last games</span>
                        <select className={control} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                            {LIMITS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </label>
                </div>
                {market === "spread" &&
                    <p className="text-xs text-zinc-500">Minus = the team is favored: -5.5 means they need to win by 6 or more. Plus = underdog: +3.5 covers if they lose by 3 or less, or win.</p>
                }
                {nextOpponent && nextGame &&
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-fit">
                        <input
                            className="accent-sky-500 w-4 h-4"
                            type="checkbox"
                            checked={vsNext}
                            onChange={(e) => setVsNext(e.target.checked)}
                        />
                        <span>
                            Only games vs next opponent {nextOpponent.abbreviation}
                            <span className="text-zinc-500"> ({nextOpponent.home ? "vs" : "@"} {nextOpponent.abbreviation}, {gameDateTime(nextGame)})</span>
                        </span>
                    </label>
                }
                <button
                    className="mt-1 bg-sky-500 hover:bg-sky-400 text-on-accent font-medium rounded-md px-4 py-2 cursor-pointer disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={!canCalculate}
                >
                    {calculating ? "Checking..." : "Check bet"}
                </button>
            </div>

            <div className="flex flex-col gap-3 md:border-l md:border-zinc-800 md:pl-6">
                {errorMessage && <p className="text-rose-400">{errorMessage}</p>}
                {result && team &&
                    <p className="text-sm text-zinc-400">
                        <Link className="hover:text-sky-400 hover:underline" to={`/nba/team/${team.id}`}>{team.name}</Link>
                        {vsNext && nextOpponent ? ` · vs ${nextOpponent.abbreviation} only` : ""}
                    </p>
                }
                {result && team ?
                    <TeamHitRateResult team={team} result={result}>
                        <BetValue hit_rate={result.hit_rate} games={result.games} odds={parseOdds(odds)} />
                        <TeamHitRateSplits team_id={team.id} result={result} opponent_id={nextOpponent?.id} />
                        <TeamPlayerSplits team_id={team.id} result={result} />
                        <AddToParlay leg={{ team_id: team.id, market: result.market, line: result.line, side: result.side, odds: parseOdds(odds) }} />
                    </TeamHitRateResult> :
                    !errorMessage &&
                    <div className="flex flex-col gap-2 text-zinc-500">
                        <p>Pick a team, a bet and the line from your bookmaker.</p>
                        <p>Game totals are checked from that team's games, so pick either team of the game.</p>
                    </div>
                }
            </div>
        </form>
    )
}

export default NBATeamPropChecker;
