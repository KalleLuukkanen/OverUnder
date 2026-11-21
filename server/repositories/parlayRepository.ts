import postgres from "postgres";
import { getHitRateSplits } from "./nba/nbaPlayerGamesRepository.js";

const sql = postgres();

type Side = "over" | "under";

// leg result: pending = game not played yet, no_game = player had no game scheduled when added,
// void = game played but the player didn't play, push = exactly on the line
type LegStatus = "pending" | "no_game" | "hit" | "miss" | "push" | "void";

// a stat's value from a box score row, combos added up like in the hit rate api
const statValue = (stat: string, row: postgres.Row) => {
    switch (stat) {
        case "pra": return row.pts + row.reb + row.ast;
        case "pr": return row.pts + row.reb;
        case "pa": return row.pts + row.ast;
        case "ra": return row.reb + row.ast;
        case "stocks": return row.stl + row.blk;
        default: return row[stat] as number;
    }
};

// grades a leg from its game's box score row (undefined = player has no box score line in that game)
const gradeLeg = (leg: postgres.Row): { status: LegStatus, value: number | null } => {
    if (!leg.game_id) return { status: "no_game", value: null };
    if (leg.home_score === null) return { status: "pending", value: null };
    if (leg.pts === null) return { status: "void", value: null };
    const value = statValue(leg.stat, leg);
    if (value === leg.line) return { status: "push", value };
    const over = value > leg.line;
    return { status: (leg.side === "over") === over ? "hit" : "miss", value };
};

// parlay result from its legs: any miss loses it, it's won when every leg is settled and one hit
// (void and push legs drop out of the parlay like at a bookmaker)
const gradeParlay = (statuses: LegStatus[]) => {
    if (statuses.length === 0) return "empty";
    if (statuses.includes("miss")) return "lost";
    if (statuses.some((s) => s === "pending" || s === "no_game")) return "pending";
    return statuses.includes("hit") ? "won" : "void";
};

// every parlay of the user with its legs, newest first
// legs come with the game, the result once played and the prop's hit rates (last 5 / 10, season, vs opponent)
const getParlays = async (user_id: string) => {
    const parlays = await sql`
        SELECT id, name, odds::float8 AS odds, created_at
        FROM parlay
        WHERE user_id = ${user_id}
        ORDER BY created_at DESC;
    `;
    if (parlays.length === 0) return [];

    const legs = await sql`
        SELECT
            l.id, l.parlay_id, l.player_id, p.name AS player_name, l.stat, l.line::float8 AS line, l.side, l.game_id,
            g.game_date, g.game_date::text AS game_day, g.season, g.start_time, g.home_score, g.away_score, g.overtime_periods,
            g.home_team_id, nba_team_abbreviation(g.home_team_id, g.season) AS home_team,
            g.away_team_id, nba_team_abbreviation(g.away_team_id, g.season) AS away_team,
            -- the player's team in that game: from the box score once played, otherwise their current team
            COALESCE(pg.team_id, p.team_id) AS team_id,
            pg.minutes::float8 AS minutes, pg.pts, pg.reb, pg.ast, pg.stl, pg.blk, pg.tov,
            pg.fgm, pg.fga, pg.fg3m, pg.fg3a, pg.ftm, pg.fta
        FROM parlay_leg l
        JOIN nba_player p ON p.id = l.player_id
        LEFT JOIN nba_game g ON g.id = l.game_id
        LEFT JOIN nba_player_game pg ON pg.game_id = l.game_id AND pg.player_id = l.player_id
        WHERE l.parlay_id IN ${sql(parlays.map((p) => p.id))}
        ORDER BY l.created_at;
    `;

    const gradedLegs = await Promise.all(legs.map(async (leg) => {
        const { status, value } = gradeLeg(leg);
        const isHome = leg.game_id ? leg.team_id === leg.home_team_id : null;
        const opponent_id = leg.game_id ? (isHome ? leg.away_team_id : leg.home_team_id) : null;
        // hit rates as they were before the leg's game, so a played leg keeps its pre-game estimate
        const before = leg.game_id ? { date: leg.game_day as string, season: leg.season as string } : undefined;
        const splits = await getHitRateSplits(leg.player_id, leg.stat, leg.line, leg.side as Side, opponent_id ?? undefined, before);
        // only the samples shown with a leg
        const rate = (key: string) => splits.splits.find((s) => s.key === key) ?? null;
        return {
            id: leg.id as number,
            parlay_id: leg.parlay_id as number,
            player_id: leg.player_id as number,
            player_name: leg.player_name as string,
            stat: leg.stat as string,
            line: leg.line as number,
            side: leg.side as Side,
            game: leg.game_id ? {
                id: leg.game_id as string,
                game_date: leg.game_date as Date,
                start_time: leg.start_time as Date | null,
                is_home: isHome,
                opponent: (isHome ? leg.away_team : leg.home_team) as string,
                opponent_id,
            } : null,
            status,
            value,
            minutes: leg.minutes as number | null,
            hit_rates: {
                last5: rate("last5"),
                last10: rate("last10"),
                season: rate("season"),
                opponent: rate("opponent"),
            },
        };
    }));

    return parlays.map((p) => {
        const parlayLegs = gradedLegs.filter((l) => l.parlay_id === p.id);
        return {
            id: p.id as number,
            name: p.name as string,
            odds: p.odds as number | null,
            created_at: p.created_at as Date,
            status: gradeParlay(parlayLegs.map((l) => l.status)),
            legs: parlayLegs,
        };
    });
};

