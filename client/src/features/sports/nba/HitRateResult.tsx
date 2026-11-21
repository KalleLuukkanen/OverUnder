import type { NbaHitRate } from "../../../types/nba";
import { Link } from "react-router-dom";
import { overtimeLabel } from "../../../utils/nbaGame";
import OlderGamesNote from "../../../components/OlderGamesNote";
import SignInPrompt from "../../../components/SignInPrompt";

// hit rate percentage, a bar, and every game as a hit (✓) or miss (✗)
// children (the splits) go between the bar and the game list
function HitRateResult({ result, children }: { result: NbaHitRate, children?: React.ReactNode }) {

    if (result.games === 0) {
        return result.older_hidden ?
            <SignInPrompt title="Older games are for members" text="This player's games are from past seasons. Sign up free to check props on them." /> :
            <p className="text-zinc-500">No games found</p>;
    }

    const good = result.hit_rate !== null && result.hit_rate >= 50;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <span className={`text-5xl font-bold tabular-nums ${good ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.hit_rate}%
                </span>
                <span className="pb-1 text-zinc-400">
                    <span className="capitalize">{result.side}</span> {result.line} · {result.hits}/{result.games} games · avg {result.average}
                </span>
            </div>
            {/* hit rate bar */}
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full ${good ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${result.hit_rate ?? 0}%` }} />
            </div>
            {children}
            <ul className="flex flex-col divide-y divide-zinc-800 text-sm">
                {result.results.map((r) => (
                    <li key={r.game_id} className="flex items-center gap-3 py-1.5">
                        <span className={`w-6 text-center text-xs font-bold rounded ${r.hit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                            {r.hit ? "✓" : "✗"}
                        </span>
                        <span className="text-zinc-400 w-24">{new Date(r.game_date).toLocaleDateString("fi-FI")}</span>
                        <Link className="w-16 hover:text-sky-400 hover:underline" to={`/nba/game/${r.game_id}`}>
                            {r.is_home ? "vs" : "@"} {r.opponent}
                        </Link>
                        <span className="font-semibold tabular-nums w-8 text-right">{r.value}</span>
                        <span className="text-zinc-500 tabular-nums">{Math.round(r.minutes)} min</span>
                        {overtimeLabel(r.overtime_periods) &&
                            <span className="px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400" title="Game went to overtime">
                                {overtimeLabel(r.overtime_periods)}
                            </span>
                        }
                    </li>
                ))}
            </ul>
            {result.older_hidden && <OlderGamesNote />}
        </div>
    )
}

export default HitRateResult;
