import postgres from "postgres";
import { getHitRateSplits } from "./nba/nbaPlayerGamesRepository.js";
import { getTeamHitRateSplits, isHit, MARKETS, type Market, type TeamGameRow } from "./nba/nbaTeamPropsRepository.js";
import { estimate, type Estimate } from "../estimate.js";
import { Scorer } from "../calibration.js";

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

// grades a team bet from its game's score and team box scores
// a spread or total exactly on the line is a push; a missing team box score keeps the leg pending
const gradeTeamLeg = (leg: postgres.Row): { status: LegStatus, value: number | null } => {
    if (!leg.game_id) return { status: "no_game", value: null };
    if (leg.home_score === null) return { status: "pending", value: null };
    const market = leg.market as Market;
    const isHome = leg.team_id === leg.home_team_id;
    const row = {
        team_score: isHome ? leg.home_score : leg.away_score,
        opp_score: isHome ? leg.away_score : leg.home_score,
        team_fg3m: leg.team_fg3m,
        team_reb: leg.team_reb,
        h1_total: leg.h1_total,
    } as TeamGameRow;
    const value = MARKETS[market].value(row);
    if (value === null) return { status: "pending", value: null };
    if (market === "spread" ? value + leg.line === 0 : market !== "win" && value === leg.line) return { status: "push", value };
    return { status: isHit(market, value, leg.line, leg.side) ? "hit" : "miss", value };
};

// parlay result from its legs: any miss loses it, it's won when every leg is settled and one hit
// (void and push legs drop out of the parlay like at a bookmaker)
const gradeParlay = (statuses: LegStatus[]) => {
    if (statuses.length === 0) return "empty";
    if (statuses.includes("miss")) return "lost";
    if (statuses.some((s) => s === "pending" || s === "no_game")) return "pending";
    return statuses.includes("hit") ? "won" : "void";
};

type HitRate = { hits: number, games: number, hit_rate: number | null, average: number | null };
type LegSplits = {
    hit_rates: { last5: HitRate | null, last10: HitRate | null, season: HitRate | null, opponent: HitRate | null };
    estimate: Estimate;
};

// a settled leg's hit rates and estimate never change (they only count games before its game),
// so they're kept here by leg id instead of being counted again on every request
const settledSplits = new Map<number, LegSplits>();

// the hit rates (last 5 / 10, season, vs opponent) of a leg as they were before its game, with its estimate
const legSplits = async (leg: postgres.Row, isTeam: boolean, opponent_id: number | null, opponent: string | null): Promise<LegSplits> => {
    const before = leg.game_id ? { date: leg.game_day as string, season: leg.season as string } : undefined;
    const splits = isTeam ?
        await getTeamHitRateSplits(leg.team_id, leg.market as Market, leg.line, leg.side as Side, opponent_id ?? undefined, before) :
        await getHitRateSplits(leg.player_id, leg.stat, leg.line, leg.side as Side, opponent_id ?? undefined, before);
    const rate = (key: string) => splits.splits.find((s) => s.key === key) ?? null;
    const hit_rates = { last5: rate("last5"), last10: rate("last10"), season: rate("season"), opponent: rate("opponent") };
    return {
        hit_rates,
        estimate: estimate([
            { key: "last10", label: "Last 10", sample: hit_rates.last10 },
            { key: "season", label: "Season", sample: hit_rates.season },
            { key: "opponent", label: opponent ? `vs ${opponent}` : "vs opponent", sample: hit_rates.opponent },
        ]),
    };
};

