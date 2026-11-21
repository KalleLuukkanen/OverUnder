import { Request, Response, NextFunction } from "express";
import * as watchlistRepository from "../repositories/watchlistRepository.js";

// signed in user's id, set by the session middleware in app.ts
const userIdOf = (req: Request) => (req as Request & { userId?: string }).userId as string;

// the watchlist is a member feature: every /api/watchlist route needs a session
const requireUser = (req: Request, res: Response, next: NextFunction) => {
    if (!(req as Request & { userId?: string }).userId) {
        return res.status(401).json({ error: "Sign in to use the watchlist" });
    }
    return next();
};

// id from the url, sends 400 and returns null if it isn't a whole number
const readId = (value: string | undefined, res: Response) => {
    const id = Number(value);
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: "Invalid id" });
        return null;
    }
    return id;
};

// the user's watched players and teams with their next games
const getWatchlist = async (req: Request, res: Response) => {
    const watchlist = await watchlistRepository.getWatchlist(userIdOf(req));
    return res.status(200).json(watchlist);
};

// adds a player or a team (kind), already watched is fine
const add = (kind: "player" | "team") => async (req: Request, res: Response) => {
    const id = readId(kind === "player" ? req.params.playerId : req.params.teamId, res);
    if (id === null) return;
    if (await watchlistRepository.countItems(userIdOf(req)) >= watchlistRepository.MAX_ITEMS) {
        return res.status(400).json({ error: `You can watch at most ${watchlistRepository.MAX_ITEMS} players and teams` });
    }
    const found = kind === "player"
        ? await watchlistRepository.addPlayer(userIdOf(req), id)
        : await watchlistRepository.addTeam(userIdOf(req), id);
    if (!found) {
        return res.status(404).json({ error: kind === "player" ? "Player not found" : "Team not found" });
    }
    return res.status(204).end();
};

// removes a player or a team (kind), not watched is fine
const remove = (kind: "player" | "team") => async (req: Request, res: Response) => {
    const id = readId(kind === "player" ? req.params.playerId : req.params.teamId, res);
    if (id === null) return;
    if (kind === "player") await watchlistRepository.removePlayer(userIdOf(req), id);
    else await watchlistRepository.removeTeam(userIdOf(req), id);
    return res.status(204).end();
};

const addPlayer = add("player");
const addTeam = add("team");
const removePlayer = remove("player");
const removeTeam = remove("team");

export {
    requireUser,
    getWatchlist,
    addPlayer,
    addTeam,
    removePlayer,
    removeTeam,
};
