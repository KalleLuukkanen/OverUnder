import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import Loading from "../components/Loading";
import { getOne, getRoster } from "../api/nba/nbaTeamsApi";
import { getTeamsPastGames, getTeamsUpcomingGames } from "../api/nba/nbaGamesApi";
import type { NbaTeam, NbaGame, NbaRosterPlayer } from "../types/nba";
import { ApiError } from "../api/apiClient";
import NBAGameCard from "../features/sports/nba/NBAGameCard";
import table from "../styles/table";
import { recordLabel, overtimeLabel } from "../utils/nbaGame";

const PAST_SHOWN = 10;
const UPCOMING_SHOWN = 5;

// the team's side of a played game: opponent, home/away, score and W/L
const teamSide = (game: NbaGame, team_id: number) => {
    const isHome = game.home_team_id === team_id;
    const own = isHome ? game.home_score : game.away_score;
    const opp = isHome ? game.away_score : game.home_score;
    return {
        isHome,
        opponent: isHome ? game.away_team : game.home_team,
        opponent_id: isHome ? game.away_team_id : game.home_team_id,
        own,
        opp,
        won: own === null || opp === null ? null : own > opp,
    };
};

// latest played games as a table, the game cell links to the game page
function TeamPastGames({ games, team_id }: { games: NbaGame[], team_id: number }) {

    if (games.length === 0) return <p className="text-zinc-500">No games played yet this season</p>;

    const sides = games.map((g) => teamSide(g, team_id));
    const wins = sides.filter((s) => s.won === true).length;
    const losses = sides.filter((s) => s.won === false).length;

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Last {games.length}: {wins}-{losses}</span>
            <div className={table.wrapper}>
                <table className={table.table}>
                    <thead>
                        <tr className={table.headRow}>
                            <th className={`${table.th} text-left`}>Date</th>
                            <th className={`${table.th} text-left`}>Game</th>
                            <th className={`${table.th} text-left`}>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((g, i) => {
                            const s = sides[i];
                            return (
                                <tr key={g.id} className={table.row}>
                                    <td className={`${table.td} text-left text-zinc-400`}>{new Date(g.game_date).toLocaleDateString("fi-FI")}</td>
                                    <td className={`${table.td} text-left`}>
                                        <span className="text-zinc-500">{s.isHome ? "vs" : "@"} </span>
                                        <Link className={table.link} to={`/nba/team/${s.opponent_id}`}>{s.opponent}</Link>
                                    </td>
                                    <td className={`${table.td} text-left`}>
                                        {s.won === null ?
                                            <span className="text-zinc-500">Score not available</span> :
                                            <Link className={table.link} to={`/nba/game/${g.id}`}>
                                                <span className={`font-semibold ${s.won ? "text-emerald-400" : "text-rose-400"}`}>{s.won ? "W" : "L"}</span>
                                                <span className="ml-2">{s.own}-{s.opp}</span>
                                            </Link>
                                        }
                                        {overtimeLabel(g.overtime_periods) &&
                                            <span className="ml-2 px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400">{overtimeLabel(g.overtime_periods)}</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// current players with season averages, names link to the player pages
function TeamRoster({ roster }: { roster: NbaRosterPlayer[] }) {

    if (roster.length === 0) return <p className="text-zinc-500">No players found</p>;

    // averages are null for players without games this season
    const avg = (value: number | null) => value === null ? "-" : value.toFixed(1);

    return (
        <div className={table.wrapper}>
            <table className={table.table}>
                <thead>
                    <tr className={table.headRow}>
                        <th className={`${table.th} text-left`}>Player</th>
                        <th className={table.th}>GP</th>
                        <th className={table.th}>MIN</th>
                        <th className={table.th}>PTS</th>
                        <th className={table.th}>REB</th>
                        <th className={table.th}>AST</th>
                    </tr>
                </thead>
                <tbody>
                    {roster.map((p) => (
                        <tr key={p.id} className={table.row}>
                            <td className={`${table.td} text-left`}>
                                <Link className={table.link} to={`/nba/player/${p.id}`}>{p.name}</Link>
                            </td>
                            <td className={`${table.td} text-zinc-400`}>{p.games}</td>
                            <td className={`${table.td} text-zinc-400`}>{avg(p.minutes)}</td>
                            <td className={`${table.td} font-semibold`}>{avg(p.pts)}</td>
                            <td className={table.td}>{avg(p.reb)}</td>
                            <td className={table.td}>{avg(p.ast)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function NBATeam() {

    const { teamId } = useParams();

    const [team, setTeam] = useState<NbaTeam | null>(null);
    const [pastGames, setPastGames] = useState<NbaGame[]>([]);
    const [upcomingGames, setUpcomingGames] = useState<NbaGame[]>([]);
    const [roster, setRoster] = useState<NbaRosterPlayer[]>([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        // another team opened from this page (opponent links): reset before loading
        setLoading(true);
        setErrorMessage("");
        setTeam(null);
        const load = async () => {
            try {
                const id = Number(teamId);
                const [team, past, upcoming, roster] = await Promise.all([
                    getOne(id),
                    getTeamsPastGames(id),
                    getTeamsUpcomingGames(id),
                    getRoster(id),
                ]);
                if (!cancelled) {
                    setTeam(team);
                    setPastGames(past.slice(0, PAST_SHOWN));
                    setUpcomingGames(upcoming.slice(0, UPCOMING_SHOWN));
                    setRoster(roster);
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
                    setErrorMessage("Team not found");
                } else {
                    alert("Something went wrong, please try again");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [teamId]);

    if (loading) return <Loading />;
    if (errorMessage) return <p className="text-zinc-400 py-12 text-center text-xl">{errorMessage}</p>;
    if (!team) return;

    const record = recordLabel(team.wins, team.losses);
    // games come from the current season only, the label says which one
    const season = pastGames[0]?.season ?? upcomingGames[0]?.season;
    const seasonLabel = <span className="ml-2 text-sm font-normal text-zinc-500">{season ? `${season} season` : "this season"}</span>;

    return (
        // key: a new team remounts the sections
        <div key={team.id} className="flex flex-col gap-4">
            <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <BackButton />
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold">{team.name}</h1>
                    <span className="text-zinc-400">{[team.abbreviation, record && `${record} this season`].filter(Boolean).join(" · ")}</span>
                </div>
            </div>
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex flex-col gap-3 min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">Latest games{seasonLabel}</h2>
                    <TeamPastGames games={pastGames} team_id={team.id} />
                    <h2 className="text-xl font-semibold mt-3">Upcoming games{seasonLabel}</h2>
                    {upcomingGames.length === 0 ?
                        <p className="text-zinc-500">No upcoming games scheduled</p> :
                        <ul className="flex flex-wrap gap-2">
                            {upcomingGames.map((g) => (
                                <li key={g.id}>
                                    <NBAGameCard game={g} team_id={team.id} />
                                </li>
                            ))}
                        </ul>
                    }
                </div>
                <div className="flex flex-col gap-3 min-w-0 xl:w-[28rem] shrink-0">
                    <h2 className="text-xl font-semibold">Roster<span className="ml-2 text-sm font-normal text-zinc-500">{season ? `${season} averages` : "season averages"}</span></h2>
                    <TeamRoster roster={roster} />
                </div>
            </div>
        </div>
    )
}

export default NBATeam;