// legs matching the condition with the game, the result once played, the hit rates and the estimate
const loadLegs = async (where: postgres.PendingQuery<postgres.Row[]>) => {
    const legs = await sql`
        SELECT
            l.id, l.parlay_id, pr.user_id, l.player_id, p.name AS player_name, l.stat, l.market, l.line::float8 AS line, l.side, l.odds::float8 AS odds, l.game_id,
            g.game_date, g.game_date::text AS game_day, g.season, g.start_time, g.home_score, g.away_score, g.overtime_periods,
            g.home_team_id, nba_team_abbreviation(g.home_team_id, g.season) AS home_team,
            g.away_team_id, nba_team_abbreviation(g.away_team_id, g.season) AS away_team,
            -- team bet: the bet's team; player prop: the player's team in that game
            -- (from the box score once played, otherwise their current team)
            COALESCE(l.team_id, pg.team_id, p.team_id) AS team_id,
            nba_team_abbreviation(l.team_id, g.season) AS team, nba_team_name(l.team_id, g.season) AS team_name,
            pg.minutes::float8 AS minutes, pg.pts, pg.reb, pg.ast, pg.stl, pg.blk, pg.tov,
            pg.fgm, pg.fga, pg.fg3m, pg.fg3a, pg.ftm, pg.fta,
            tg.fg3m AS team_fg3m, tg.reb AS team_reb, tg.q1 + tg.q2 + og.q1 + og.q2 AS h1_total
        FROM parlay_leg l
        JOIN parlay pr ON pr.id = l.parlay_id
        LEFT JOIN nba_player p ON p.id = l.player_id
        LEFT JOIN nba_game g ON g.id = l.game_id
        LEFT JOIN nba_player_game pg ON pg.game_id = l.game_id AND pg.player_id = l.player_id
        LEFT JOIN nba_team_game tg ON tg.game_id = l.game_id AND tg.team_id = l.team_id
        LEFT JOIN nba_team_game og ON og.game_id = l.game_id AND l.team_id IS NOT NULL AND og.team_id <> l.team_id
        WHERE ${where}
        ORDER BY l.created_at;
    `;

    return Promise.all(legs.map(async (leg) => {
        const isTeam = leg.market !== null;
        const { status, value } = isTeam ? gradeTeamLeg(leg) : gradeLeg(leg);
        const isHome = leg.game_id ? leg.team_id === leg.home_team_id : null;
        const opponent_id = leg.game_id ? (isHome ? leg.away_team_id : leg.home_team_id) : null;
        const opponent = leg.game_id ? (isHome ? leg.away_team : leg.home_team) as string : null;
        const settled = status !== "pending" && status !== "no_game";
        const splits = (settled && settledSplits.get(leg.id)) || await legSplits(leg, isTeam, opponent_id, opponent);
        if (settled) settledSplits.set(leg.id, splits);
        // what the leg is about: a player's stat or a team's bet
        const subject = isTeam ? {
            kind: "team" as const,
            team_id: leg.team_id as number,
            team: leg.team as string,
            team_name: leg.team_name as string,
            market: leg.market as Market,
            // the final score from the team's side, once played
            score: leg.home_score === null || !leg.game_id ? null : {
                team: (isHome ? leg.home_score : leg.away_score) as number,
                opponent: (isHome ? leg.away_score : leg.home_score) as number,
            },
        } : {
            kind: "player" as const,
            player_id: leg.player_id as number,
            player_name: leg.player_name as string,
            stat: leg.stat as string,
            minutes: leg.minutes as number | null,
        };
        return {
            id: leg.id as number,
            parlay_id: leg.parlay_id as number,
            user_id: leg.user_id as string,
            ...subject,
            line: leg.line as number,
            side: leg.side as Side,
            odds: leg.odds as number | null,
            game: leg.game_id ? {
                id: leg.game_id as string,
                game_date: leg.game_date as Date,
                start_time: leg.start_time as Date | null,
                is_home: isHome,
                opponent: opponent as string,
                opponent_id,
            } : null,
            status,
            value,
            ...splits,
        };
    }));
};

