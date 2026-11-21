import postgres from "postgres";
import { currentSeason, previousSeason } from "./nbaGamesRepository.js";
import { splitByPlayers } from "./nbaAbsencesRepository.js";

const sql = postgres();

type Side = "over" | "under";

// one played game of a team with the values the team bets are checked against
type TeamGameRow = {
    game_id: string;
    game_date: Date;
    season: string;
    overtime_periods: number | null;
    is_home: boolean;
    opponent: string;
    team_score: number;
    opp_score: number;
    team_fg3m: number | null;   // from the team box score, null if it's missing
    team_reb: number | null;
    h1_total: number | null;    // both teams' 1st and 2nd quarter points
};

// team bets: the game's value for the bet and whether it uses a line and over / under
// win = moneyline (no line), spread = the team's line added to its margin (e.g. -5.5 = win by 6+)
const MARKETS = {
    win: { value: (g: TeamGameRow) => g.team_score - g.opp_score, line: false, side: false },
    spread: { value: (g: TeamGameRow) => g.team_score - g.opp_score, line: true, side: false },
    team_pts: { value: (g: TeamGameRow) => g.team_score, line: true, side: true },
    opp_pts: { value: (g: TeamGameRow) => g.opp_score, line: true, side: true },
    total: { value: (g: TeamGameRow) => g.team_score + g.opp_score, line: true, side: true },
    h1_total: { value: (g: TeamGameRow) => g.h1_total, line: true, side: true },
    team_fg3m: { value: (g: TeamGameRow) => g.team_fg3m, line: true, side: true },
    team_reb: { value: (g: TeamGameRow) => g.team_reb, line: true, side: true },
} as const;

type Market = keyof typeof MARKETS;

const isMarket = (market: string): market is Market => market in MARKETS;

// did the bet win with this value: win = won the game, spread = margin + line above 0,
// the rest over / under the line (exactly on the line, a push, counts as a miss)
const isHit = (market: Market, value: number, line: number, side: Side) => {
    if (market === "win") return value > 0;
    if (market === "spread") return value + line > 0;
    return side === "over" ? value > line : value < line;
};

