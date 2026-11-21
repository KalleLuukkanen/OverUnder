import postgres from "postgres";
import { previousSeason } from "./nbaGamesRepository.js";

const sql = postgres();

// retired = no team and no games in the current or previous season (a free agent has played recently)
const isRetired = () => sql`
    (p.team_id IS NULL AND NOT EXISTS (
        SELECT 1
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        WHERE pg.player_id = p.id AND g.season >= ${previousSeason()}
    ))
`;

// columns + join shared by every query: player info with current team's abbreviation and name
// birth_date as text 'yyyy-mm-dd' so it isn't shifted by time zones
const playersWithTeam = () => sql`
    SELECT
        p.id, p.name,
        p.team_id, t.abbreviation AS team, t.name AS team_name,
        p.birth_date::text AS birth_date, p.country, p.school,
        p.height_inches, p.weight_lbs, p.jersey, p.position,
        p.draft_year, p.draft_round, p.draft_number, p.from_year,
        ${isRetired()} AS retired
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
// activeOnly leaves retired players out (prop checker: only players who can still play)
const searchPlayers = async (query: string, limit = 10, activeOnly = false) => {
    const search = query.trim();
    const result = await sql`
        ${playersWithTeam()}
        WHERE p.name ILIKE ${"%" + search + "%"}
            ${activeOnly ? sql`AND NOT ${isRetired()}` : sql``}
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

// stats with career highs, the game's value from the box score line
const HIGH_STATS = ["pts", "reb", "ast", "stl", "blk", "fg3m", "fgm", "ftm"] as const;

// player's best game in each stat, regular season ('2' in the game id) or playoffs ('4'), like the season averages
// the first game it was reached, and how many times; box scores go back to 1996-97
const getPlayersCareerHighs = async (player_id: number, season_type: "regular" | "playoffs") => {
    const typeDigit = season_type === "regular" ? "2" : "4";
    const result = await sql`
        WITH values AS (
            SELECT
                s.stat, pg.game_id, g.game_date, g.season, pg.is_home, pg.opponent_id,
                nba_team_abbreviation(pg.opponent_id, g.season) AS opponent,
                CASE s.stat
                    WHEN 'pts' THEN pg.pts WHEN 'reb' THEN pg.reb WHEN 'ast' THEN pg.ast
                    WHEN 'stl' THEN pg.stl WHEN 'blk' THEN pg.blk WHEN 'fg3m' THEN pg.fg3m
                    WHEN 'fgm' THEN pg.fgm WHEN 'ftm' THEN pg.ftm
                END AS value
            FROM nba_player_game pg
            JOIN nba_game g ON g.id = pg.game_id
            CROSS JOIN unnest(string_to_array(${HIGH_STATS.join(",")}, ',')) AS s(stat)
            WHERE pg.player_id = ${player_id} AND substring(g.id, 3, 1) = ${typeDigit}
        ),
        -- the high and how many games reached it
        highs AS (
            SELECT stat, max(value) AS high FROM values GROUP BY stat
        )
        SELECT DISTINCT ON (v.stat)
            v.stat, v.value, v.game_id, v.game_date, v.season, v.is_home, v.opponent, v.opponent_id,
            (SELECT count(*)::int FROM values c WHERE c.stat = v.stat AND c.value = h.high) AS times
        FROM values v
        JOIN highs h ON h.stat = v.stat AND v.value = h.high
        WHERE h.high > 0
        ORDER BY v.stat, v.game_date;
    `;
    // in the order of HIGH_STATS
    return HIGH_STATS.flatMap((stat) => {
        const row = result.find((r) => r.stat === stat);
        return row ? [{
            stat,
            value: row.value as number,
            times: row.times as number,
            game: {
                id: row.game_id as string,
                game_date: row.game_date as Date,
                season: row.season as string,
                is_home: row.is_home as boolean,
                opponent: row.opponent as string,
                opponent_id: row.opponent_id as number,
            },
        }] : [];
    });
};

export {
    getPlayersCareerHighs,
    getOne,
    getByName,
    searchPlayers,
    getPlayersSeasons,
    getPlayersCareer,
};
