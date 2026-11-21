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

type Group = "all" | "rookies";

// current season's league leaders: a top 10 card per stat, per game averages
// a toggle shows the rookies' own leaders
function NBALeaders() {

    const [group, setGroup] = useState<Group>("all");

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

    const shown = group === "all" ? data.leaders : data.rookies;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex w-fit p-1 gap-1 bg-zinc-950 border border-zinc-800 rounded-lg" role="group" aria-label="Players">
                {(["all", "rookies"] as Group[]).map((g) => (
                    <button
                        key={g}
                        className={`px-3 py-1 rounded-md text-sm cursor-pointer ${group === g ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        type="button"
                        aria-pressed={group === g}
                        onClick={() => setGroup(g)}
                    >
                        {g === "all" ? "All players" : "Rookies"}
                    </button>
                ))}
            </div>
            {shown.pts.length === 0 ?
                <p className="text-zinc-500">No rookie has played enough games yet</p> :
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {STAT_TITLES.map(({ stat, title }) => (
                        <div key={stat} className="flex flex-col gap-2 p-3 bg-zinc-950/40 border border-zinc-800 rounded-lg">
                            <h3 className="text-sm font-semibold text-zinc-300">
                                {title} <span className="font-normal text-zinc-500">per game</span>
                            </h3>
                            <ol className="flex flex-col text-sm">
                                {shown[stat].map((p, i) => (
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
            }
            <p className="text-xs text-zinc-500">Regular season.{group === "rookies" && " Rookies are players in their first NBA season."} Players need at least {data.min_games} games to be listed.</p>
        </div>
    )
}

export default NBALeaders;
