import { getRoster, getOne } from "../../../api/nba/nbaTeamsApi";
import { getTeamsPastGames } from "../../../api/nba/nbaGamesApi";
import { useEffect, useState } from "react";
import type { NbaTeam, NbaGame, NbaRosterPlayer } from "../../../types/nba";
import { ApiError } from "../../../api/apiClient";
import NBAGameCard from "./NBAGameCard";
import { ChevronDown, ChevronRight } from "lucide-react";
import NBAPlayerBrief from "./NBAPlayerBrief";

function NBAGameTeam({ team_id, opp_team_id, opp_team }: { team_id: number, opp_team_id: number, opp_team: string }) {

    const [loading, setLoading] = useState(true);

    const [team, setTeam] = useState<NbaTeam | null>(null);
    const [pastGames, setPastGames] = useState<NbaGame[]>([]);
    const [roster, setRoster] = useState<NbaRosterPlayer[]>([]);

    const [showingGames, setShowingGames] = useState(false);
    const [showingRoster, setShowingRoster] = useState(false);

    const [playersShowing, setPlayersShowing] = useState<number[]>([]);
    const togglePlayersShowing = (player_id: number) => {
        if (playersShowing.includes(player_id)) {
            setPlayersShowing((prev) => prev.filter((id) => id !== player_id));
        } else {
            setPlayersShowing((prev) => [...prev, player_id]);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const team = await getOne(team_id);
                const games = (await getTeamsPastGames(team_id)).slice(0, 5);
                const roster = await getRoster(team_id);

                if (!cancelled) {
                    setTeam(team);
                    setPastGames(games);
                    setRoster(roster);
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) {
                    alert("Team data not found");
                } else {
                    alert("Something went wrong, please try again");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [team_id]);

    if (loading) return <p className="text-2xl">Loading team...</p>;
    if (!team) return;

    return (
        <div className="flex flex-col space-y-4 mt-6">
            <span className="text-2xl underline">{team.name}</span>
            <div className="flex flex-col space-y-2">
                <button className="text-xl flex items-center cursor-pointer" type="button" onClick={() => setShowingGames(!showingGames)}>
                    Last 5 games {showingGames ? <ChevronDown /> : <ChevronRight />}
                </button>
                {showingGames &&
                    <ul className="flex flex-wrap gap-2">
                        {pastGames.map((g) => (
                            <li key={g.id}>
                                <NBAGameCard game={g} team_id={team_id} bg="bg-white" />
                            </li>
                        ))}
                    </ul>
                }
            </div>
            <div className="flex flex-col space-y-2">
                <button className="text-xl flex items-center cursor-pointer" type="button" onClick={() => setShowingRoster(!showingRoster)}>
                    Roster {showingRoster ? <ChevronDown /> : <ChevronRight />}
                </button>
                {showingRoster &&
                    <ul className="flex flex-col space-y-1">
                        {roster.map((p) => (
                            <li key={p.id} className={`flex flex-col space-y-2 ${playersShowing.includes(p.id) ? "bg-white rounded p-1" : ""}`} >
                                <div className="flex space-x-2 items-center cursor-pointer" onClick={() => togglePlayersShowing(p.id)}>
                                    <p>{p.name}</p>
                                    {playersShowing.includes(p.id) ? <ChevronDown /> : <ChevronRight />}
                                </div>
                                {playersShowing.includes(p.id) && <NBAPlayerBrief player={p} opp_team_id={opp_team_id} opp_team={opp_team} />}
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>
    )
}

export default NBAGameTeam;