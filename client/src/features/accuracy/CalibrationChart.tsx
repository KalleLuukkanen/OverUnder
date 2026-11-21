import { useState } from "react";
import type { CalibrationBucket } from "../../types/nba";

// size of the drawing, the svg scales it to the container's width
const WIDTH = 560;
const HEIGHT = 320;
const PAD = { top: 16, right: 16, bottom: 40, left: 48 };
// buckets with fewer bets than this are drawn faint: their hit rate jumps around by chance
const FEW_BETS = 30;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

// reliability chart: what we said (x) against how often it hit (y), one dot per bucket
// on the dashed diagonal the chances are exactly right, below it they're too optimistic
function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {

    const [hovered, setHovered] = useState<number | null>(null);
    if (buckets.length === 0) return null;

    // x always 50-100% (the side we'd bet), y from 50% or lower if a bucket hit less than that
    const lowest = Math.min(...buckets.map((b) => b.actual));
    const yMin = Math.min(50, Math.floor((lowest * 100) / 10) * 10);
    const x = (chance: number) => PAD.left + ((chance * 100 - 50) / 50) * (WIDTH - PAD.left - PAD.right);
    const y = (chance: number) => PAD.top + (1 - (chance * 100 - yMin) / (100 - yMin)) * (HEIGHT - PAD.top - PAD.bottom);
    const xTicks = [50, 60, 70, 80, 90, 100];
    const yTicks = Array.from({ length: (100 - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);
    const line = buckets.map((b, i) => `${i === 0 ? "M" : "L"}${x(b.predicted)},${y(b.actual)}`).join(" ");
    const active = hovered === null ? null : buckets[hovered];

    return (
        <div className="relative">
            <svg
                className="w-full h-auto"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label="Estimated chance against actual hit rate, by bucket. The table below has the same numbers."
            >
                {/* grid and axes, kept quiet */}
                {yTicks.map((t) => (
                    <g key={`y${t}`}>
                        <line className="stroke-zinc-800" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t / 100)} y2={y(t / 100)} strokeWidth={1} />
                        <text className="fill-zinc-500 text-[11px]" x={PAD.left - 8} y={y(t / 100)} textAnchor="end" dominantBaseline="middle">{t}%</text>
                    </g>
                ))}
                {xTicks.map((t) => (
                    <text key={`x${t}`} className="fill-zinc-500 text-[11px]" x={x(t / 100)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle">{t}%</text>
                ))}
                <text className="fill-zinc-400 text-[11px]" x={(PAD.left + WIDTH - PAD.right) / 2} y={HEIGHT - 4} textAnchor="middle">We said</text>
                <text className="fill-zinc-400 text-[11px]" transform={`translate(12 ${(PAD.top + HEIGHT - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle">It hit</text>

                {/* perfectly calibrated: said 70%, hit 70% */}
                <line
                    className="stroke-zinc-500"
                    x1={x(0.5)} y1={y(0.5)} x2={x(1)} y2={y(1)}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                />
                <text className="fill-zinc-500 text-[11px]" x={x(0.97)} y={y(0.97) - 8} textAnchor="end">perfect</text>

                <path className="stroke-sky-400" d={line} fill="none" strokeWidth={2} strokeLinejoin="round" />
                {buckets.map((b, i) => (
                    <g key={b.from}>
                        {/* the dot with a ring in the background color, so it stands out where it meets the line */}
                        <circle
                            className={`fill-sky-400 stroke-zinc-900 ${b.count < FEW_BETS ? "opacity-40" : ""}`}
                            cx={x(b.predicted)} cy={y(b.actual)} r={hovered === i ? 6 : 4.5}
                            strokeWidth={2}
                        />
                        {/* bigger invisible target for the mouse and keyboard */}
                        <circle
                            className="fill-transparent outline-none cursor-pointer"
                            cx={x(b.predicted)} cy={y(b.actual)} r={14}
                            tabIndex={0}
                            aria-label={`Said ${pct(b.predicted)}, hit ${pct(b.actual)}, ${b.count} bets`}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}
                        />
                    </g>
                ))}
            </svg>
            {active &&
                <div
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 shadow-lg text-xs whitespace-nowrap"
                    style={{ left: `${(x(active.predicted) / WIDTH) * 100}%`, top: `calc(${(y(active.actual) / HEIGHT) * 100}% - 12px)` }}
                >
                    <p className="font-medium text-zinc-100">{Math.round(active.from * 100)}–{Math.round(active.to * 100)}% bucket</p>
                    <p className="text-zinc-300 tabular-nums">Said {pct(active.predicted)} · hit {pct(active.actual)}</p>
                    <p className="text-zinc-500 tabular-nums">{active.count.toLocaleString()} bets</p>
                </div>
            }
        </div>
    )
}

export default CalibrationChart;
