import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTeamsGames } from "../../../api/nba/nbaGamesApi";
import type { NbaGame } from "../../../types/nba";
import table from "../../../styles/table";
import { isPostseason, gameTypeTag, overtimeLabel } from "../../../utils/nbaGame";

// one game from the team's point of view
type TeamGame = {
    game: NbaGame;
    isHome: boolean;
    opponent: string;
    opponent_id: number;
    own: number | null;
    opp: number | null;
    won: boolean | null;    // null = not played yet
};

const toTeamGame = (game: NbaGame, team_id: number): TeamGame => {
    const isHome = game.home_team_id === team_id;
    const own = isHome ? game.home_score : game.away_score;
    const opp = isHome ? game.away_score : game.home_score;
    return {
        game,
        isHome,
        opponent: isHome ? game.away_team : game.home_team,
        opponent_id: isHome ? game.away_team_id : game.home_team_id,
        own,
        opp,
        won: own === null || opp === null ? null : own > opp,
    };
};

// 'W-L' of the played games in the list
const record = (games: TeamGame[]) =>
    `${games.filter((g) => g.won === true).length}-${games.filter((g) => g.won === false).length}`;

// one part of the season (regular season or playoffs): title with the record, then every game
// the record column is the running record after each game
function GamesTable({ title, games }: { title: string, games: TeamGame[] }) {

    let wins = 0;
    let losses = 0;

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">
                {title}
                <span className="ml-2 text-sm font-normal text-zinc-400">{record(games)}</span>
            </h3>
            <div className={table.wrapper}>
                <table className={table.table}>
                    <thead>
                        <tr className={table.headRow}>
                            <th className={table.th}>#</th>
                            <th className={`${table.th} text-left`}>Date</th>
                            <th className={`${table.th} text-left`}>Opponent</th>
                            <th className={`${table.th} text-left`}>Result</th>
                            <th className={table.th}>Record</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((g, i) => {
                            if (g.won === true) wins++;
                            if (g.won === false) losses++;
                            const tag = gameTypeTag(g.game.id);
                            return (
                                <tr key={g.game.id} className={table.row}>
                                    <td className={`${table.td} text-zinc-500`}>{i + 1}</td>
                                    <td className={`${table.td} text-left text-zinc-400`}>{new Date(g.game.game_date).toLocaleDateString("fi-FI")}</td>
                                    <td className={`${table.td} text-left`}>
                                        <span className="text-zinc-500">{g.isHome ? "vs" : "@"} </span>
                                        <Link className={table.link} to={`/nba/team/${g.opponent_id}`}>{g.opponent}</Link>
                                        {tag && <span className="ml-2 px-1.5 rounded text-xs bg-zinc-800 text-zinc-400">{tag}</span>}
                                    </td>
                                    <td className={`${table.td} text-left`}>
                                        {g.won === null ?
                                            <Link className="text-zinc-500 hover:text-sky-400 hover:underline" to={`/nba/game/${g.game.id}`}>Not played</Link> :
                                            <Link className={table.link} to={`/nba/game/${g.game.id}`}>
                                                <span className={`font-semibold ${g.won ? "text-emerald-400" : "text-rose-400"}`}>{g.won ? "W" : "L"}</span>
                                                <span className="ml-2">{g.own}-{g.opp}</span>
                                            </Link>
                                        }
                                        {overtimeLabel(g.game.overtime_periods) &&
                                            <span className="ml-2 px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400">{overtimeLabel(g.game.overtime_periods)}</span>
                                        }
                                    </td>
                                    <td className={`${table.td} text-zinc-400`}>{g.won === null ? "" : `${wins}-${losses}`}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// every game of a team's season, regular season first and the playoffs below it
function TeamSeasonGames({ team_id, season }: { team_id: number, season: string }) {

    const [games, setGames] = useState<TeamGame[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = async () => {
            try {
                const result = await getTeamsGames(team_id, season);
                if (!cancelled) setGames(result.map((g) => toTeamGame(g, team_id)));
            } catch {
                if (!cancelled) setGames([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [team_id, season]);

    if (loading) return <p className="text-zinc-400">Loading games...</p>;
    if (games.length === 0) return <p className="text-zinc-500">No games found for this season</p>;

    const regular = games.filter((g) => !isPostseason(g.game.id));
    const playoffs = games.filter((g) => isPostseason(g.game.id));

    return (
        <div className="flex flex-col gap-4">
            {regular.length > 0 && <GamesTable title="Regular season" games={regular} />}
            {playoffs.length > 0 && <GamesTable title="Playoffs" games={playoffs} />}
        </div>
    )
}

export default TeamSeasonGames;
