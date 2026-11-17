import { useParams } from "react-router-dom";
import { getOne } from "../api/nba/nbaPlayersApi";
import { useState, useEffect } from "react";
import type { NbaPlayer } from "../types/nba";
import { ApiError } from "../api/apiClient";

function NBAPlayer() {

    const { playerId } = useParams();
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
                    <p className="text-4xl font-bold">{player.name}</p>
                    <span className="border min-h-8" />
                    <p className="text-2xl">{player.team}</p>
                </span>
                <span className="border" />
                <div>

                </div>
            </div>
        )
    }

}

export default NBAPlayer;
