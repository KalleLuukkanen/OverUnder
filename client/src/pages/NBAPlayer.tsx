import { useParams, Link } from "react-router-dom";
import BackButton from "../components/BackButton";
import Loading from "../components/Loading";
import PlayerRecentGames from "../features/sports/nba/PlayerRecentGames";
import { getOne } from "../api/nba/nbaPlayersApi";
import { useState, useEffect } from "react";
import type { NbaPlayer } from "../types/nba";
import { ApiError } from "../api/apiClient";
import PlayerCareer from "../features/sports/nba/PlayerCareer";
import PlayerCareerHighs from "../features/sports/nba/PlayerCareerHighs";
import PlayerInfo from "../features/sports/nba/PlayerInfo";

function NBAPlayer() {

    const { playerId } = useParams();
    const [player, setPlayer] = useState<NbaPlayer | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        // another player opened from this page (search): reset before loading
        setLoading(true);
        setErrorMessage("");
        setPlayer(null);
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

    if (loading) return <Loading />
    if (errorMessage) return <p className="text-zinc-400 py-12 text-center text-xl">{errorMessage}</p>

    if (player) {
        return (
            // key: a new player remounts the sections, so their state (sorting, tabs) starts fresh
            <div key={player.id} className="flex flex-col gap-4">
                <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <BackButton />
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold">{player.name}</h1>
                        <span className="text-zinc-400">
                            {player.team_id !== null && player.team_name ?
                                <Link className="hover:text-sky-400 hover:underline" to={`/nba/team/${player.team_id}`}>{player.team_name}</Link> :
                                player.retired ? "Retired" : "Free agent"
                            }
                            {[player.position, player.jersey && `#${player.jersey}`].filter(Boolean).map((part) => ` · ${part}`).join("")}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col-reverse xl:flex-row gap-4">
                    <div className="flex flex-col gap-3 min-w-0 flex-1">
                        <h2 className="text-xl font-semibold">Latest games</h2>
                        <PlayerRecentGames player_id={player.id} />
                        <h2 className="text-xl font-semibold mt-3">Career averages</h2>
                        <PlayerCareer player_id={player.id} />
                        <h2 className="text-xl font-semibold mt-3">Career highs</h2>
                        <PlayerCareerHighs player={player} />
                    </div>
                    <PlayerInfo player={player} />
                </div>
            </div>
        )
    }

}

export default NBAPlayer;
