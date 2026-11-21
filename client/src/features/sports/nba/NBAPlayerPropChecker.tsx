import type { NbaGame, NbaHitRate, NbaPlayer, NbaSide, NbaStat } from "../../../types/nba";
import { getHitRate } from "../../../api/nba/nbaPlayerGamesApi";
import { getTeamsNextGame } from "../../../api/nba/nbaGamesApi";
import { getOne as getPlayer } from "../../../api/nba/nbaPlayersApi";
import { useCallback, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import PlayerSearch from "./PlayerSearch";
import HitRateResult from "./HitRateResult";
import HitRateSplits from "./HitRateSplits";
import AddToParlay from "../../parlays/AddToParlay";
import { STATS } from "./hitRateStats";
import { gameDateTime } from "../../../utils/nbaGame";
import { LIMITS, opponentIn, readLimit, readLine, readSide, withBet } from "../../../utils/betParams";
import useWatchlist from "../../watchlist/useWatchlist";
import WatchPicks from "../../watchlist/WatchPicks";
import WatchStar from "../../watchlist/WatchStar";

// shared look of the form controls
const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";
const label = "text-xs font-medium uppercase tracking-wide text-zinc-400";

// quick prop check for any player: pick player, stat, line and side, see how often it hit
// the checked prop goes to the url and is checked again from it when the page opens
// members can pick a player from their watchlist and star the picked one
function NBAPlayerPropChecker() {

    const watch = useWatchlist();

    const [searchParams, setSearchParams] = useSearchParams();
    // the url as the page opened, read once
    const [initialParams] = useState(() => new URLSearchParams(searchParams));

    const [player, setPlayer] = useState<NbaPlayer | null>(null);

    // bet selections
    const [stat, setStat] = useState<NbaStat>("pts");
    const [line, setLine] = useState("");
    const [side, setSide] = useState<NbaSide>("over");
    const [limit, setLimit] = useState(10);
    const [vsNext, setVsNext] = useState(false);

    // player's team's next game, its opponent can be used as a filter
    const [nextGame, setNextGame] = useState<NbaGame | null>(null);

    const [calculating, setCalculating] = useState(false);
    const [result, setResult] = useState<NbaHitRate | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!player?.team_id) return;
        let cancelled = false;
        const load = async () => {
            try {
                const game = await getTeamsNextGame(player.team_id as number);
                if (!cancelled) setNextGame(game);
            } catch {
                // 404 = no upcoming games, the opponent filter is just not shown
                if (!cancelled) setNextGame(null);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player?.team_id]);

    // new player: old result, next game and opponent filter don't apply anymore
    const choosePlayer = (chosen: NbaPlayer | null) => {
        setPlayer(chosen);
        setNextGame(null);
        setVsNext(false);
        setResult(null);
        setErrorMessage("");
        setSearchParams((params) => withBet(params, null), { replace: true });
    };

    // a watchlist pick: the player's details are needed, like from the search
    const pickWatched = async (player_id: number) => {
        if (player_id === player?.id) return;
        try {
            choosePlayer(await getPlayer(player_id));
        } catch {
            setErrorMessage("Couldn't load the player, please try again");
        }
    };

    // next opponent is the team in the next game that isn't the player's
    const nextOpponent = nextGame && player?.team_id ? opponentIn(nextGame, player.team_id) : null;

    // checks the prop and puts it in the url (opponent_id = only games vs the next opponent)
    const check = useCallback(async (bet: { player: NbaPlayer, stat: NbaStat, line: number, side: NbaSide, limit: number }, opponent_id?: number) => {
        setCalculating(true);
        setErrorMessage("");
        try {
            const res = await getHitRate(bet.player.id, { stat: bet.stat, line: bet.line, side: bet.side, limit: bet.limit }, opponent_id);
            setResult(res);
            setSearchParams((params) => withBet(params, {
                player: bet.player.id, stat: bet.stat, line: bet.line, side: bet.side, last: bet.limit, vs: opponent_id !== undefined,
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
        if (!player || line === "") return;
        await check({ player, stat, line: Number(line), side, limit }, vsNext && nextOpponent ? nextOpponent.id : undefined);
    };

    // a prop in the url (e.g. back from signing in): fill the form and check it again
    useEffect(() => {
        const player_id = Number(initialParams.get("player"));
        const urlStat = STATS.find((s) => s.value === initialParams.get("stat"))?.value;
        const urlLine = readLine(initialParams);
        if (initialParams.get("bet") === "team" || !player_id || !urlStat || urlLine === null) return;
        let cancelled = false;
        const restore = async () => {
            try {
                const restored = await getPlayer(player_id);
                if (cancelled) return;
                const bet = { player: restored, stat: urlStat, line: Number(urlLine), side: readSide(initialParams), limit: readLimit(initialParams) };
                setPlayer(restored);
                setStat(bet.stat);
                setLine(urlLine);
                setSide(bet.side);
                setLimit(bet.limit);
                // vs the next opponent: that game is needed first
                let opponent_id: number | undefined;
                if (initialParams.get("vs") === "1" && restored.team_id) {
                    const game = await getTeamsNextGame(restored.team_id).catch(() => null);
                    if (cancelled) return;
                    if (game) {
                        opponent_id = opponentIn(game, restored.team_id).id;
                        setVsNext(true);
                    }
                }
                await check(bet, opponent_id);
            } catch {
                // the player is gone: the form just starts empty
            }
        };
        restore();
        return () => { cancelled = true };
    }, [initialParams, check]);

    const canCalculate = player !== null && line !== "" && !calculating;
    const statLabel = STATS.find((s) => s.value === stat)?.label;

    return (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={calculate}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className={label}>Player</span>
                        <WatchPicks items={watch.watchlist?.players ?? []} selectedId={player?.id ?? null} onPick={pickWatched} label="Pick a player from your watchlist" />
                    </div>
                    {player ?
                        <div className="flex items-center justify-between gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5">
                            <Link className="font-medium hover:text-sky-400 hover:underline" to={`/nba/player/${player.id}`}>
                                {player.name}
                                {player.team && <span className="ml-2 text-sm font-normal text-zinc-400">{player.team}</span>}
                            </Link>
                            <div className="flex items-center gap-1">
                                <WatchStar list={watch} kind="player" id={player.id} name={player.name} />
                                <button
                                    className="p-1 rounded cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-700"
                                    type="button"
                                    aria-label="Change player"
                                    onClick={() => choosePlayer(null)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div> :
                        <PlayerSearch onSelect={choosePlayer} placeholder="Search any NBA player..." className="w-full" activeOnly />
                    }
                    {watch.error && <span className="text-xs text-rose-400">{watch.error}</span>}
                </div>
                <label className="flex flex-col gap-1">
                    <span className={label}>Stat</span>
                    <select className={control} value={stat} onChange={(e) => setStat(e.target.value as NbaStat)}>
                        {STATS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </label>
                <div className="grid grid-cols-3 gap-3">
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
                    <label className="flex flex-col gap-1">
                        <span className={label}>Last games</span>
                        <select className={control} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                            {LIMITS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </label>
                </div>
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
                    {calculating ? "Checking..." : "Check prop"}
                </button>
            </div>

            <div className="flex flex-col gap-3 md:border-l md:border-zinc-800 md:pl-6">
                {errorMessage && <p className="text-rose-400">{errorMessage}</p>}
                {result && player &&
                    <p className="text-sm text-zinc-400">
                        {player.name} · {statLabel}{vsNext && nextOpponent ? ` · vs ${nextOpponent.abbreviation} only` : ""}
                    </p>
                }
                {result && player ?
                    <HitRateResult result={result}>
                        <HitRateSplits player_id={player.id} result={result} opponent_id={nextOpponent?.id} />
                        <AddToParlay leg={{ player_id: player.id, stat: result.stat, line: result.line, side: result.side }} />
                    </HitRateResult> :
                    !errorMessage &&
                    <div className="flex flex-col gap-2 text-zinc-500">
                        <p>Pick a player, a stat and the line from your bookmaker.</p>
                        <p>You'll see how often it would have hit in their latest games, game by game.</p>
                    </div>
                }
            </div>
        </form>
    )
}

export default NBAPlayerPropChecker;
