import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PlayerRecentGames from "../features/sports/nba/PlayerRecentGames";
import { getOne } from "../api/nba/nbaPlayersApi";
import { useState, useEffect } from "react";
import type { NbaPlayer } from "../types/nba";
import { ApiError } from "../api/apiClient";
import PlayerCareer from "../features/sports/nba/PlayerCareer";
import PlayerInfo from "../features/sports/nba/PlayerInfo";

function NBAPlayer() {

    const { playerId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // back to the previous page, or to the NBA page if the player page was opened directly
    const goBack = () => {
        if (location.key === "default") {
            navigate("/nba");
        } else {
            navigate(-1);
        }
    };
    const [player, setPlayer] = useState<NbaPlayer | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const player = await getOne(Number(playerId));
                if (!cancelled) {
                    setPlayer(player);
                }
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    setErrorMessage(err.message);
                } else {
                    alert("Something went wrong, please try again")
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [playerId]);

    if (loading) return <p className="text-3xl">Loading player...</p>
    if (errorMessage) return <p className="text-3xl">{errorMessage}</p>

    if (player) {
        return (
            <div className="flex flex-col space-y-2 bg-white p-2 rounded">
                <span className="flex items-center gap-3">
                    <button
                        className="cursor-pointer rounded hover:bg-gray-200 p-1"
                        type="button"
                        aria-label="Go back"
                        onClick={goBack}
                    >
                        <ArrowLeft size={28} />
                    </button>
                    <p className="text-4xl font-bold">{player.name}</p>
                    <span className="border min-h-8" />
                    <p className="text-2xl font-semibold">{player.team}</p>
                </span>
                <span className="border" />
                <div className="flex flex-col xl:flex-row gap-4 mt-2">
                    <div className="flex flex-col space-y-3 min-w-0">
                        <div>
                            <span className="text-2xl font-semibold">Latest games:</span>
                        </div>
                        <PlayerRecentGames player_id={player.id} />
                        <div>
                            <span className="text-2xl font-semibold">Career averages:</span>
                        </div>
                        <PlayerCareer player_id={player.id} />
                    </div>
                    <PlayerInfo player={player} />
                </div>
            </div>
        )
    }

}

export default NBAPlayer;
