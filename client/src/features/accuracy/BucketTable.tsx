import type { CalibrationBucket } from "../../types/nba";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

// the calibration buckets as a table: what we said, how often it hit and the gap
// a gap under -3 points means the chances in that bucket were too optimistic, over +3 too careful
function BucketTable({ buckets }: { buckets: CalibrationBucket[] }) {
    if (buckets.length === 0) return null;
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-xs text-zinc-500">
                    <th className="py-1 text-left font-normal">Chance</th>
                    <th className="py-1 text-right font-normal">Bets</th>
                    <th className="py-1 text-right font-normal">We said</th>
                    <th className="py-1 text-right font-normal">It hit</th>
                    <th className="py-1 text-right font-normal" title="Hit minus said, in percentage points">Gap</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 tabular-nums">
                {buckets.map((b) => {
                    const gap = (b.actual - b.predicted) * 100;
                    return (
                        <tr key={b.from}>
                            <td className="py-1.5 text-zinc-300">{Math.round(b.from * 100)}–{Math.round(b.to * 100)}%</td>
                            <td className="py-1.5 text-right text-zinc-400">{b.count.toLocaleString()}</td>
                            <td className="py-1.5 text-right text-zinc-300">{pct(b.predicted)}</td>
                            <td className="py-1.5 text-right text-zinc-100 font-medium">{pct(b.actual)}</td>
                            <td className={`py-1.5 text-right font-semibold ${gap < -3 ? "text-rose-400" : gap > 3 ? "text-amber-400" : "text-emerald-400"}`}>
                                {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    )
}

export default BucketTable;
