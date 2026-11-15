import type { NbaGame } from "../../../types/nba";

// team_id is optional: when given, the card also shows that team's W/L
function NBAGameCard({ game, team_id }: { game: NbaGame, team_id?: number }) {

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
            <div className="flex flex-col shadow rounded bg-gray-300 p-2 space-y-2 w-64">
                <p>{game.away_team} @ {game.home_team} </p>
                <p>{new Date(game.game_date).toLocaleDateString("fi-FI")}</p>
                <a className="ml-auto mt-2 text-blue-500 hover:underline text-lg" href={`/nba/${game.id}`}>See more</a>
            </div>
        )
    } else {
        return (
            <div className="flex flex-col shadow rounded bg-white p-2 space-y-1 w-64">
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
                <p>{new Date(game.game_date).toLocaleDateString("fi-FI")}</p>
                <a className="ml-auto mt-2 text-blue-500 hover:underline text-lg" href={`/nba/${game.id}`}>See more</a>
            </div>
        )
    }

}

export default NBAGameCard;