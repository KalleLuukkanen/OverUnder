import { getRoster, getOne } from "../../../api/nba/nbaTeamsApi";
import { getTeamsPastGames } from "../../../api/nba/nbaGamesApi";
import { useEffect, useState } from "react";
import type { NbaTeam, NbaGame, NbaRosterPlayer } from "../../../types/nba";
import { ApiError } from "../../../api/apiClient";
import NBAGameCard from "./NBAGameCard";
import { ChevronDown } from "lucide-react";
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

    if (loading) return <p className="text-zinc-400 p-4">Loading team...</p>;
    if (!team) return;

    // rotating chevron used by the section toggles
    const chevron = (open: boolean, size = 18) =>
        <ChevronDown size={size} className={`text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />;

    return (
        <div className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <div className="flex flex-col gap-2">
                <button
                    className="flex items-center justify-between px-2 py-1.5 -mx-2 rounded-md cursor-pointer font-medium text-zinc-300 hover:bg-zinc-800/50"
                    type="button"
                    onClick={() => setShowingGames(!showingGames)}
                >
                    Last 5 games {chevron(showingGames)}
                </button>
                {showingGames &&
                    <ul className="flex flex-wrap gap-2">
                        {pastGames.map((g) => (
                            <li key={g.id}>
                                <NBAGameCard game={g} team_id={team_id} bg="bg-zinc-800/60" />
                            </li>
                        ))}
                    </ul>
                }
            </div>
            <div className="flex flex-col gap-2">
                <button
                    className="flex items-center justify-between px-2 py-1.5 -mx-2 rounded-md cursor-pointer font-medium text-zinc-300 hover:bg-zinc-800/50"
                    type="button"
                    onClick={() => setShowingRoster(!showingRoster)}
                >
                    Roster {chevron(showingRoster)}
                </button>
                {showingRoster &&
                    <ul className="flex flex-col gap-1">
                        {roster.map((p) => (
                            <li key={p.id} className={`flex flex-col rounded-lg ${playersShowing.includes(p.id) ? "bg-zinc-800/60 border border-zinc-700/60" : ""}`} >
                                <button
                                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-left hover:bg-zinc-800/60"
                                    type="button"
                                    onClick={() => togglePlayersShowing(p.id)}
                                >
                                    <span>{p.name}</span>
                                    <span className="flex items-center gap-3 text-sm text-zinc-400">
                                        {p.games > 0 && <span className="tabular-nums">{p.pts} PPG</span>}
                                        {chevron(playersShowing.includes(p.id), 16)}
                                    </span>
                                </button>
                                {playersShowing.includes(p.id) &&
                                    <div className="px-3 pb-3">
                                        <NBAPlayerBrief player={p} opp_team_id={opp_team_id} opp_team={opp_team} />
                                    </div>
                                }
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>
    )
}

export default NBAGameTeam;