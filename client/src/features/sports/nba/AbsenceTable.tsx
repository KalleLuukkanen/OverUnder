import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { NbaTeammateSample } from "../../../types/nba";

// rows shown before 'show all', kept short so the result box doesn't get crowded
const SHOWN = 3;
// fewer games without the player than this: too few to read much into, the row is dimmed
const FEW_GAMES = 5;

export type AbsenceRow = {
    id: number;
    name: string;
    minutes: number;
    without: NbaTeammateSample;
    with: NbaTeammateSample;
};

// '+3.2' for margins (win / spread), plain for the rest
const formatAverage = (average: number | null, signed: boolean) =>
    average === null ? "–" : signed && average > 0 ? `+${average}` : String(average);

// hit rate and games of one sample, e.g. '33% 2/6', avg under it
function Sample({ sample, signed }: { sample: NbaTeammateSample, signed: boolean }) {
    if (sample.games === 0 || sample.hit_rate === null) return <span className="text-zinc-500">–</span>;
    const good = sample.hit_rate >= 50;
    return (
        <span className="flex flex-col items-end">
            <span className="tabular-nums">
                <span className={`font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}>{Math.round(sample.hit_rate)}%</span>
                <span className="ml-1.5 text-xs text-zinc-500">{sample.hits}/{sample.games}</span>
            </span>
            <span className="text-xs text-zinc-500 tabular-nums">avg {formatAverage(sample.average, signed)}</span>
        </span>
    )
}

// a bet's hit rate in games each player missed vs played, with the difference
// title = heading, column = first column's name, signed = averages are margins (+/-)
function AbsenceTable({ title, column, rows, seasons, signed = false }: {
    title: string,
    column: string,
    rows: AbsenceRow[],
    seasons: string[],
    signed?: boolean,
}) {

    const [showAll, setShowAll] = useState(false);
    if (rows.length === 0) return null;
    const shown = showAll ? rows : rows.slice(0, SHOWN);

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{title}</span>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-zinc-500">
                        <th className="py-1 text-left font-normal">{column}</th>
                        <th className="py-1 text-right font-normal">Without</th>
                        <th className="py-1 text-right font-normal">With</th>
                        <th className="py-1 text-right font-normal" title="Hit rate without minus with">Diff</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {shown.map((r) => {
                        const few = r.without.games < FEW_GAMES;
                        const diff = r.without.hit_rate !== null && r.with.hit_rate !== null ? r.without.hit_rate - r.with.hit_rate : null;
                        return (
                            <tr key={r.id} className={few ? "opacity-60" : ""} title={few ? `Only ${r.without.games} games without him` : undefined}>
                                <td className="py-1.5 pr-2">
                                    <Link className="text-zinc-200 hover:text-sky-400 hover:underline" to={`/nba/player/${r.id}`}>{r.name}</Link>
                                    <span className="ml-1.5 text-xs text-zinc-500 tabular-nums">{r.minutes} min</span>
                                </td>
                                <td className="py-1.5 pl-2 text-right"><Sample sample={r.without} signed={signed} /></td>
                                <td className="py-1.5 pl-2 text-right"><Sample sample={r.with} signed={signed} /></td>
                                <td className={`py-1.5 pl-2 text-right font-semibold tabular-nums ${diff === null ? "text-zinc-500" : diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-zinc-400"}`}>
                                    {diff === null ? "–" : `${diff > 0 ? "+" : ""}${Math.round(diff)}`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {rows.length > SHOWN &&
                <button
                    className="flex items-center gap-1 w-fit text-xs text-sky-400 hover:underline cursor-pointer"
                    type="button"
                    aria-expanded={showAll}
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? "Show fewer" : `Show all ${rows.length}`}
                    <ChevronDown size={14} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
                </button>
            }
            {/* the explanation only with the full list, to keep the box short */}
            {showAll &&
                <p className="text-xs text-zinc-500">
                    {seasons.join(" and ")}, games for the current team. Rotation players (15+ min) only, most minutes first.
                </p>
            }
        </div>
    )
}

export default AbsenceTable;
