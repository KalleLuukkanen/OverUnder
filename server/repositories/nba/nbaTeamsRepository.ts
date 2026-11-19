import postgres from "postgres";
import { currentSeason } from "./nbaGamesRepository.js";

const sql = postgres();

// get all teams, alphabetically
const getAll = async () => {
    const result = await sql`
        SELECT id, abbreviation, name
        FROM nba_team
        ORDER BY name;
    `;
    return result;
};

// teams that played in given season, with that season's abbreviations and names, alphabetically
const getSeasonTeams = async (season: string) => {
    const result = await sql`
        SELECT ts.team_id AS id, ts.abbreviation, ts.name
        FROM nba_team_season ts
        WHERE ts.season = ${season}
        ORDER BY ts.name;
    `;
    return result;
};

// get one team based on id, with its current regular season record (wins/losses null before its first game)
// record = from the team's latest regular season game this season (game type '2' in the id)
const getOne = async (team_id: number) => {
    const result = await sql`
        SELECT t.id, t.abbreviation, t.name, r.season_wins AS wins, r.season_losses AS losses
        FROM nba_team t
        LEFT JOIN LATERAL (
            SELECT tg.season_wins, tg.season_losses
            FROM nba_team_game tg
            JOIN nba_game g ON g.id = tg.game_id
            WHERE tg.team_id = t.id AND g.season = ${currentSeason()} AND substring(g.id, 3, 1) = '2'
            ORDER BY g.game_date DESC, g.start_time DESC NULLS LAST
            LIMIT 1
        ) r ON true
        WHERE t.id = ${team_id};
    `;
    return result[0];
};

// get one team based on abbreviation ('MIN', 'min')
const getByAbbreviation = async (abbreviation: string) => {
    const result = await sql`
        SELECT id, abbreviation, name
        FROM nba_team
        WHERE abbreviation = upper(${abbreviation});
    `;
    return result[0];
};

// get team's current players with their current season's games played and averages, most minutes first
// players who haven't played this season (injured, new signings) are last
const getRoster = async (team_id: number) => {
    const result = await sql`
        SELECT
            p.id, p.name,
            count(s.game_id)::int AS games,
            round(avg(s.minutes), 1)::float8 AS minutes,
            round(avg(s.pts), 1)::float8 AS pts,
            round(avg(s.reb), 1)::float8 AS reb,
            round(avg(s.ast), 1)::float8 AS ast
        FROM nba_player p
        LEFT JOIN (
            SELECT pg.*
            FROM nba_player_game pg
            JOIN nba_game g ON g.id = pg.game_id
            WHERE g.season = ${currentSeason()}
        ) s ON s.player_id = p.id
        WHERE p.team_id = ${team_id}
        GROUP BY p.id, p.name
        ORDER BY avg(s.minutes) DESC NULLS LAST, p.name;
    `;
    return result;
};

export {
    getSeasonTeams,
    getAll,
    getOne,
    getByAbbreviation,
    getRoster,
};
