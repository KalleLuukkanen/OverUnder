import { useEffect, useState } from "react";
import { getHitRateSplits } from "../../../api/nba/nbaPlayerGamesApi";
import type { NbaHitRate, NbaHitRateSplit } from "../../../types/nba";

// one sample: label, a small bar, hit rate, hits/games and average
export function SplitRow({ split }: { split: NbaHitRateSplit }) {

    if (split.games === 0 || split.hit_rate === null) {
        return (
            <li className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 py-1 text-zinc-500">
                <span className="truncate">{split.label}</span>
                <span className="text-xs">no games</span>
                <span />
            </li>
        );
    }

    const good = split.hit_rate >= 50;

    return (
        <li className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 py-1">
            <span className="truncate text-zinc-300" title={split.label}>{split.label}</span>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full ${good ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${split.hit_rate}%` }} />
            </div>
            <span className="flex gap-3 tabular-nums">
                <span className={`w-12 text-right font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}>{Math.round(split.hit_rate)}%</span>
                <span className="w-12 text-right text-zinc-400">{split.hits}/{split.games}</span>
                <span className="w-16 text-right text-zinc-500">avg {split.average}</span>
            </span>
        </li>
    );
}

// the checked prop's hit rate over other samples, so one lucky or unlucky stretch doesn't decide
// uses the result's stat, line and side (what was checked), not the form's current values
function HitRateSplits({ player_id, result, opponent_id }: { player_id: number, result: NbaHitRate, opponent_id?: number }) {

    const [splits, setSplits] = useState<NbaHitRateSplit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = async () => {
            try {
                const res = await getHitRateSplits(player_id, { stat: result.stat, line: result.line, side: result.side }, opponent_id);
                if (!cancelled) setSplits(res.splits);
            } catch {
                if (!cancelled) setSplits([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id, result.stat, result.line, result.side, opponent_id]);

    if (loading) return <p className="text-sm text-zinc-500">Loading splits...</p>;
    if (splits.length === 0) return null;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Splits</span>
            <ul className="flex flex-col text-sm">
                {splits.map((s) => <SplitRow key={s.key} split={s} />)}
            </ul>
        </div>
    )
}

export default HitRateSplits;
