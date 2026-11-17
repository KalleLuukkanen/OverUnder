import { getPlayersLastGames } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { NbaBoxScore } from "../../../types/nba";

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

    if (loading) return <p>Loading latest games...</p>
    if (games.length === 0) return <p className="text-gray-500">No recent games</p>

    return (
        <div className="overflow-x-auto">
            <table className="text-right bg-white rounded shadow">
                <thead>
                    <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Game</th>
                        <th className="p-2">MIN</th>
                        <th className="p-2">PTS</th>
                        <th className="p-2">REB</th>
                        <th className="p-2">AST</th>
                        <th className="p-2">STL</th>
                        <th className="p-2">BLK</th>
                        <th className="p-2">TOV</th>
                        <th className="p-2">FG</th>
                        <th className="p-2">3PT</th>
                        <th className="p-2">FT</th>
                    </tr>
                </thead>
                <tbody>
                    {games.map((g) => (
                        <tr key={g.game_id} className="border-b">
                            <td className="text-left p-2 whitespace-nowrap">{new Date(g.game_date).toLocaleDateString("fi-FI")}</td>
                            <td className="text-left p-2 whitespace-nowrap">
                                <Link className="text-blue-500 hover:underline" to={`/nba/game/${g.game_id}`}>
                                    {g.is_home ? "vs" : "@"} {g.opponent}
                                </Link>
                            </td>
                            <td className="p-2">{Math.round(g.minutes)}</td>
                            <td className="p-2 font-semibold">{g.pts}</td>
                            <td className="p-2">{g.reb}</td>
                            <td className="p-2">{g.ast}</td>
                            <td className="p-2">{g.stl}</td>
                            <td className="p-2">{g.blk}</td>
                            <td className="p-2">{g.tov}</td>
                            <td className="p-2">{shooting(g.fgm, g.fga)}</td>
                            <td className="p-2">{shooting(g.fg3m, g.fg3a)}</td>
                            <td className="p-2">{shooting(g.ftm, g.fta)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default PlayerRecentGames;
