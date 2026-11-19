import { type NbaBoxScore, type NbaGame, type NbaTeamGameStats } from "../../../types/nba";
import { getGameBoxScore } from "../../../api/nba/nbaPlayerGamesApi";
import { getGameTeamStats } from "../../../api/nba/nbaGamesApi";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import BoxScore from "./BoxScore";
import LineScore from "./LineScore";
import TeamGameStats from "./TeamGameStats";
import { gameDateTime, finalLabel, recordLabel } from "../../../utils/nbaGame";
import BackButton from "../../../components/BackButton";
import { Link } from "react-router-dom";

// one side of the scoreboard: team name, record, score and W/L, the loser is dimmed
function ScoreSide({ team_id, name, abbreviation, record, score, won, alignRight = false }:
    { team_id: number, name: string, abbreviation: string, record: string, score: number, won: boolean, alignRight?: boolean }) {
    return (
        <div className={`flex items-center gap-4 ${alignRight ? "md:flex-row-reverse md:text-right" : ""}`}>
            <div className="flex flex-col">
                <span className={`text-2xl font-bold ${won ? "" : "text-zinc-500"}`}>
                    <Link className="hover:text-sky-400 hover:underline" to={`/nba/team/${team_id}`}>{abbreviation}</Link>
                    {record && <span className="ml-2 text-sm font-normal text-zinc-400">{record}</span>}
                </span>
                <Link className="text-sm text-zinc-400 hover:text-sky-400 hover:underline" to={`/nba/team/${team_id}`}>{name}</Link>
            </div>
            <span className={`text-5xl font-bold tabular-nums ${won ? "" : "text-zinc-500"}`}>{score}</span>
            <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${won ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                {won ? "W" : "L"}
            </span>
        </div>
    )
}

// heading that opens and closes the content below it
function Section({ title, open, onToggle, children }:
    { title: string, open: boolean, onToggle: () => void, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <button
                className="flex items-center gap-2 w-fit cursor-pointer text-xl font-semibold hover:text-white"
                type="button"
                aria-expanded={open}
                onClick={onToggle}
            >
                {title}
                <ChevronDown size={20} className={`text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && children}
        </div>
    )
}

function GamePlayed({ game }: { game: NbaGame }) {

    const [statsAvailable, setStatsAvailable] = useState<boolean | null>(null);
    const [boxScore, setBoxScore] = useState<NbaBoxScore[] | null>(null);
    const [teamStats, setTeamStats] = useState<NbaTeamGameStats[]>([]);

    // both sections start open
    const [showingBoxScore, setShowingBoxScore] = useState(true);
    const [showingTeamStats, setShowingTeamStats] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // team stats are extra: if they fail, the page still works with the box score
                const [boxScore, teamStats] = await Promise.all([
                    getGameBoxScore(game.id),
                    getGameTeamStats(game.id).catch(() => []),
                ]);
                if (!cancelled) {
                    setBoxScore(boxScore);
                    setTeamStats(teamStats);
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
    if (statsAvailable === null) return <p className="text-zinc-400 p-4">Loading stats...</p>;

    const awayStats = teamStats.find((t) => t.team_id === game.away_team_id);
    const homeStats = teamStats.find((t) => t.team_id === game.home_team_id);
    const hasTeamStats = awayStats !== undefined && homeStats !== undefined;

    if (!statsAvailable || game.home_score === null || game.away_score === null || !boxScore) {
        return (
            <>
                <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <BackButton />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold">
                            <Link className="hover:text-sky-400 hover:underline" to={`/nba/team/${game.away_team_id}`}>{game.away_team}</Link>
                            {" @ "}
                            <Link className="hover:text-sky-400 hover:underline" to={`/nba/team/${game.home_team_id}`}>{game.home_team}</Link>
                        </h1>
                        <span className="text-zinc-400">{gameDateTime(game)}</span>
                        <p className="text-zinc-500 mt-2">Stats not yet available for this game</p>
                    </div>
                </div>
                {/* quarter scores can arrive before the player box score */}
                {hasTeamStats &&
                    <div className="w-full max-w-xl">
                        <LineScore teams={[awayStats, homeStats]} overtime_periods={game.overtime_periods} />
                    </div>
                }
            </>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <span className="text-sm text-zinc-400">{finalLabel(game.overtime_periods)} · {gameDateTime(game)}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-12 pb-2">
                    <ScoreSide
                        team_id={game.away_team_id}
                        name={game.away_team_name}
                        abbreviation={game.away_team}
                        record={recordLabel(awayStats?.season_wins, awayStats?.season_losses)}
                        score={game.away_score}
                        won={game.away_score > game.home_score}
                    />
                    <span className="hidden md:block text-2xl text-zinc-600">@</span>
                    <ScoreSide
                        team_id={game.home_team_id}
                        name={game.home_team_name}
                        abbreviation={game.home_team}
                        record={recordLabel(homeStats?.season_wins, homeStats?.season_losses)}
                        score={game.home_score}
                        won={game.home_score > game.away_score}
                        alignRight
                    />
                </div>
                {hasTeamStats &&
                    <div className="w-full max-w-xl mx-auto">
                        <LineScore teams={[awayStats, homeStats]} overtime_periods={game.overtime_periods} />
                    </div>
                }
            </div>
            <Section title="Box score" open={showingBoxScore} onToggle={() => setShowingBoxScore(!showingBoxScore)}>
                <BoxScore
                    boxScore={boxScore}
                    away_team={game.away_team_name}
                    away_team_id={game.away_team_id}
                    home_team={game.home_team_name}
                    home_team_id={game.home_team_id}
                />
            </Section>
            {hasTeamStats &&
                <Section title="Team stats" open={showingTeamStats} onToggle={() => setShowingTeamStats(!showingTeamStats)}>
                    <div className="w-full max-w-2xl">
                        <TeamGameStats away={awayStats} home={homeStats} />
                    </div>
                </Section>
            }
        </>
    )
}

export default GamePlayed;
