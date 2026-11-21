import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeaders } from "../../../api/nba/nbaSeasonApi";
import type { NbaLeaders, NbaLeaderStat } from "../../../types/nba";

const STAT_TITLES: { stat: NbaLeaderStat, title: string }[] = [
    { stat: "pts", title: "Points" },
    { stat: "reb", title: "Rebounds" },
    { stat: "ast", title: "Assists" },
    { stat: "stl", title: "Steals" },
    { stat: "blk", title: "Blocks" },
    { stat: "fg3m", title: "Threes made" },
];

// current season's league leaders: a top 10 card per stat, per game averages
function NBALeaders() {

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<NbaLeaders | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getLeaders();
                if (!cancelled) setData(result);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    if (loading) return <p className="text-zinc-400">Loading stats...</p>;
    if (error || !data) return <p className="text-rose-400">Couldn't load the stats, please try again</p>;
    if (data.leaders.pts.length === 0) return <p className="text-zinc-500">No games played yet this season</p>;

    return (
        <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STAT_TITLES.map(({ stat, title }) => (
                    <div key={stat} className="flex flex-col gap-2 p-3 bg-zinc-950/40 border border-zinc-800 rounded-lg">
                        <h3 className="text-sm font-semibold text-zinc-300">
                            {title} <span className="font-normal text-zinc-500">per game</span>
                        </h3>
                        <ol className="flex flex-col text-sm">
                            {data.leaders[stat].map((p, i) => (
                                <li key={p.player_id} className="flex items-baseline gap-2 py-0.5">
                                    <span className="w-5 shrink-0 text-zinc-500 tabular-nums">{i + 1}</span>
                                    <Link className="truncate text-zinc-100 hover:text-sky-400 hover:underline" to={`/nba/player/${p.player_id}`}>{p.name}</Link>
                                    <Link className="text-xs text-zinc-500 hover:text-sky-400" to={`/nba/team/${p.team_id}`}>{p.team}</Link>
                                    <span className={`ml-auto tabular-nums ${i === 0 ? "font-semibold text-sky-400" : "text-zinc-200"}`}>{p.value.toFixed(1)}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                ))}
            </div>
            <p className="text-xs text-zinc-500">Regular season. Players need at least {data.min_games} games to be listed.</p>
        </div>
    )
}

export default NBALeaders;
