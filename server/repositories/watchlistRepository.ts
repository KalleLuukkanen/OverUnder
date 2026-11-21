import postgres from "postgres";

const sql = postgres();

const MAX_ITEMS = 50;

// the next unplayed game of a team, as columns of the watched row (all null if there's none scheduled)
// team_sql is the column holding the team's id
const nextGame = (team_sql: postgres.PendingQuery<postgres.Row[]>) => sql`
    LEFT JOIN LATERAL (
        SELECT g.id, g.game_date, g.start_time, g.season,
            g.home_team_id = ${team_sql} AS is_home,
            CASE WHEN g.home_team_id = ${team_sql} THEN g.away_team_id ELSE g.home_team_id END AS opponent_id
        FROM nba_game g
        WHERE ${team_sql} IN (g.home_team_id, g.away_team_id) AND g.home_score IS NULL
            AND COALESCE(g.start_time > now(), g.game_date >= current_date)
        ORDER BY g.game_date, g.start_time
        LIMIT 1
    ) ng ON true
`;

// the next game's columns of a watched row, opponent named by the game's season
const nextGameColumns = sql`
    ng.id AS game_id, to_char(ng.game_date, 'YYYY-MM-DD') AS game_date, ng.start_time, ng.is_home,
    ng.opponent_id, nba_team_abbreviation(ng.opponent_id, ng.season) AS opponent
`;

// the user's watched players and teams, each with its next game, soonest game first (no game last)
const getWatchlist = async (user_id: string) => {
    const players = await sql`
        SELECT w.player_id AS id, p.name, p.team_id, t.abbreviation AS team, ${nextGameColumns}
        FROM watchlist w
        JOIN nba_player p ON p.id = w.player_id
        LEFT JOIN nba_team t ON t.id = p.team_id
        ${nextGame(sql`p.team_id`)}
        WHERE w.user_id = ${user_id}
        ORDER BY ng.game_date NULLS LAST, ng.start_time, p.name;
    `;
    const teams = await sql`
        SELECT w.team_id AS id, t.name, t.abbreviation, ${nextGameColumns}
        FROM watchlist w
        JOIN nba_team t ON t.id = w.team_id
        ${nextGame(sql`t.id`)}
        WHERE w.user_id = ${user_id}
        ORDER BY ng.game_date NULLS LAST, ng.start_time, t.name;
    `;
    // the next game as one object, null when none is scheduled
    const withGame = (row: postgres.Row) => {
        const { game_id, game_date, start_time, is_home, opponent_id, opponent, ...rest } = row;
        return { ...rest, next_game: game_id ? { id: game_id, game_date, start_time, is_home, opponent_id, opponent } : null };
    };
    return { players: players.map(withGame), teams: teams.map(withGame) };
};

const countItems = async (user_id: string) => {
    const result = await sql`SELECT count(*)::int AS n FROM watchlist WHERE user_id = ${user_id};`;
    return result[0].n as number;
};

// adds a player, already watched is fine; false if the player doesn't exist
const addPlayer = async (user_id: string, player_id: number) => {
    const exists = await sql`SELECT 1 FROM nba_player WHERE id = ${player_id};`;
    if (exists.length === 0) return false;
    await sql`
        INSERT INTO watchlist (user_id, player_id) VALUES (${user_id}, ${player_id})
        ON CONFLICT (user_id, player_id) WHERE player_id IS NOT NULL DO NOTHING;
    `;
    return true;
};

// adds a team, already watched is fine; false if the team doesn't exist
const addTeam = async (user_id: string, team_id: number) => {
    const exists = await sql`SELECT 1 FROM nba_team WHERE id = ${team_id};`;
    if (exists.length === 0) return false;
    await sql`
        INSERT INTO watchlist (user_id, team_id) VALUES (${user_id}, ${team_id})
        ON CONFLICT (user_id, team_id) WHERE team_id IS NOT NULL DO NOTHING;
    `;
    return true;
};

const removePlayer = async (user_id: string, player_id: number) => {
    await sql`DELETE FROM watchlist WHERE user_id = ${user_id} AND player_id = ${player_id};`;
};

const removeTeam = async (user_id: string, team_id: number) => {
    await sql`DELETE FROM watchlist WHERE user_id = ${user_id} AND team_id = ${team_id};`;
};

export {
    MAX_ITEMS,
    getWatchlist,
    countItems,
    addPlayer,
    addTeam,
    removePlayer,
    removeTeam,
};
