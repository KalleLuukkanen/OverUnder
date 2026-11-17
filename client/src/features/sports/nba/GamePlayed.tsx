import { type NbaBoxScore, type NbaGame } from "../../../types/nba";
import { getGameBoxScore } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";
import BoxScore from "./BoxScore";
import { gameDateTime } from "../../../utils/nbaGame";

function GamePlayed({ game }: { game: NbaGame }) {

    const [statsAvailable, setStatsAvailable] = useState<boolean | null>(null);
    const [boxScore, setBoxScore] = useState<NbaBoxScore[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const boxScore = await getGameBoxScore(game.id);
                if (!cancelled) {
                    setBoxScore(boxScore);
                    // use the local value here, the boxScore state isn't updated yet
                    setStatsAvailable(boxScore.length > 0);
                }
            } catch {
                if (!cancelled) setStatsAvailable(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [game]);


    // null = still loading
    if (statsAvailable === null) return <p className="text-2xl p-4">Loading stats...</p>;

    if (!statsAvailable || game.home_score === null || game.away_score === null || !boxScore) {
        return (
            <div className="flex flex-col space-y-2 p-4">
                <span className="text-3xl font-bold">{game.away_team} @ {game.home_team} - {gameDateTime(game)}</span>
                <p className="text-2xl">Stats not yet available for this game</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex flex-col space-y-3">
                <span
                    className="text-4xl flex gap-4"
                >
                    {game.away_team_name}: {game.away_score} {game.away_score > game.home_score ? <p className="text-green-500">W</p> : <p className="text-red-500">L</p>}
                </span>
                <span
                    className="text-4xl flex gap-4"
                >
                    @ {game.home_team_name}: {game.home_score} {game.home_score > game.away_score ? <p className="text-green-500">W</p> : <p className="text-red-500">L</p>}
                </span>
            </div>
            <span className="border mt-3" />
            <div className="flex flex-col space-y-3">
                <span className="text-4xl mt-4">Box score:</span>
                <BoxScore
                    boxScore={boxScore}
                    away_team={game.away_team_name}
                    away_team_id={game.away_team_id}
                    home_team={game.home_team_name}
                    home_team_id={game.home_team_id}
                />
            </div>
        </div>
    )
}

export default GamePlayed;