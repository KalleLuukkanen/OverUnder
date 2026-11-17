import { getPlayersLastGames } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { NbaBoxScore } from "../../../types/nba";
import table from "../../../styles/table";
import { overtimeLabel } from "../../../utils/nbaGame";

// "made-attempted" shooting format, e.g. 8-15
const shooting = (made: number, attempted: number) => `${made}-${attempted}`;

// player's latest stat lines, the game cell links to the game's page
function PlayerRecentGames({ player_id, limit = 5 }: { player_id: number, limit?: number }) {

    const [games, setGames] = useState<NbaBoxScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const result = await getPlayersLastGames(player_id, limit);
                if (!cancelled) setGames(result);
            } catch {
                if (!cancelled) setGames([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id, limit]);

    if (loading) return <p className="text-zinc-400">Loading latest games...</p>
    if (games.length === 0) return <p className="text-zinc-500">No recent games</p>

    return (
        <div className={table.wrapper}>
            <table className={table.table}>
                <thead>
                    <tr className={table.headRow}>
                        <th className={`${table.th} text-left`}>Date</th>
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
                    {games.map((g) => (
                        <tr key={g.game_id} className={table.row}>
                            <td className={`${table.td} text-left text-zinc-400`}>{new Date(g.game_date).toLocaleDateString("fi-FI")}</td>
                            <td className={`${table.td} text-left`}>
                                <Link className={table.link} to={`/nba/game/${g.game_id}`}>
                                    {g.is_home ? "vs" : "@"} {g.opponent}
                                </Link>
                                {overtimeLabel(g.overtime_periods) &&
                                    <span className="ml-2 px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400">{overtimeLabel(g.overtime_periods)}</span>
                                }
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
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default PlayerRecentGames;
