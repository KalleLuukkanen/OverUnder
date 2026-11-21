import postgres from "postgres";

const sql = postgres();

// current season in format '2026-27' (NBA season starts in October)
const currentSeason = () => {
    const today = new Date();
    const startYear = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// season before the current one ('2026-27' -> '2025-26')
const previousSeason = () => {
    const startYear = Number(currentSeason().slice(0, 4)) - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// columns shared by every query: game info with both teams' abbreviations and names
// names are the ones of the game's season (an 2007 game is SEA, not OKC)
// home_score and away_score are null for games not played yet
const gamesWithTeams = () => sql`
    SELECT
        g.id, g.game_date, g.start_time, g.season,
        g.home_team_id, nba_team_abbreviation(g.home_team_id, g.season) AS home_team,
        nba_team_name(g.home_team_id, g.season) AS home_team_name,
        g.away_team_id, nba_team_abbreviation(g.away_team_id, g.season) AS away_team,
        nba_team_name(g.away_team_id, g.season) AS away_team_name,
        g.home_score, g.away_score, g.overtime_periods
    FROM nba_game g
`;

// get one game based on id
const getOne = async (game_id: string) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.id = ${game_id};
    `;
    return result[0];
};

// all today's and tomorrow's games
// note: game_date is the US (Eastern) date, so a game on the 14th tips off on the night of the 14th/15th in Finland
const getUpcomingGames = async () => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.game_date BETWEEN current_date AND current_date + 1
        ORDER BY g.game_date, g.start_time;
    `;
    return result;
};

// all games on given date (format 'YYYY-MM-DD')
const getGamesByDate = async (date: string) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.game_date = ${date};
    `;
    return result;
};

// get all games of given season (format '2026-27')
const getSeasonAllGames = async (season: string) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${season}
        ORDER BY g.game_date, g.start_time;
    `;
    return result;
};

// get current season's games played, latest first
const getCurrentSeasonPastGames = async () => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${currentSeason()} AND g.game_date < current_date
        ORDER BY g.game_date DESC, g.start_time DESC NULLS LAST;
    `;
    return result;
};

// get current season's upcoming games, soonest first
const getCurrentSeasonUpcomingGames = async () => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${currentSeason()} AND g.game_date >= current_date
        ORDER BY g.game_date, g.start_time;
    `;
    return result;
};

// get team's all games from given season
const getTeamsGames = async (team_id: number, season: string) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${season} AND ${team_id} IN (g.home_team_id, g.away_team_id)
        ORDER BY g.game_date, g.start_time;
    `;
    return result;
};

// get team's current season's played games, latest first
const getTeamsPastGames = async (team_id: number) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${currentSeason()} AND g.game_date < current_date
            AND ${team_id} IN (g.home_team_id, g.away_team_id)
        ORDER BY g.game_date DESC, g.start_time DESC NULLS LAST;
    `;
    return result;
};

// get team's current season's upcoming games, soonest first
const getTeamsUpcomingGames = async (team_id: number) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.season = ${currentSeason()} AND g.game_date >= current_date
            AND ${team_id} IN (g.home_team_id, g.away_team_id)
        ORDER BY g.game_date, g.start_time;
    `;
    return result;
};

// get team's next game (undefined if none scheduled)
const getTeamsNextGame = async (team_id: number) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.game_date >= current_date AND ${team_id} IN (g.home_team_id, g.away_team_id)
        ORDER BY g.game_date, g.start_time
        LIMIT 1;
    `;
    return result[0];
};

// get played games between two teams (all seasons in db), latest first
// fromSeason = only games from that season on (signed out)
const getHeadToHeadGames = async (team_id: number, opponent_id: number, fromSeason?: string) => {
    const result = await sql`
        ${gamesWithTeams()}
        WHERE g.game_date < current_date
            ${fromSeason ? sql`AND g.season >= ${fromSeason}` : sql``}
            AND ((g.home_team_id = ${team_id} AND g.away_team_id = ${opponent_id})
              OR (g.home_team_id = ${opponent_id} AND g.away_team_id = ${team_id}))
        ORDER BY g.game_date DESC, g.start_time DESC NULLS LAST;
    `;
    return result;
};

// seasons that have played games, latest first ('2026-27', '2025-26', ...)
const getSeasons = async () => {
    const result = await sql`
        SELECT DISTINCT season
        FROM nba_game
        WHERE home_score IS NOT NULL
        ORDER BY season DESC;
    `;
    return result.map((r) => r.season as string);
};

// quarter scores, team stats and season record after the game for both teams, away team first
const getGameTeamStats = async (game_id: string) => {
    const result = await sql`
        SELECT tg.*,
            nba_team_abbreviation(tg.team_id, g.season) AS team, nba_team_name(tg.team_id, g.season) AS team_name,
            (tg.team_id = g.home_team_id) AS is_home
        FROM nba_team_game tg
        JOIN nba_game g ON g.id = tg.game_id
        WHERE tg.game_id = ${game_id}
        ORDER BY is_home;
    `;
    return result;
};

export {
    getSeasons,
    getGameTeamStats,
    currentSeason,
    previousSeason,
    getOne,
    getUpcomingGames,
    getGamesByDate,
    getSeasonAllGames,
    getCurrentSeasonPastGames,
    getCurrentSeasonUpcomingGames,
    getTeamsGames,
    getTeamsPastGames,
    getTeamsUpcomingGames,
    getTeamsNextGame,
    getHeadToHeadGames,
};
