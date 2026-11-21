import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTeammateSplits } from "../../../api/nba/nbaPlayerGamesApi";
import type { NbaHitRate, NbaTeammateSample, NbaTeammateSplits } from "../../../types/nba";

// rows shown before 'show all'
const SHOWN = 5;
// fewer games without the teammate than this: too few to read much into, the row is dimmed
const FEW_GAMES = 5;

// hit rate and games of one sample, e.g. '33% 2/6', avg under it
function Sample({ sample }: { sample: NbaTeammateSample }) {
    if (sample.games === 0 || sample.hit_rate === null) return <span className="text-zinc-500">–</span>;
    const good = sample.hit_rate >= 50;
    return (
        <span className="flex flex-col items-end">
            <span className="tabular-nums">
                <span className={`font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}>{Math.round(sample.hit_rate)}%</span>
                <span className="ml-1.5 text-xs text-zinc-500">{sample.hits}/{sample.games}</span>
            </span>
            <span className="text-xs text-zinc-500 tabular-nums">avg {sample.average}</span>
        </span>
    )
}

// the checked prop in games each current teammate missed vs played (this season and last, current team)
// a big difference hints the prop depends on that teammate playing, e.g. more shots when the star sits
// uses the result's stat, line and side (what was checked), not the form's current values
function TeammateSplits({ player_id, result }: { player_id: number, result: NbaHitRate }) {

    // the splits with the bet they were loaded for: a new bet is loading until its own arrive
    const key = `${player_id}-${result.stat}-${result.line}-${result.side}`;
    const [loaded, setLoaded] = useState<{ key: string, data: NbaTeammateSplits | null } | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getTeammateSplits(player_id, { stat: result.stat, line: result.line, side: result.side });
                if (!cancelled) setLoaded({ key, data: res });
            } catch {
                if (!cancelled) setLoaded({ key, data: null });
            }
        };
        load();
        return () => { cancelled = true };
    }, [key, player_id, result.stat, result.line, result.side]);

    const data = loaded?.data ?? null;
    if (loaded?.key !== key) return <p className="text-sm text-zinc-500">Loading teammate splits...</p>;
    if (!data || data.teammates.length === 0) return null;

    const rows = showAll ? data.teammates : data.teammates.slice(0, SHOWN);

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">When a teammate sits</span>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-zinc-500">
                        <th className="py-1 text-left font-normal">Teammate</th>
                        <th className="py-1 text-right font-normal">Without</th>
                        <th className="py-1 text-right font-normal">With</th>
                        <th className="py-1 text-right font-normal" title="Hit rate without minus with">Diff</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {rows.map((t) => {
                        const few = t.without.games < FEW_GAMES;
                        const diff = t.without.hit_rate !== null && t.with.hit_rate !== null ? t.without.hit_rate - t.with.hit_rate : null;
                        return (
                            <tr key={t.id} className={few ? "opacity-60" : ""} title={few ? `Only ${t.without.games} games without him` : undefined}>
                                <td className="py-1.5 pr-2">
                                    <Link className="text-zinc-200 hover:text-sky-400 hover:underline" to={`/nba/player/${t.id}`}>{t.name}</Link>
                                    <span className="ml-1.5 text-xs text-zinc-500 tabular-nums">{t.minutes} min</span>
                                </td>
                                <td className="py-1.5 pl-2 text-right"><Sample sample={t.without} /></td>
                                <td className="py-1.5 pl-2 text-right"><Sample sample={t.with} /></td>
                                <td className={`py-1.5 pl-2 text-right font-semibold tabular-nums ${diff === null ? "text-zinc-500" : diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-zinc-400"}`}>
                                    {diff === null ? "–" : `${diff > 0 ? "+" : ""}${Math.round(diff)}`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {data.teammates.length > SHOWN &&
                <button className="w-fit text-xs text-sky-400 hover:underline cursor-pointer" type="button" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "Show fewer" : `Show all ${data.teammates.length}`}
                </button>
            }
            <p className="text-xs text-zinc-500">
                {data.seasons.join(" and ")}, games for his current team. Rotation players (15+ min) only, most minutes first.
            </p>
        </div>
    )
}

export default TeammateSplits;
