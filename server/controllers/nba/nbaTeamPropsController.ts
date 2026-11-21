import { Request, Response } from "express";
import * as nbaTeamPropsRepository from "../../repositories/nba/nbaTeamPropsRepository.js";

const MAX_LIMIT = 100;

// checks the team bet in the request body: { market, line?, side? }, returns an error message or the bet
// win has no line, spread's line can be negative (-5.5), the rest need a line of 0 or more
const readBet = (body: Record<string, unknown> | undefined) => {
    const market = body?.market;
    if (typeof market !== "string" || !nbaTeamPropsRepository.isMarket(market)) {
        return { error: `Invalid market, expected one of: ${Object.keys(nbaTeamPropsRepository.MARKETS).join(", ")}` };
    }
    const rules = nbaTeamPropsRepository.MARKETS[market];
    const line = rules.line ? body?.line : 0;
    if (typeof line !== "number" || !Number.isFinite(line) || (market !== "spread" && line < 0)) {
        return { error: "Missing or invalid line" };
    }
    const side = rules.side ? (body?.side ?? "over") : "over";
    if (side !== "over" && side !== "under") {
        return { error: "Invalid side, expected 'over' or 'under'" };
    }
    return { market, line, side: side as "over" | "under" };
};

// reads the team id param and the optional opponent_id from the body, null if either is invalid
const readTeams = (req: Request) => {
    const team_id = Number(req.params.teamId);
    const opponent_id = req.body?.opponent_id ?? undefined;
    if (!Number.isInteger(team_id) || (opponent_id !== undefined && !Number.isInteger(opponent_id))) return null;
    return { team_id, opponent_id: opponent_id as number | undefined };
};

// hit rate of a team bet in the latest games
// body: { market: 'total', line: 228.5, side?: 'over' | 'under', limit?: 10, opponent_id?: 1610612738 }
const getTeamHitRate = async (req: Request, res: Response) => {
    const teams = readTeams(req);
    if (!teams) {
        return res.status(400).json({ error: "Missing or invalid team or opponent id" });
    }
    const bet = readBet(req.body);
    if ("error" in bet) {
        return res.status(400).json({ error: bet.error });
    }
    const limit = req.body?.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return res.status(400).json({ error: `Invalid limit, expected 1-${MAX_LIMIT}` });
    }
    const hitRate = await nbaTeamPropsRepository.getTeamHitRate(teams.team_id, bet.market, bet.line, bet.side, limit, teams.opponent_id);
    return res.status(200).json(hitRate);
};

// the team bet's hit rate over several samples, body: { market, line?, side?, opponent_id? }
const getTeamHitRateSplits = async (req: Request, res: Response) => {
    const teams = readTeams(req);
    if (!teams) {
        return res.status(400).json({ error: "Missing or invalid team or opponent id" });
    }
    const bet = readBet(req.body);
    if ("error" in bet) {
        return res.status(400).json({ error: bet.error });
    }
    const splits = await nbaTeamPropsRepository.getTeamHitRateSplits(teams.team_id, bet.market, bet.line, bet.side, teams.opponent_id);
    return res.status(200).json(splits);
};

export {
    getTeamHitRate,
    getTeamHitRateSplits,
};