// season before the given one ('2025-26' -> '2024-25')
const seasonBefore = (season: string) => {
    const startYear = Number(season.slice(0, 4)) - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// team's played games, latest first: optionally only vs one opponent, from a season on (up to toSeason),
// before a date ('2026-11-19'), or the latest n
const getTeamGames = async (
    team_id: number,
    { opponent_id, fromSeason, toSeason, before, limit }:
        { opponent_id?: number, fromSeason?: string, toSeason?: string, before?: string, limit?: number },
) => {
    const result = await sql`
        SELECT
            g.id AS game_id, g.game_date, g.season, g.overtime_periods,
            g.home_team_id = ${team_id} AS is_home,
            nba_team_abbreviation(CASE WHEN g.home_team_id = ${team_id} THEN g.away_team_id ELSE g.home_team_id END, g.season) AS opponent,
            CASE WHEN g.home_team_id = ${team_id} THEN g.home_score ELSE g.away_score END AS team_score,
            CASE WHEN g.home_team_id = ${team_id} THEN g.away_score ELSE g.home_score END AS opp_score,
            tg.fg3m AS team_fg3m, tg.reb AS team_reb,
            tg.q1 + tg.q2 + og.q1 + og.q2 AS h1_total
        FROM nba_game g
        LEFT JOIN nba_team_game tg ON tg.game_id = g.id AND tg.team_id = ${team_id}
        LEFT JOIN nba_team_game og ON og.game_id = g.id AND og.team_id <> ${team_id}
        WHERE ${team_id} IN (g.home_team_id, g.away_team_id) AND g.home_score IS NOT NULL
            ${opponent_id ? sql`AND ${opponent_id} IN (g.home_team_id, g.away_team_id)` : sql``}
            ${fromSeason ? sql`AND g.season >= ${fromSeason}` : sql``}
            ${toSeason ? sql`AND g.season <= ${toSeason}` : sql``}
            ${before ? sql`AND g.game_date < ${before}::date` : sql``}
        ORDER BY g.game_date DESC
        ${limit ? sql`LIMIT ${limit}` : sql``};
    `;
    return result as unknown as TeamGameRow[];
};

// the bet's value in each game, games without the needed stat left out
const withValues = (market: Market, games: TeamGameRow[]) =>
    games
        .map((g) => ({ game: g, value: MARKETS[market].value(g) }))
        .filter((g): g is { game: TeamGameRow, value: number } => g.value !== null);

// hits, hit rate (percent, 1 decimal) and average of a group of values
const summarize = (market: Market, values: number[], line: number, side: Side) => {
    const hits = values.filter((v) => isHit(market, v, line, side)).length;
    const total = values.reduce((sum, v) => sum + v, 0);
    return {
        games: values.length,
        hits,
        hit_rate: values.length ? Math.round((hits / values.length) * 1000) / 10 : null,
        average: values.length ? Math.round((total / values.length) * 10) / 10 : null,
    };
};

// hit rate of a team bet in the team's latest games (optionally only vs one opponent), game by game
const getTeamHitRate = async (team_id: number, market: Market, line: number, side: Side, limit: number, opponent_id?: number) => {
    // games missing the stat are skipped, so a few extra are fetched
    const games = withValues(market, await getTeamGames(team_id, { opponent_id, limit: limit + 5 })).slice(0, limit);
    return {
        market,
        line,
        side,
        ...summarize(market, games.map((g) => g.value), line, side),
        results: games.map(({ game, value }) => ({
            game_id: game.game_id,
            game_date: game.game_date,
            overtime_periods: game.overtime_periods,
            opponent: game.opponent,
            is_home: game.is_home,
            team_score: game.team_score,
            opp_score: game.opp_score,
            value,
            hit: isHit(market, value, line, side),
        })),
    };
};

// the team bet over different samples: recent form, this season, home / away, last season
// and (with opponent_id) the latest 10 games against that team from every season
// before = only games before that date (a parlay leg's game), with that game's season as 'this season'
const getTeamHitRateSplits = async (
    team_id: number,
    market: Market,
    line: number,
    side: Side,
    opponent_id?: number,
    before?: { date: string, season: string },
) => {
    const season = before?.season ?? currentSeason();
    const lastSeason = before ? seasonBefore(before.season) : previousSeason();
    const games = withValues(market, await getTeamGames(team_id, { fromSeason: lastSeason, toSeason: season, before: before?.date }));
    const thisSeason = games.filter((g) => g.game.season === season);
    const split = (key: string, label: string, list: typeof games) =>
        ({ key, label, ...summarize(market, list.map((g) => g.value), line, side) });

    const splits = [
        split("last5", "Last 5", games.slice(0, 5)),
        split("last10", "Last 10", games.slice(0, 10)),
        split("last20", "Last 20", games.slice(0, 20)),
        split("season", `${season} season`, thisSeason),
        split("home", `Home (${season})`, thisSeason.filter((g) => g.game.is_home)),
        split("away", `Away (${season})`, thisSeason.filter((g) => !g.game.is_home)),
        split("lastSeason", `${lastSeason} season`, games.filter((g) => g.game.season === lastSeason)),
    ];

    if (opponent_id) {
        const vs = withValues(market, await getTeamGames(team_id, { opponent_id, before: before?.date, limit: 15 })).slice(0, 10);
        const opponent = vs[0]?.game.opponent ?? "opponent";
        splits.push(split("opponent", `vs ${opponent} (last 10)`, vs));
    }

    return { market, line, side, splits };
};

// the team bet in games each current rotation player missed vs played, this season and last
// (e.g. the team's points without its star), see splitByPlayers
const getTeamPlayerSplits = async (team_id: number, market: Market, line: number, side: Side) => {
    const seasons = [previousSeason(), currentSeason()];
    const games = withValues(market, await getTeamGames(team_id, { fromSeason: seasons[0], toSeason: seasons[1] }))
        .map(({ game, value }) => ({
            game_id: game.game_id,
            season: game.season,
            day: game.game_date.toISOString().slice(0, 10),
            value,
        }));
    const players = (await splitByPlayers(team_id, games, seasons))
        .map((p) => ({
            id: p.id,
            name: p.name,
            minutes: p.minutes,
            without: summarize(market, p.without, line, side),
            with: summarize(market, p.with, line, side),
        }));
    return { market, line, side, seasons, players };
};

export {
    getTeamPlayerSplits,
    type Market,
    type TeamGameRow,
    MARKETS,
    isMarket,
    isHit,
    getTeamHitRate,
    getTeamHitRateSplits,
};
