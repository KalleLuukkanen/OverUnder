import type { NbaGame } from "../../../types/nba";
import { Link } from "react-router-dom";
import { isScoreMissing, gameDateTime } from "../../../utils/nbaGame";

// team_id is optional: when given, the card also shows that team's W/L
// bg is the card's background class, grey by default
function NBAGameCard({ game, team_id, bg = "bg-gray-300" }: { game: NbaGame, team_id?: number, bg?: string }) {

    const scoreMissing = isScoreMissing(game);

    const team_result = () => {
        if (team_id === undefined || game.home_score === null || game.away_score === null) return "";
        switch (team_id) {
            case game.away_team_id:
                if (game.away_score > game.home_score) {
                    return "W";
                } else {
                    return "L";
                }
            case game.home_team_id:
                if (game.away_score > game.home_score) {
                    return "L";
                } else {
                    return "W";
                }
            default:
                return "";
        }
    };


    if (game.home_score === null || game.away_score === null) {
        return (
            <div className={`flex flex-col shadow rounded ${bg} p-2 space-y-2 w-64`}>
                <p>{game.away_team} @ {game.home_team} </p>
                {scoreMissing && <p className="text-gray-600">Score not available yet</p>}
                <p>{gameDateTime(game)}</p>
                <Link className="ml-auto mt-2 text-blue-500 hover:underline text-lg" to={`/nba/game/${game.id}`}>See more</Link>
            </div>
        )
    } else {
        return (
            <div className={`flex flex-col shadow rounded ${bg} p-2 space-y-1 w-64`}>
                <div className="flex">
                    {game.home_score > game.away_score ?
                        <span className="flex space-x-1">
                            <p className="text-red-500">L</p>
                            <p>{game.away_team} @ {game.home_team}</p>
                            <p className="text-green-500">W</p>
                        </span> :
                        <span className="flex space-x-1">
                            <p className="text-green-500">W</p>
                            <p>{game.away_team} @ {game.home_team}</p>
                            <p className="text-red-500">L</p>
                        </span>
                    }
                    <p className={`ml-auto ${team_result() === "W" ? "text-green-500" : "text-red-500"}`}>{team_result()}</p>
                </div>
                <p>{game.away_score} - {game.home_score}</p>
                <p>{gameDateTime(game)}</p>
                <Link className="ml-auto mt-2 text-blue-500 hover:underline text-lg" to={`/nba/game/${game.id}`}>See more</Link>
            </div>
        )
    }

}

export default NBAGameCard;