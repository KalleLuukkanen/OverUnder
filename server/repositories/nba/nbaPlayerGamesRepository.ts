import postgres from "postgres";
import { currentSeason, previousSeason } from "./nbaGamesRepository.js";

const sql = postgres();

// stats that can be used in hit rates: name -> SQL expression
// only these fixed strings ever go into sql.unsafe, never user input
const STATS: Record<string, string> = {
    pts: "pg.pts",
    reb: "pg.reb",
    ast: "pg.ast",
    stl: "pg.stl",
    blk: "pg.blk",
    tov: "pg.tov",
    fgm: "pg.fgm",
    fga: "pg.fga",
    fg3m: "pg.fg3m",
    fg3a: "pg.fg3a",
    ftm: "pg.ftm",
    fta: "pg.fta",
    pra: "pg.pts + pg.reb + pg.ast",
    pr: "pg.pts + pg.reb",
    pa: "pg.pts + pg.ast",
    ra: "pg.reb + pg.ast",
    stocks: "pg.stl + pg.blk",
};

const isStat = (stat: string) => Object.hasOwn(STATS, stat);

// columns + joins shared by every query: box score line with game date, player name and team abbreviations
// (abbreviations of the game's season)
const boxScores = () => sql`
    SELECT
        pg.player_id, p.name AS player_name,
        pg.game_id, g.game_date, g.season, g.overtime_periods,
        pg.team_id, nba_team_abbreviation(pg.team_id, g.season) AS team,
        pg.opponent_id, nba_team_abbreviation(pg.opponent_id, g.season) AS opponent,
        pg.is_home, pg.minutes::float8 AS minutes,
        pg.pts, pg.reb, pg.ast, pg.stl, pg.blk, pg.tov,
        pg.fgm, pg.fga, pg.fg3m, pg.fg3a, pg.ftm, pg.fta
    FROM nba_player_game pg
    JOIN nba_game g ON g.id = pg.game_id
    JOIN nba_player p ON p.id = pg.player_id
`;

// get player's all games from given season, latest first
const getPlayersGames = async (player_id: number, season: string) => {
    const result = await sql`
        ${boxScores()}
        WHERE pg.player_id = ${player_id} AND g.season = ${season}
        ORDER BY g.game_date DESC;
    `;
    return result;
};

// get player's last n games (all seasons in db), latest first
const getPlayersLastGames = async (player_id: number, limit: number) => {
    const result = await sql`
        ${boxScores()}
        WHERE pg.player_id = ${player_id}
        ORDER BY g.game_date DESC
        LIMIT ${limit};
    `;
    return result;
};

// get player's last n games against given team, latest first
const getPlayersLastGamesVsOpponent = async (player_id: number, opponent_id: number, limit: number) => {
    const result = await sql`
        ${boxScores()}
        WHERE pg.player_id = ${player_id} AND pg.opponent_id = ${opponent_id}
        ORDER BY g.game_date DESC
        LIMIT ${limit};
    `;
    return result;
};

// get box score of one game: every player who played, by team and most minutes first
const getGameBoxScore = async (game_id: string) => {
    const result = await sql`
        ${boxScores()}
        WHERE pg.game_id = ${game_id}
        ORDER BY team, pg.minutes DESC;
    `;
    return result;
};

// get player's averages from given season (undefined if no games played)
const getPlayersSeasonAverages = async (player_id: number, season: string) => {
    const result = await sql`
        SELECT
            pg.player_id, g.season,
            count(*)::int AS games,
            round(avg(pg.minutes), 1)::float8 AS minutes,
            round(avg(pg.pts), 1)::float8 AS pts,
            round(avg(pg.reb), 1)::float8 AS reb,
            round(avg(pg.ast), 1)::float8 AS ast,
            round(avg(pg.stl), 1)::float8 AS stl,
            round(avg(pg.blk), 1)::float8 AS blk,
            round(avg(pg.tov), 1)::float8 AS tov,
            round(avg(pg.fgm), 1)::float8 AS fgm,
            round(avg(pg.fga), 1)::float8 AS fga,
            round(avg(pg.fg3m), 1)::float8 AS fg3m,
            round(avg(pg.fg3a), 1)::float8 AS fg3a,
            round(avg(pg.ftm), 1)::float8 AS ftm,
            round(avg(pg.fta), 1)::float8 AS fta
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        WHERE pg.player_id = ${player_id} AND g.season = ${season}
        GROUP BY pg.player_id, g.season;
    `;
    return result[0];
};