// every parlay of the user with its legs, newest first
// legs come with the game, the result once played, the prop's hit rates (last 5 / 10, season, vs opponent)
// and the estimated chance before the game
const getParlays = async (user_id: string) => {
    const parlays = await sql`
        SELECT id, name, odds::float8 AS odds, created_at
        FROM parlay
        WHERE user_id = ${user_id}
        ORDER BY created_at DESC;
    `;
    if (parlays.length === 0) return [];

    const legs = (await loadLegs(sql`l.parlay_id IN ${sql(parlays.map((p) => p.id))}`))
        // the user id is only needed for the accuracy report
        .map(({ user_id: _, ...leg }) => leg);

    return parlays.map((p) => {
        const parlayLegs = legs.filter((l) => l.parlay_id === p.id);
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

// how the estimates of real parlay legs did: every member's hit or missed legs, and the user's own (when signed in)
// the same bet in several parlays counts once (per user), pushes and DNPs are left out
// with odds: the bookmaker's implied chance scored the same way, and the return of 1 unit on each leg
// (all of them, and only the ones the estimate saw value in)
const getLegsCalibration = async (user_id?: string) => {
    const legs = await loadLegs(sql`g.home_score IS NOT NULL`);
    const seen = new Set<string>();
    const settled = legs.filter((l) => {
        if ((l.status !== "hit" && l.status !== "miss") || l.estimate.chance === null) return false;
        const subject = l.kind === "player" ? `p${l.player_id}:${l.stat}` : `t${l.team_id}:${l.market}`;
        const key = `${l.user_id}:${l.game?.id}:${subject}:${l.line}:${l.side}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const report = (list: typeof settled) => {
        const ours = new Scorer(0.1);
        const withOdds = list.filter((l) => l.odds !== null);
        const oursWithOdds = new Scorer(0.1);
        const bookmaker = new Scorer(0.1);
        let returned = 0;
        let valueBets = 0;
        let valueReturned = 0;
        for (const l of list) {
            const chance = l.estimate.chance as number;
            const hit = l.status === "hit";
            ours.add(chance, hit);
            if (l.odds === null) continue;
            oursWithOdds.add(chance, hit);
            bookmaker.add(Math.min(1 / l.odds, 1), hit);
            const profit = hit ? l.odds - 1 : -1;
            returned += profit;
            // the estimate saw value: chance x odds above 1
            if (chance * l.odds > 1) {
                valueBets++;
                valueReturned += profit;
            }
        }
        const round = (value: number) => Math.round(value * 10000) / 10000;
        return {
            ...ours.score(),
            odds: withOdds.length === 0 ? null : {
                legs: withOdds.length,
                brier: oursWithOdds.brier() === null ? null : round(oursWithOdds.brier() as number),
                bookmaker_brier: bookmaker.brier() === null ? null : round(bookmaker.brier() as number),
                roi: round(returned / withOdds.length),
                value_legs: valueBets,
                value_roi: valueBets ? round(valueReturned / valueBets) : null,
            },
        };
    };

    return {
        all: report(settled),
        mine: user_id ? report(settled.filter((l) => l.user_id === user_id)) : null,
    };
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

// team's next game that hasn't started yet, null if none scheduled
const nextGameOfTeam = async (team_id: number) => {
    const result = await sql`
        SELECT g.id
        FROM nba_game g
        WHERE ${team_id} IN (g.home_team_id, g.away_team_id) AND g.home_score IS NULL
            AND COALESCE(g.start_time > now(), g.game_date >= current_date)
        ORDER BY g.game_date, g.start_time
        LIMIT 1;
    `;
    return (result[0]?.id as string | undefined) ?? null;
};

const teamExists = async (team_id: number) => {
    const result = await sql`SELECT 1 FROM nba_team WHERE id = ${team_id};`;
    return result.length > 0;
};

// a leg as the parlay rules see it: the game and either the player's stat or the team's bet
type RuleLeg = {
    game_id: string;
    home_team_id: number;
    away_team_id: number;
    player_id: number | null;
    stat: string | null;
    team_id: number | null;
    market: string | null;
};

// parlay rules like at bookmakers: legs on the same outcome of one game can't be combined,
// since they either contradict each other (over and under) or depend on each other (moneyline and spread)
// a leg's key and the reason it's blocked: two legs with the same key don't go in the same parlay
const ruleOf = (leg: RuleLeg) => {
    const game = leg.game_id;
    if (leg.player_id !== null) {
        return { key: `player:${game}:${leg.player_id}:${leg.stat}`, reason: "This player already has a prop on that stat for the same game in this parlay" };
    }
    const other = leg.team_id === leg.home_team_id ? leg.away_team_id : leg.home_team_id;
    switch (leg.market) {
        case "win":
        case "spread":
            return { key: `result:${game}`, reason: "A parlay can have only one moneyline or spread bet per game (on either team)" };
        case "total":
            return { key: `total:${game}`, reason: "This game's total is already in this parlay" };
        case "h1_total":
            return { key: `h1_total:${game}`, reason: "This game's 1st half total is already in this parlay" };
        // a team's points and its opponent's 'opponent points' are the same number
        case "team_pts":
            return { key: `points:${game}:${leg.team_id}`, reason: "This team's points in that game are already in this parlay" };
        case "opp_pts":
            return { key: `points:${game}:${other}`, reason: "This team's points in that game are already in this parlay" };
        default:
            return { key: `${leg.market}:${game}:${leg.team_id}`, reason: "This team already has that bet for the same game in this parlay" };
    }
};

// the reason the new leg can't join the parlay, null if it's allowed
const ruleConflict = async (parlay_id: number, newLeg: Omit<RuleLeg, "home_team_id" | "away_team_id">) => {
    const games = await sql`SELECT home_team_id, away_team_id FROM nba_game WHERE id = ${newLeg.game_id};`;
    const rule = ruleOf({ ...newLeg, home_team_id: games[0].home_team_id, away_team_id: games[0].away_team_id });
    const legs = await sql`
        SELECT l.game_id, g.home_team_id, g.away_team_id, l.player_id, l.stat, l.team_id, l.market
        FROM parlay_leg l
        JOIN nba_game g ON g.id = l.game_id
        WHERE l.parlay_id = ${parlay_id};
    `;
    const clash = legs.some((l) => ruleOf(l as unknown as RuleLeg).key === rule.key);
    return clash ? rule.reason : null;
};

// adds a player prop to the parlay, tied to the player's next game (odds = the leg's decimal odds, optional)
// returns the new id, or the reason it can't be added
const addLeg = async (parlay_id: number, player_id: number, stat: string, line: number, side: Side, odds: number | null) => {
    const game_id = await nextGameOfPlayer(player_id);
    if (!game_id) return { error: "This player has no upcoming game to bet on" };
    const conflict = await ruleConflict(parlay_id, { game_id, player_id, stat, team_id: null, market: null });
    if (conflict) return { error: conflict };
    const result = await sql`
        INSERT INTO parlay_leg (parlay_id, player_id, game_id, stat, line, side, odds)
        VALUES (${parlay_id}, ${player_id}, ${game_id}, ${stat}, ${line}, ${side}, ${odds})
        RETURNING id;
    `;
    return { id: result[0].id as number };
};

// adds a team bet to the parlay, tied to the team's next game (odds = the leg's decimal odds, optional)
// returns the new id, or the reason it can't be added
const addTeamLeg = async (parlay_id: number, team_id: number, market: Market, line: number, side: Side, odds: number | null) => {
    const game_id = await nextGameOfTeam(team_id);
    if (!game_id) return { error: "This team has no upcoming game to bet on" };
    const conflict = await ruleConflict(parlay_id, { game_id, player_id: null, stat: null, team_id, market });
    if (conflict) return { error: conflict };
    const result = await sql`
        INSERT INTO parlay_leg (parlay_id, team_id, game_id, market, line, side, odds)
        VALUES (${parlay_id}, ${team_id}, ${game_id}, ${market}, ${line}, ${side}, ${odds})
        RETURNING id;
    `;
    return { id: result[0].id as number };
};

// removes a leg, false if it isn't in that parlay
const deleteLeg = async (parlay_id: number, leg_id: number) => {
    const result = await sql`DELETE FROM parlay_leg WHERE id = ${leg_id} AND parlay_id = ${parlay_id} RETURNING id;`;
    return result.length > 0;
};

export {
    getParlays,
    getLegsCalibration,
    countParlays,
    createParlay,
    isOwner,
    updateParlay,
    deleteParlay,
    countLegs,
    playerExists,
    teamExists,
    addLeg,
    addTeamLeg,
    deleteLeg,
};
