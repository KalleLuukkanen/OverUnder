import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlayersCareerHighs } from "../../../api/nba/nbaPlayersApi";
import type { NbaCareerHigh, NbaCareerHighs, NbaPlayer } from "../../../types/nba";

type SeasonType = "regular" | "playoffs";

// the stats' names on the tiles
const STAT_LABELS: Record<NbaCareerHigh["stat"], string> = {
    pts: "Points",
    reb: "Rebounds",
    ast: "Assists",
    stl: "Steals",
    blk: "Blocks",
    fg3m: "3-pointers made",
    fgm: "Field goals made",
    ftm: "Free throws made",
};

// first season with box scores, older games aren't in the highs
const FIRST_BOX_SCORE_YEAR = 1996;

// one stat's high: the number, the game it came in (links to it) and how many games reached it
function HighTile({ high }: { high: NbaCareerHigh }) {
    return (
        <Link
            className="group flex flex-col gap-0.5 p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-sky-500"
            to={`/nba/game/${high.game.id}`}
        >
            <span className="text-xs uppercase tracking-wide text-zinc-500">{STAT_LABELS[high.stat]}</span>
            <span className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums group-hover:text-sky-400">{high.value}</span>
                {high.times > 1 && <span className="text-xs text-zinc-500" title={`Reached in ${high.times} games, the first one shown`}>×{high.times}</span>}
            </span>
            <span className="text-xs text-zinc-400">
                {high.game.is_home ? "vs" : "@"} {high.game.opponent} · {new Date(high.game.game_date).toLocaleDateString("fi-FI")}
            </span>
        </Link>
    )
}

// player's best game in each stat, regular season or playoffs
function PlayerCareerHighs({ player }: { player: NbaPlayer }) {

    const [highs, setHighs] = useState<NbaCareerHighs | null>(null);
    const [seasonType, setSeasonType] = useState<SeasonType>("regular");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getPlayersCareerHighs(player.id);
                if (!cancelled) setHighs(result);
            } catch {
                if (!cancelled) setHighs(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player.id]);

    if (loading) return <p className="text-zinc-400">Loading career highs...</p>
    if (!highs || highs.regular.length + highs.playoffs.length === 0) return <p className="text-zinc-500">No games to show career highs from</p>

    const shown = highs[seasonType];
    // a career that started before the box scores: the highs only cover the games since
    const partial = player.from_year !== null && player.from_year < FIRST_BOX_SCORE_YEAR;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex w-fit p-1 gap-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                {(["regular", "playoffs"] as SeasonType[]).map((type) => (
                    <button
                        key={type}
                        className={`px-3 py-1 rounded-md text-sm cursor-pointer ${seasonType === type ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        type="button"
                        aria-pressed={seasonType === type}
                        onClick={() => setSeasonType(type)}
                    >
                        {type === "regular" ? "Regular season" : "Playoffs"}
                    </button>
                ))}
            </div>
            {shown.length === 0 ?
                <p className="text-zinc-500">No {seasonType === "regular" ? "regular season" : "playoff"} games</p> :
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {shown.map((h) => <HighTile key={h.stat} high={h} />)}
                </div>
            }
            {partial && <p className="text-xs text-zinc-500">Box scores go back to the 1996-97 season, so earlier games aren't counted.</p>}
        </div>
    )
}

export default PlayerCareerHighs;