// hit rate of a prop over player's last n games, optionally only against given team
// e.g. stat 'fgm', line 5.5, side 'over' -> how many of the last 10 games had 6+ field goals made
// a value exactly on the line (push) counts as a miss
const getHitRate = async (
    player_id: number,
    stat: string,
    line: number,
    side: "over" | "under",
    limit: number,
    opponent_id?: number,
) => {
    const value = sql.unsafe(STATS[stat]);
    const result = await sql`
        SELECT
            pg.game_id, g.game_date, g.overtime_periods,
            nba_team_abbreviation(pg.opponent_id, g.season) AS opponent, pg.is_home,
            pg.minutes::float8 AS minutes,
            (${value})::int AS value
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        WHERE pg.player_id = ${player_id}
            ${opponent_id ? sql`AND pg.opponent_id = ${opponent_id}` : sql``}
        ORDER BY g.game_date DESC
        LIMIT ${limit};
    `;
    const games = result.map((game) => ({
        game_id: game.game_id as string,
        game_date: game.game_date as Date,
        overtime_periods: game.overtime_periods as number | null,
        opponent: game.opponent as string,
        is_home: game.is_home as boolean,
        minutes: game.minutes as number,
        value: game.value as number,
        hit: side === "over" ? game.value > line : game.value < line,
    }));
    const hits = games.filter((game) => game.hit).length;
    const total = games.reduce((sum, game) => sum + game.value, 0);
    return {
        stat,
        line,
        side,
        games: games.length,
        hits,
        hit_rate: games.length ? Math.round((hits / games.length) * 1000) / 10 : null,  // percent, 1 decimal
        average: games.length ? Math.round((total / games.length) * 10) / 10 : null,
        results: games,
    };
};

// hits, hit rate (percent, 1 decimal) and average of a group of games, a push counts as a miss
const summarize = (
    key: string,
    label: string,
    values: number[],
    line: number,
    side: "over" | "under",
) => {
    const hits = values.filter((v) => side === "over" ? v > line : v < line).length;
    const total = values.reduce((sum, v) => sum + v, 0);
    return {
        key,
        label,
        games: values.length,
        hits,
        hit_rate: values.length ? Math.round((hits / values.length) * 1000) / 10 : null,
        average: values.length ? Math.round((total / values.length) * 10) / 10 : null,
    };
};

// season before the given one ('2025-26' -> '2024-25')
const seasonBefore = (season: string) => {
    const startYear = Number(season.slice(0, 4)) - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// the same prop over different samples: recent form, this season, home/away, big minutes,
// last season and (with opponent_id) the latest games against that team from every season
// before = only games before that date (a parlay leg's game), with that game's season as 'this season'
const getHitRateSplits = async (
    player_id: number,
    stat: string,
    line: number,
    side: "over" | "under",
    opponent_id?: number,
    before?: { date: string, season: string },
) => {
    const value = sql.unsafe(STATS[stat]);
    const season = before?.season ?? currentSeason();
    const lastSeason = before ? seasonBefore(before.season) : previousSeason();
    const beforeDate = before ? sql`AND g.game_date < ${before.date}::date` : sql``;

    // the season's and the previous season's games, latest first
    const games = await sql`
        SELECT g.season, pg.is_home, pg.minutes::float8 AS minutes, (${value})::int AS value
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        WHERE pg.player_id = ${player_id} AND g.season BETWEEN ${lastSeason} AND ${season} ${beforeDate}
        ORDER BY g.game_date DESC;
    `;
    const thisSeason = games.filter((g) => g.season === season);
    const values = (list: postgres.Row[]) => list.map((g) => g.value as number);

    const splits = [
        summarize("last5", "Last 5", values(games.slice(0, 5)), line, side),
        summarize("last10", "Last 10", values(games.slice(0, 10)), line, side),
        summarize("last20", "Last 20", values(games.slice(0, 20)), line, side),
        summarize("season", `${season} season`, values(thisSeason), line, side),
        summarize("home", `Home (${season})`, values(thisSeason.filter((g) => g.is_home)), line, side),
        summarize("away", `Away (${season})`, values(thisSeason.filter((g) => !g.is_home)), line, side),
        summarize("minutes30", `30+ min (${season})`, values(thisSeason.filter((g) => g.minutes >= 30)), line, side),
        summarize("lastSeason", `${lastSeason} season`, values(games.filter((g) => g.season === lastSeason)), line, side),
    ];

    if (opponent_id) {
        const vs = await sql`
            SELECT (${value})::int AS value, nba_team_abbreviation(pg.opponent_id, ${season}) AS opponent
            FROM nba_player_game pg
            JOIN nba_game g ON g.id = pg.game_id
            WHERE pg.player_id = ${player_id} AND pg.opponent_id = ${opponent_id} ${beforeDate}
            ORDER BY g.game_date DESC
            LIMIT 10;
        `;
        // the label uses the opponent's current abbreviation
        const opponent = vs[0]?.opponent ?? "opponent";
        splits.push(summarize("opponent", `vs ${opponent} (last 10)`, vs.map((g) => g.value as number), line, side));
    }

    return { stat, line, side, splits };
};

export {
    getHitRateSplits,
    STATS,
    isStat,
    getPlayersGames,
    getPlayersLastGames,
    getPlayersLastGamesVsOpponent,
    getGameBoxScore,
    getPlayersSeasonAverages,
    getHitRate,
};
