import postgres from "postgres";

const sql = postgres();

// columns + join shared by every query: player info with current team's abbreviation and name
// birth_date as text 'yyyy-mm-dd' so it isn't shifted by time zones
const playersWithTeam = () => sql`
    SELECT
        p.id, p.name,
        p.team_id, t.abbreviation AS team, t.name AS team_name,
        p.birth_date::text AS birth_date, p.country, p.school,
        p.height_inches, p.weight_lbs, p.jersey, p.position,
        p.draft_year, p.draft_round, p.draft_number, p.from_year
    FROM nba_player p
    LEFT JOIN nba_team t ON t.id = p.team_id
`;

// get one player based on id
const getOne = async (player_id: number) => {
    const result = await sql`
        ${playersWithTeam()}
        WHERE p.id = ${player_id};
    `;
    return result[0];
};

// get one player based on exact name, case insensitive ('anthony edwards')
// lower(p.name) matches the idx_nba_player_name index
const getByName = async (name: string) => {
    const result = await sql`
        ${playersWithTeam()}
        WHERE lower(p.name) = lower(${name.trim()});
    `;
    return result[0];
};

// search players by part of name ('edwa' -> Anthony Edwards), names starting with the search first
const searchPlayers = async (query: string, limit = 10) => {
    const search = query.trim();
    const result = await sql`
        ${playersWithTeam()}
        WHERE p.name ILIKE ${"%" + search + "%"}
        ORDER BY
            (lower(p.name) LIKE lower(${search + "%"})) DESC,
            p.name
        LIMIT ${limit};
    `;
    return result;
};

// per game averages and shooting percentages from summed season totals (table alias s)
const averages = () => sql`
    sum(s.games)::int AS games,
    round(sum(s.minutes) / nullif(sum(s.minutes_games), 0), 1)::float8 AS minutes,
    round(sum(s.pts)::numeric / sum(s.games), 1)::float8 AS pts,
    round(sum(s.reb)::numeric / sum(s.games), 1)::float8 AS reb,
    round(sum(s.ast)::numeric / sum(s.games), 1)::float8 AS ast,
    round(sum(s.stl)::numeric / sum(s.games), 1)::float8 AS stl,
    round(sum(s.blk)::numeric / sum(s.games), 1)::float8 AS blk,
    round(sum(s.tov)::numeric / sum(s.games), 1)::float8 AS tov,
    round(sum(s.fgm)::numeric / sum(s.games), 1)::float8 AS fgm,
    round(sum(s.fga)::numeric / sum(s.games), 1)::float8 AS fga,
    round(sum(s.fg3m)::numeric / sum(s.games), 1)::float8 AS fg3m,
    round(sum(s.fg3a)::numeric / sum(s.games), 1)::float8 AS fg3a,
    round(sum(s.ftm)::numeric / sum(s.games), 1)::float8 AS ftm,
    round(sum(s.fta)::numeric / sum(s.games), 1)::float8 AS fta,
    round(100 * sum(s.fgm)::numeric / nullif(sum(s.fga), 0), 1)::float8 AS fg_pct,
    round(100 * sum(s.fg3m)::numeric / nullif(sum(s.fg3a), 0), 1)::float8 AS fg3_pct,
    round(100 * sum(s.ftm)::numeric / nullif(sum(s.fta), 0), 1)::float8 AS ft_pct
`;

// get player's averages of every season, oldest first
const getPlayersSeasons = async (player_id: number, season_type: "regular" | "playoffs") => {
    const result = await sql`
        SELECT s.season, s.teams, ${averages()}
        FROM nba_player_season s
        WHERE s.player_id = ${player_id} AND s.season_type = ${season_type}
        GROUP BY s.season, s.teams
        ORDER BY s.season;
    `;
    return result;
};

// get player's career averages (undefined if no games played)
const getPlayersCareer = async (player_id: number, season_type: "regular" | "playoffs") => {
    const result = await sql`
        SELECT count(*)::int AS seasons, ${averages()}
        FROM nba_player_season s
        WHERE s.player_id = ${player_id} AND s.season_type = ${season_type}
        HAVING count(*) > 0;
    `;
    return result[0];
};

export {
    getOne,
    getByName,
    searchPlayers,
    getPlayersSeasons,
    getPlayersCareer,
};
