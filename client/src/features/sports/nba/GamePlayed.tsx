import { type NbaBoxScore, type NbaGame } from "../../../types/nba";
import { getGameBoxScore } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";
import BoxScore from "./BoxScore";
import { gameDateTime } from "../../../utils/nbaGame";
import BackButton from "../../../components/BackButton";

// one side of the scoreboard: team name, score and W/L, the loser is dimmed
function ScoreSide({ name, abbreviation, score, won, alignRight = false }:
    { name: string, abbreviation: string, score: number, won: boolean, alignRight?: boolean }) {
    return (
        <div className={`flex items-center gap-4 ${alignRight ? "md:flex-row-reverse md:text-right" : ""}`}>
            <div className="flex flex-col">
                <span className={`text-2xl font-bold ${won ? "" : "text-zinc-500"}`}>{abbreviation}</span>
                <span className="text-sm text-zinc-400">{name}</span>
            </div>
            <span className={`text-5xl font-bold tabular-nums ${won ? "" : "text-zinc-500"}`}>{score}</span>
            <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${won ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                {won ? "W" : "L"}
            </span>
        </div>
    )
}

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
    if (statsAvailable === null) return <p className="text-zinc-400 p-4">Loading stats...</p>;

    if (!statsAvailable || game.home_score === null || game.away_score === null || !boxScore) {
        return (
            <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <BackButton />
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold">{game.away_team} @ {game.home_team}</h1>
                    <span className="text-zinc-400">{gameDateTime(game)}</span>
                    <p className="text-zinc-500 mt-2">Stats not yet available for this game</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <span className="text-sm text-zinc-400">Final · {gameDateTime(game)}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-12 pb-2">
                    <ScoreSide
                        name={game.away_team_name}
                        abbreviation={game.away_team}
                        score={game.away_score}
                        won={game.away_score > game.home_score}
                    />
                    <span className="hidden md:block text-2xl text-zinc-600">@</span>
                    <ScoreSide
                        name={game.home_team_name}
                        abbreviation={game.home_team}
                        score={game.home_score}
                        won={game.home_score > game.away_score}
                        alignRight
                    />
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">Box score</h2>
                <BoxScore
                    boxScore={boxScore}
                    away_team={game.away_team_name}
                    away_team_id={game.away_team_id}
                    home_team={game.home_team_name}
                    home_team_id={game.home_team_id}
                />
            </div>
        </>
    )
}

export default GamePlayed;
