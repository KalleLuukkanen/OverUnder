import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlayersGames } from "../../../api/nba/nbaPlayerGamesApi";
import type { NbaBoxScore } from "../../../types/nba";
import table from "../../../styles/table";
import { isPostseason, gameTypeTag, overtimeLabel } from "../../../utils/nbaGame";

type Stat = "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fgm" | "fga" | "fg3m" | "fg3a" | "ftm" | "fta" | "minutes";

// "made-attempted" shooting format, e.g. 8-15
const shooting = (made: number, attempted: number) => `${made}-${attempted}`;

// one part of the season (regular season or playoffs): a stat line per game and averages at the bottom
// the team column is only shown when the player played for more than one team (traded mid-season)
function StatLines({ title, games }: { title: string, games: NbaBoxScore[] }) {

    const showTeam = new Set(games.map((g) => g.team)).size > 1;

    // per game average of a stat, one decimal
    const avg = (key: Stat) => (games.reduce((sum, g) => sum + g[key], 0) / games.length).toFixed(1);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">
                {title}
                <span className="ml-2 text-sm font-normal text-zinc-400">{games.length} {games.length === 1 ? "game" : "games"}</span>
            </h3>
            <div className={table.wrapper}>
                <table className={table.table}>
                    <thead>
                        <tr className={table.headRow}>
                            <th className={`${table.th} text-left`}>Date</th>
                            {showTeam && <th className={`${table.th} text-left`}>Team</th>}
                            <th className={`${table.th} text-left`}>Game</th>
                            <th className={table.th}>MIN</th>
                            <th className={table.th}>PTS</th>
                            <th className={table.th}>REB</th>
                            <th className={table.th}>AST</th>
                            <th className={table.th}>STL</th>
                            <th className={table.th}>BLK</th>
                            <th className={table.th}>TOV</th>
                            <th className={table.th}>FG</th>
                            <th className={table.th}>3PT</th>
                            <th className={table.th}>FT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((g) => {
                            const tag = gameTypeTag(g.game_id);
                            return (
                                <tr key={g.game_id} className={table.row}>
                                    <td className={`${table.td} text-left text-zinc-400`}>{new Date(g.game_date).toLocaleDateString("fi-FI")}</td>
                                    {showTeam && <td className={`${table.td} text-left text-zinc-400`}>{g.team}</td>}
                                    <td className={`${table.td} text-left`}>
                                        <Link className={table.link} to={`/nba/game/${g.game_id}`}>
                                            {g.is_home ? "vs" : "@"} {g.opponent}
                                        </Link>
                                        {overtimeLabel(g.overtime_periods) &&
                                            <span className="ml-2 px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400">{overtimeLabel(g.overtime_periods)}</span>
                                        }
                                        {tag && <span className="ml-2 px-1.5 rounded text-xs bg-zinc-800 text-zinc-400">{tag}</span>}
                                    </td>
                                    <td className={`${table.td} text-zinc-400`}>{Math.round(g.minutes)}</td>
                                    <td className={`${table.td} font-semibold`}>{g.pts}</td>
                                    <td className={table.td}>{g.reb}</td>
                                    <td className={table.td}>{g.ast}</td>
                                    <td className={table.td}>{g.stl}</td>
                                    <td className={table.td}>{g.blk}</td>
                                    <td className={table.td}>{g.tov}</td>
                                    <td className={table.td}>{shooting(g.fgm, g.fga)}</td>
                                    <td className={table.td}>{shooting(g.fg3m, g.fg3a)}</td>
                                    <td className={table.td}>{shooting(g.ftm, g.fta)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className={table.footRow}>
                            <td className={`${table.td} text-left`} colSpan={showTeam ? 3 : 2}>Average</td>
                            <td className={table.td}>{avg("minutes")}</td>
                            <td className={table.td}>{avg("pts")}</td>
                            <td className={table.td}>{avg("reb")}</td>
                            <td className={table.td}>{avg("ast")}</td>
                            <td className={table.td}>{avg("stl")}</td>
                            <td className={table.td}>{avg("blk")}</td>
                            <td className={table.td}>{avg("tov")}</td>
                            <td className={table.td}>{shooting(Number(avg("fgm")), Number(avg("fga")))}</td>
                            <td className={table.td}>{shooting(Number(avg("fg3m")), Number(avg("fg3a")))}</td>
                            <td className={table.td}>{shooting(Number(avg("ftm")), Number(avg("fta")))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

// player's every game of a season in date order, regular season first and the playoffs below it
function PlayerSeasonGames({ player_id, season }: { player_id: number, season: string }) {

    const [games, setGames] = useState<NbaBoxScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = async () => {
            try {
                const result = await getPlayersGames(player_id, season);
                // the api gives latest first, a season reads better from the first game on
                if (!cancelled) setGames([...result].reverse());
            } catch {
                if (!cancelled) setGames([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id, season]);

    if (loading) return <p className="text-zinc-400">Loading games...</p>;
    if (games.length === 0) return <p className="text-zinc-500">No games played this season</p>;

    const regular = games.filter((g) => !isPostseason(g.game_id));
    const playoffs = games.filter((g) => isPostseason(g.game_id));

    return (
        <div className="flex flex-col gap-4">
            {regular.length > 0 && <StatLines title="Regular season" games={regular} />}
            {playoffs.length > 0 && <StatLines title="Playoffs" games={playoffs} />}
        </div>
    )
}

export default PlayerSeasonGames;