// how many parlays the user has, used for the per user limit
const countParlays = async (user_id: string) => {
    const result = await sql`SELECT count(*)::int AS count FROM parlay WHERE user_id = ${user_id};`;
    return result[0].count as number;
};

const createParlay = async (user_id: string, name: string, odds: number | null) => {
    const result = await sql`
        INSERT INTO parlay (user_id, name, odds)
        VALUES (${user_id}, ${name}, ${odds})
        RETURNING id;
    `;
    return result[0].id as number;
};

// true if the parlay exists and belongs to the user (every change checks this first)
const isOwner = async (parlay_id: number, user_id: string) => {
    const result = await sql`SELECT 1 FROM parlay WHERE id = ${parlay_id} AND user_id = ${user_id};`;
    return result.length > 0;
};

// changes name and/or odds, undefined = keep, odds null = remove
const updateParlay = async (parlay_id: number, name: string | undefined, odds: number | null | undefined) => {
    await sql`
        UPDATE parlay SET
            name = COALESCE(${name ?? null}, name),
            odds = ${odds === undefined ? sql`odds` : odds}
        WHERE id = ${parlay_id};
    `;
};

const deleteParlay = async (parlay_id: number) => {
    await sql`DELETE FROM parlay WHERE id = ${parlay_id};`;
};

const countLegs = async (parlay_id: number) => {
    const result = await sql`SELECT count(*)::int AS count FROM parlay_leg WHERE parlay_id = ${parlay_id};`;
    return result[0].count as number;
};

// player's team's next game that hasn't started yet, null if none scheduled (or no team)
// start_time when known (game_date is the US date, a day behind UTC for evening games), else the date
const nextGameOfPlayer = async (player_id: number) => {
    const result = await sql`
        SELECT g.id
        FROM nba_player p
        JOIN nba_game g ON p.team_id IN (g.home_team_id, g.away_team_id)
        WHERE p.id = ${player_id} AND g.home_score IS NULL
            AND COALESCE(g.start_time > now(), g.game_date >= current_date)
        ORDER BY g.game_date, g.start_time
        LIMIT 1;
    `;
    return (result[0]?.id as string | undefined) ?? null;
};

const playerExists = async (player_id: number) => {
    const result = await sql`SELECT 1 FROM nba_player WHERE id = ${player_id};`;
    return result.length > 0;
};

// adds a prop to the parlay, tied to the player's next game, null if the player has no upcoming game
const addLeg = async (parlay_id: number, player_id: number, stat: string, line: number, side: Side) => {
    const game_id = await nextGameOfPlayer(player_id);
    if (!game_id) return null;
    const result = await sql`
        INSERT INTO parlay_leg (parlay_id, player_id, game_id, stat, line, side)
        VALUES (${parlay_id}, ${player_id}, ${game_id}, ${stat}, ${line}, ${side})
        RETURNING id;
    `;
    return result[0].id as number;
};

// removes a leg, false if it isn't in that parlay
const deleteLeg = async (parlay_id: number, leg_id: number) => {
    const result = await sql`DELETE FROM parlay_leg WHERE id = ${leg_id} AND parlay_id = ${parlay_id} RETURNING id;`;
    return result.length > 0;
};

export {
    getParlays,
    countParlays,
    createParlay,
    isOwner,
    updateParlay,
    deleteParlay,
    countLegs,
    playerExists,
    addLeg,
    deleteLeg,
};
