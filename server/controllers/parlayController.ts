import { Request, Response, NextFunction } from "express";
import * as parlayRepository from "../repositories/parlayRepository.js";
import { isStat } from "../repositories/nba/nbaPlayerGamesRepository.js";
import { isMarket, MARKETS } from "../repositories/nba/nbaTeamPropsRepository.js";

const MAX_PARLAYS = 100;
const MAX_LEGS = 15;
const MAX_NAME = 60;

// signed in user's id, set by the session middleware in app.ts
const userIdOf = (req: Request) => (req as Request & { userId?: string }).userId as string;

// parlays are a member feature: every /api/parlays route needs a session
const requireUser = (req: Request, res: Response, next: NextFunction) => {
    if (!(req as Request & { userId?: string }).userId) {
        return res.status(401).json({ error: "Sign in to use parlays" });
    }
    return next();
};

// name: 1-60 characters after trimming, returns the trimmed name or null if invalid
const readName = (value: unknown) => {
    if (typeof value !== "string") return null;
    const name = value.trim();
    return name.length >= 1 && name.length <= MAX_NAME ? name : null;
};

// odds: decimal odds 1.01-10000, null/"" = no odds, returns undefined if invalid
const readOdds = (value: unknown): number | null | undefined => {
    if (value === null || value === "") return null;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 1.01 || value > 10000) return undefined;
    return Math.round(value * 100) / 100;
};

// parlay id from the url, checked to belong to the user; sends the error and returns null otherwise
const ownedParlayId = async (req: Request, res: Response) => {
    const parlay_id = Number(req.params.parlayId);
    if (!Number.isInteger(parlay_id)) {
        res.status(400).json({ error: "Invalid parlay id" });
        return null;
    }
    // another user's parlay looks the same as a missing one
    if (!(await parlayRepository.isOwner(parlay_id, userIdOf(req)))) {
        res.status(404).json({ error: "Parlay not found" });
        return null;
    }
    return parlay_id;
};

// all of the user's parlays with legs, results and hit rates
const getParlays = async (req: Request, res: Response) => {
    const parlays = await parlayRepository.getParlays(userIdOf(req));
    return res.status(200).json(parlays);
};

// new empty parlay, body: { name, odds? }
const createParlay = async (req: Request, res: Response) => {
    const name = readName(req.body?.name);
    if (!name) {
        return res.status(400).json({ error: `Name must be 1-${MAX_NAME} characters` });
    }
    const odds = readOdds(req.body?.odds ?? null);
    if (odds === undefined) {
        return res.status(400).json({ error: "Invalid odds, expected decimal odds like 6.50" });
    }
    if (await parlayRepository.countParlays(userIdOf(req)) >= MAX_PARLAYS) {
        return res.status(400).json({ error: `You can have at most ${MAX_PARLAYS} parlays` });
    }
    const id = await parlayRepository.createParlay(userIdOf(req), name, odds);
    return res.status(201).json({ id });
};

// rename and/or set the odds, body: { name?, odds? } (odds null removes them)
const updateParlay = async (req: Request, res: Response) => {
    const parlay_id = await ownedParlayId(req, res);
    if (parlay_id === null) return;
    let name: string | undefined;
    if (req.body?.name !== undefined) {
        const valid = readName(req.body.name);
        if (!valid) {
            return res.status(400).json({ error: `Name must be 1-${MAX_NAME} characters` });
        }
        name = valid;
    }
    let odds: number | null | undefined;
    if (req.body && "odds" in req.body) {
        odds = readOdds(req.body.odds);
        if (odds === undefined) {
            return res.status(400).json({ error: "Invalid odds, expected decimal odds like 6.50" });
        }
    }
    await parlayRepository.updateParlay(parlay_id, name, odds);
    return res.status(204).end();
};

const deleteParlay = async (req: Request, res: Response) => {
    const parlay_id = await ownedParlayId(req, res);
    if (parlay_id === null) return;
    await parlayRepository.deleteParlay(parlay_id);
    return res.status(204).end();
};

// add a player prop { player_id, stat, line, side, odds? } or a team bet { team_id, market, line?, side?, odds? },
// tied to the player's / team's next game. Legs that clash with one already in the parlay are refused
const addLeg = async (req: Request, res: Response) => {
    const parlay_id = await ownedParlayId(req, res);
    if (parlay_id === null) return;
    const body = req.body ?? {};
    const isTeam = body.team_id !== undefined;

    if (isTeam) {
        if (!Number.isInteger(body.team_id) || !(await parlayRepository.teamExists(body.team_id))) {
            return res.status(400).json({ error: "Missing or invalid team" });
        }
        if (typeof body.market !== "string" || !isMarket(body.market)) {
            return res.status(400).json({ error: "Invalid bet" });
        }
    } else {
        if (!Number.isInteger(body.player_id) || !(await parlayRepository.playerExists(body.player_id))) {
            return res.status(400).json({ error: "Missing or invalid player" });
        }
        if (typeof body.stat !== "string" || !isStat(body.stat)) {
            return res.status(400).json({ error: "Invalid stat" });
        }
    }

    // win has no line or side, spread has a line (can be negative) but no side
    const rules = isTeam ? MARKETS[body.market as keyof typeof MARKETS] : { line: true, side: true };
    const line = rules.line ? body.line : 0;
    const minLine = isTeam && body.market === "spread" ? -999 : 0;
    if (typeof line !== "number" || !Number.isFinite(line) || line < minLine || line > 999) {
        return res.status(400).json({ error: "Missing or invalid line" });
    }
    const side = rules.side ? body.side : "over";
    if (side !== "over" && side !== "under") {
        return res.status(400).json({ error: "Invalid side, expected 'over' or 'under'" });
    }
    const odds = readOdds(body.odds ?? null);
    if (odds === undefined) {
        return res.status(400).json({ error: "Invalid odds, expected decimal odds like 1.85" });
    }
    if (await parlayRepository.countLegs(parlay_id) >= MAX_LEGS) {
        return res.status(400).json({ error: `A parlay can have at most ${MAX_LEGS} legs` });
    }

    const result = isTeam ?
        await parlayRepository.addTeamLeg(parlay_id, body.team_id, body.market, line, side, odds) :
        await parlayRepository.addLeg(parlay_id, body.player_id, body.stat, line, side, odds);
    if ("error" in result) {
        return res.status(400).json({ error: result.error });
    }
    return res.status(201).json({ id: result.id });
};

const deleteLeg = async (req: Request, res: Response) => {
    const parlay_id = await ownedParlayId(req, res);
    if (parlay_id === null) return;
    const leg_id = Number(req.params.legId);
    if (!Number.isInteger(leg_id) || !(await parlayRepository.deleteLeg(parlay_id, leg_id))) {
        return res.status(404).json({ error: "Leg not found" });
    }
    return res.status(204).end();
};

export {
    requireUser,
    getParlays,
    createParlay,
    updateParlay,
    deleteParlay,
    addLeg,
    deleteLeg,
};
