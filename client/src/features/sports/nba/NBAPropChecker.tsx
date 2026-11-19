import type { NbaGame, NbaHitRate, NbaPlayer, NbaSide, NbaStat } from "../../../types/nba";
import { getHitRate } from "../../../api/nba/nbaPlayerGamesApi";
import { getTeamsNextGame } from "../../../api/nba/nbaGamesApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import PlayerSearch from "./PlayerSearch";
import HitRateResult from "./HitRateResult";
import HitRateSplits from "./HitRateSplits";
import AddToParlay from "../../parlays/AddToParlay";
import { STATS } from "./hitRateStats";
import { gameDateTime } from "../../../utils/nbaGame";

// shared look of the form controls
const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";
const label = "text-xs font-medium uppercase tracking-wide text-zinc-400";

// quick prop check for any player: pick player, stat, line and side, see how often it hit
function NBAPropChecker() {

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
    };

    // next opponent is the team in the next game that isn't the player's
    const nextOpponent = nextGame && player
        ? (nextGame.home_team_id === player.team_id
            ? { id: nextGame.away_team_id, abbreviation: nextGame.away_team, home: true }
            : { id: nextGame.home_team_id, abbreviation: nextGame.home_team, home: false })
        : null;

    const calculate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!player || line === "") return;
        setCalculating(true);
        setErrorMessage("");
        try {
            const res = await getHitRate(
                player.id,
                { stat, line: Number(line), side, limit },
                vsNext && nextOpponent ? nextOpponent.id : undefined,
            );
            setResult(res);
        } catch {
            setResult(null);
            setErrorMessage("Couldn't calculate hit rate, please try again");
        } finally {
            setCalculating(false);
        }
    };

    const canCalculate = player !== null && line !== "" && !calculating;
    const statLabel = STATS.find((s) => s.value === stat)?.label;

    return (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={calculate}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <span className={label}>Player</span>
                    {player ?
                        <div className="flex items-center justify-between gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5">
                            <Link className="font-medium hover:text-sky-400 hover:underline" to={`/nba/player/${player.id}`}>
                                {player.name}
                                {player.team && <span className="ml-2 text-sm font-normal text-zinc-400">{player.team}</span>}
                            </Link>
                            <button
                                className="p-0.5 rounded cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-700"
                                type="button"
                                aria-label="Change player"
                                onClick={() => choosePlayer(null)}
                            >
                                <X size={16} />
                            </button>
                        </div> :
                        <PlayerSearch onSelect={choosePlayer} placeholder="Search any NBA player..." className="w-full" activeOnly />
                    }
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
                            {[5, 10, 15, 20, 30].map((n) => (
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
                        <AddToParlay player_id={player.id} stat={result.stat} line={result.line} side={result.side} />
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

export default NBAPropChecker;
