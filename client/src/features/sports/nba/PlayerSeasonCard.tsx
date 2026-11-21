import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlayerSeason } from "../../../api/nba/nbaSeasonApi";
import type { NbaLeaderStat, NbaPlayerSeasonRanks, NbaStatRank } from "../../../types/nba";

// ranked stats: the same ones as the league leaders
const RANKED: { stat: NbaLeaderStat, label: string }[] = [
    { stat: "pts", label: "Points" },
    { stat: "reb", label: "Rebounds" },
    { stat: "ast", label: "Assists" },
    { stat: "stl", label: "Steals" },
    { stat: "blk", label: "Blocks" },
    { stat: "fg3m", label: "Threes made" },
];

// how many from the top make the leaders list, they get a highlighted rank
const LEADER_LIST = 10;

// rank chip: #1 amber, the rest of the top 10 sky, others muted
function RankChip({ rank, suffix = "" }: { rank: number, suffix?: string }) {
    const style = rank === 1 ? "bg-amber-500/15 text-amber-400" : rank <= LEADER_LIST ? "bg-sky-500/15 text-sky-400" : "bg-zinc-800 text-zinc-400";
    return <span className={`px-1.5 rounded text-xs font-semibold tabular-nums ${style}`}>#{rank}{suffix}</span>;
}

// one ranked stat: name, average, the rank in the league and among rookies for a rookie
function RankedRow({ label, value, rank }: { label: string, value: number, rank: NbaStatRank }) {
    return (
        <li className="flex items-center gap-2 py-1">
            <span className="text-zinc-400">{label}</span>
            <span className="ml-auto flex items-center gap-1.5">
                {rank.rookie_rank !== null && <RankChip rank={rank.rookie_rank} suffix=" rookies" />}
                {rank.rank !== null && <RankChip rank={rank.rank} />}
                <span className="w-10 text-right font-semibold tabular-nums">{value.toFixed(1)}</span>
            </span>
        </li>
    )
}

// percentage with one decimal, '-' without attempts
const pct = (value: number | null) => value === null ? "-" : `${value.toFixed(1)}%`;

// player's current regular season: per game averages and where they rank in the league leaders
// left out for players without games this season
function PlayerSeasonCard({ player_id }: { player_id: number }) {

    const [data, setData] = useState<NbaPlayerSeasonRanks | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getPlayerSeason(player_id);
                if (!cancelled) setData(result);
            } catch {
                // 404 = no games this season, the card is just not shown
                if (!cancelled) setData(null);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id]);

    if (!data) return null;

    const avg = data.averages;
    const leaderOf = RANKED.filter(({ stat }) => (data.ranks[stat].rank ?? Infinity) <= LEADER_LIST).length;

    return (
        <section className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold">{data.season} season</h2>
                <span className="text-sm text-zinc-500">
                    {avg.games} games{avg.minutes !== null && ` · ${avg.minutes.toFixed(1)} min`}{data.rookie && " · Rookie"}
                </span>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-800 text-sm">
                {RANKED.map(({ stat, label }) => <RankedRow key={stat} label={label} value={avg[stat]} rank={data.ranks[stat]} />)}
                <li className="flex justify-between py-1"><span className="text-zinc-400">Turnovers</span><span className="font-semibold tabular-nums">{avg.tov.toFixed(1)}</span></li>
                <li className="flex justify-between py-1"><span className="text-zinc-400">FG%</span><span className="font-semibold tabular-nums">{pct(avg.fg_pct)}</span></li>
                <li className="flex justify-between py-1"><span className="text-zinc-400">3P%</span><span className="font-semibold tabular-nums">{pct(avg.fg3_pct)}</span></li>
                <li className="flex justify-between py-1"><span className="text-zinc-400">FT%</span><span className="font-semibold tabular-nums">{pct(avg.ft_pct)}</span></li>
            </ul>
            <p className="text-xs text-zinc-500">
                {data.qualifies ?
                    <>
                        {leaderOf > 0 ? `Top ${LEADER_LIST} in ${leaderOf} ${leaderOf === 1 ? "stat" : "stats"}. ` : ""}
                        Ranked among {data.qualified_players} players{data.rookie && " and among rookies"}.{" "}
                    </> :
                    `Needs ${data.min_games} games to be ranked. `
                }
                Regular season.{" "}
                <Link className="text-sky-400 hover:underline" to="/nba?view=stats">League leaders</Link>
            </p>
        </section>
    )
}

export default PlayerSeasonCard;
