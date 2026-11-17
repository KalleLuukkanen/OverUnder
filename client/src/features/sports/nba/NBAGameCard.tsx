import type { NbaGame } from "../../../types/nba";
import { Link } from "react-router-dom";
import { isScoreMissing, gameDateTime, finalLabel } from "../../../utils/nbaGame";

// one team's row: abbreviation and score, the loser is dimmed
function TeamRow({ team, score, won, prefix = "" }: { team: string, score: number | null, won: boolean | null, prefix?: string }) {
    return (
        <div className={`flex items-center justify-between ${won === false ? "text-zinc-500" : "text-zinc-100"}`}>
            <span className={`text-lg ${won ? "font-bold" : "font-medium"}`}>
                <span className="text-zinc-500 font-normal">{prefix}</span>{team}
            </span>
            {score !== null && <span className={`text-lg tabular-nums ${won ? "font-bold" : ""}`}>{score}</span>}
        </div>
    )
}

// team_id is optional: when given, the card also shows that team's W/L
// bg is the card's background class, darker by default, lighter inside a panel
function NBAGameCard({ game, team_id, bg = "bg-zinc-900" }: { game: NbaGame, team_id?: number, bg?: string }) {

    const scoreMissing = isScoreMissing(game);
    const hasScore = game.home_score !== null && game.away_score !== null;
    const homeWon = hasScore ? game.home_score! > game.away_score! : null;

    const team_result = () => {
        if (team_id === undefined || homeWon === null) return "";
        switch (team_id) {
            case game.away_team_id:
                return homeWon ? "L" : "W";
            case game.home_team_id:
                return homeWon ? "W" : "L";
            default:
                return "";
        }
    };
    const result = team_result();

    return (
        <Link
            className={`group flex flex-col gap-2 w-60 p-3 rounded-lg border border-zinc-800 ${bg} hover:border-zinc-600 transition-colors`}
            to={`/nba/game/${game.id}`}
        >
            <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{gameDateTime(game)}</span>
                {result &&
                    <span className={`px-1.5 py-0.5 rounded font-bold ${result === "W" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {result}
                    </span>
                }
            </div>
            <div className="flex flex-col">
                <TeamRow team={game.away_team} score={game.away_score} won={homeWon === null ? null : !homeWon} />
                <TeamRow team={game.home_team} score={game.home_score} won={homeWon} prefix="@ " />
            </div>
            <div className="flex items-center justify-between text-xs">
                {scoreMissing ?
                    <span className="text-zinc-500">Score not available yet</span> :
                    <span className="text-zinc-500">{hasScore ? finalLabel(game.overtime_periods) : "Upcoming"}</span>
                }
                <span className="text-zinc-500 group-hover:text-sky-400">See more →</span>
            </div>
        </Link>
    )
}

export default NBAGameCard;
