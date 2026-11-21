import { Request, Response } from "express";
import * as nbaPlayersRepository from "../../repositories/nba/nbaPlayersRepository.js";

// get one player based on id
const getOne = async (req: Request, res: Response) => {
    const player_id = Number(req.params.playerId);
    if (!Number.isInteger(player_id)) {
        return res.status(400).json({ error: "Missing or invalid player id" });
    }
    const player = await nbaPlayersRepository.getOne(player_id);
    if (!player) {
        return res.status(404).json({ error: "Player not found" });
    }
    return res.status(200).json(player);
};

// get one player based on exact name, body: { name: 'anthony edwards' }
const getByName = async (req: Request, res: Response) => {
    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Missing name" });
    }
    const player = await nbaPlayersRepository.getByName(name);
    if (!player) {
        return res.status(404).json({ error: "Player not found" });
    }
    return res.status(200).json(player);
};

// search players by part of name, body: { query: 'edwa', limit?: 10 }
const searchPlayers = async (req: Request, res: Response) => {
    const query = req.body?.query;
    if (typeof query !== "string" || query.trim().length < 2) {
        return res.status(400).json({ error: "Search must be at least 2 characters" });
    }
    const limit = req.body?.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({ error: "Invalid limit, expected 1-50" });
    }
    const activeOnly = req.body?.active_only === true;
    const players = await nbaPlayersRepository.searchPlayers(query, limit, activeOnly);
    return res.status(200).json(players);
};

// get player's season by season and career averages, regular season and playoffs separately
const getPlayersCareer = async (req: Request, res: Response) => {
    const player_id = Number(req.params.playerId);
    if (!Number.isInteger(player_id)) {
        return res.status(400).json({ error: "Missing or invalid player id" });
    }
    const [regularSeasons, regularCareer, playoffSeasons, playoffCareer] = await Promise.all([
        nbaPlayersRepository.getPlayersSeasons(player_id, "regular"),
        nbaPlayersRepository.getPlayersCareer(player_id, "regular"),
        nbaPlayersRepository.getPlayersSeasons(player_id, "playoffs"),
        nbaPlayersRepository.getPlayersCareer(player_id, "playoffs"),
    ]);
    return res.status(200).json({
        regular: { seasons: regularSeasons, career: regularCareer ?? null },
        playoffs: { seasons: playoffSeasons, career: playoffCareer ?? null },
    });
};

// player's career highs (best game per stat), regular season and playoffs
const getPlayersCareerHighs = async (req: Request, res: Response) => {
    const player_id = Number(req.params.playerId);
    if (!Number.isInteger(player_id)) {
        return res.status(400).json({ error: "Missing or invalid player id" });
    }
    const [regular, playoffs] = await Promise.all([
        nbaPlayersRepository.getPlayersCareerHighs(player_id, "regular"),
        nbaPlayersRepository.getPlayersCareerHighs(player_id, "playoffs"),
    ]);
    return res.status(200).json({ regular, playoffs });
};

export {
    getPlayersCareerHighs,
    getOne,
    getByName,
    searchPlayers,
    getPlayersCareer,
};
