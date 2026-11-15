import { type NbaBoxScore, type NbaRosterPlayer } from "../../../types/nba";
import { getPlayersLastGames, getPlayersLastGamesVsOpponent } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";

// one game's stat line, e.g. "Minutes: 34, Pts: 28, Ast: 5, Reb: 7, On 12.11.2026"
function StatLine({ game }: { game: NbaBoxScore }) {
    return (
        <p>
            Minutes: {game.minutes}, Pts: {game.pts}, Ast: {game.ast}, Reb: {game.reb},
            On {new Date(game.game_date).toLocaleDateString("fi-FI")}
        </p>
    );
}

function NBAPlayerBrief({ player, opp_team_id, opp_team }: { player: NbaRosterPlayer, opp_team_id: number, opp_team: string }) {

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [lastPerformance, setLastPerformance] = useState<NbaBoxScore | null>(null);
    const [lastPerformanceVS, setLastPerformanceVS] = useState<NbaBoxScore | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // endpoints return [] when player has no games, so [0] can be undefined
                const [last, lastVS] = await Promise.all([
                    getPlayersLastGames(player.id, 1),
                    getPlayersLastGamesVsOpponent(player.id, opp_team_id, 1),
                ]);
                if (!cancelled) {
                    setLastPerformance(last[0] ?? null);
                    setLastPerformanceVS(lastVS[0] ?? null);
                }
            } catch {
                if (!cancelled) setErrorMessage("Couldn't load player's games, please try again");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player.id, opp_team_id]);

    return (
        <div className="flex flex-col space-y-2">
            <p className="font-bold">Games played: {player.games}</p>
            <div className="flex space-x-2">
                <p className="font-bold">Season averages:</p>
                {player.games > 0 ?
                    <p>MPG: {player.minutes}, PPG: {player.pts}, APG: {player.ast}, RPG: {player.reb}</p> :
                    <p className="text-gray-500">No games this season</p>
                }
            </div>

            {loading ? <p className="text-gray-500">Loading games...</p> :
                errorMessage ? <p className="text-red-600">{errorMessage}</p> :
                    <>
                        <div className="flex space-x-2">
                            <p className="font-bold">Last performance:</p>
                            {lastPerformance ?
                                <StatLine game={lastPerformance} /> :
                                <p className="text-gray-500">No games found</p>
                            }
                        </div>
                        <div className="flex space-x-2">
                            <p className="font-bold">Last performance against {opp_team}:</p>
                            {lastPerformanceVS ?
                                <StatLine game={lastPerformanceVS} /> :
                                <p className="text-gray-500">No games against {opp_team} found</p>
                            }
                        </div>
                    </>
            }
            <p className="font-bold hover:text-blue-500 hover:underline mt-4">See more stats</p>
        </div>
    )
}

export default NBAPlayerBrief;
