import { useParams } from "react-router-dom";
import { getOne } from "../api/nba/nbaGamesApi";
import { useState, useEffect } from "react";
import type { NbaGame } from "../types/nba";
import { ApiError } from "../api/apiClient";
import Loading from "../components/Loading";
import NBAGameTeam from "../features/sports/nba/NBAGameTeam";
import HitRate from "../features/sports/nba/HitRate";
import GamePlayed from "../features/sports/nba/GamePlayed";
import { isPlayed } from "../utils/nbaGame";
import BackButton from "../components/BackButton";

function NBAGame() {

    const { gameId } = useParams();

    const [loading, setLoading] = useState(true);

    const [game, setGame] = useState<NbaGame | null>(null);

    useEffect(() => {
        let cancelled = false;
        // another game opened from this page (last games cards): reset before loading
        setLoading(true);
        setGame(null);
        const load = async () => {
            try {
                const game = await getOne(gameId as string);
                if (!cancelled) setGame(game);
            } catch (err) {
                if (!cancelled) {
                    if (err instanceof ApiError && err.status === 404) {
                        alert("Game data not found");
                    } else {
                        alert("Something went wrong, please try again");
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [gameId]);

    if (loading) return <Loading />;
    if (!game) return;

    // upcoming view only for games not played yet, finished games without stats are handled in GamePlayed
    if (!isPlayed(game)) {
        return (
            <div key={game.id} className="flex flex-col bg-gray-300 p-2 rounded">
                <span className="flex items-center gap-3">
                    <BackButton />
                    <span className="text-3xl font-bold">{game.away_team} @ {game.home_team} - {new Date(game.game_date).toLocaleDateString("fi-FI")}</span>
                </span>
                <div className="grid grid-cols-2 gap-4">
                    <NBAGameTeam team_id={game.away_team_id} opp_team_id={game.home_team_id} opp_team={game.home_team} />
                    <NBAGameTeam team_id={game.home_team_id} opp_team_id={game.away_team_id} opp_team={game.away_team} />
                    <HitRate team1_id={game.home_team_id} team2_id={game.away_team_id} />
                </div>
            </div>
        )
    } else {
        return (
            <div key={game.id} className="flex flex-col bg-gray-300 p-2 rounded">
                <BackButton />
                <GamePlayed game={game} />
            </div>
        )
    }

}

export default NBAGame;