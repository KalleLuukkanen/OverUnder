import { type NbaBoxScore, type NbaRosterPlayer } from "../../../types/nba";
import { getPlayersLastGames, getPlayersLastGamesVsOpponent } from "../../../api/nba/nbaPlayerGamesApi";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// one game's stat line, e.g. "34 MIN · 28 PTS · 7 REB · 5 AST · 12.11.2026"
function StatLine({ game }: { game: NbaBoxScore }) {
    return (
        <p className="tabular-nums">
            {Math.round(game.minutes)} MIN · <span className="font-semibold">{game.pts} PTS</span> · {game.reb} REB · {game.ast} AST
            <span className="text-zinc-500"> · {new Date(game.game_date).toLocaleDateString("fi-FI")}</span>
        </p>
    );
}

// label on the left, value on the right
function Row({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:gap-3">
            <span className="text-zinc-400 sm:w-44 shrink-0">{label}</span>
            <div>{children}</div>
        </div>
    )
}

function NBAPlayerBrief({ player, opp_team_id, opp_team }: { player: NbaRosterPlayer, opp_team_id: number, opp_team: string }) {

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [lastPerformance, setLastPerformance] = useState<NbaBoxScore | null>(null);
    const [lastPerformanceVS, setLastPerformanceVS] = useState<NbaBoxScore | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // endpoints return [] when player has no games, so [0] can be undefined
                const [last, lastVS] = await Promise.all([
                    getPlayersLastGames(player.id, 1),
                    getPlayersLastGamesVsOpponent(player.id, opp_team_id, 1),
                ]);
                if (!cancelled) {
                    setLastPerformance(last[0] ?? null);
                    setLastPerformanceVS(lastVS[0] ?? null);
                }
            } catch {
                if (!cancelled) setErrorMessage("Couldn't load player's games, please try again");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player.id, opp_team_id]);

    return (
        <div className="flex flex-col gap-2 text-sm">
            <Row label="Games played">{player.games}</Row>
            <Row label="Season averages">
                {player.games > 0 ?
                    <p className="tabular-nums">{player.minutes} MIN · <span className="font-semibold">{player.pts} PTS</span> · {player.reb} REB · {player.ast} AST</p> :
                    <p className="text-zinc-500">No games this season</p>
                }
            </Row>

            {loading ? <p className="text-zinc-500">Loading games...</p> :
                errorMessage ? <p className="text-rose-400">{errorMessage}</p> :
                    <>
                        <Row label="Last game">
                            {lastPerformance ?
                                <StatLine game={lastPerformance} /> :
                                <p className="text-zinc-500">No games found</p>
                            }
                        </Row>
                        <Row label={`Last game vs ${opp_team}`}>
                            {lastPerformanceVS ?
                                <StatLine game={lastPerformanceVS} /> :
                                <p className="text-zinc-500">No games against {opp_team} found</p>
                            }
                        </Row>
                    </>
            }
            <Link className="mt-1 w-fit text-sky-400 hover:underline" to={`/nba/player/${player.id}`}>See more stats →</Link>
        </div>
    )
}

export default NBAPlayerBrief;
