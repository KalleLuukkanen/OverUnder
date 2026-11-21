import { Request, Response } from "express";
import * as nbaSeasonRepository from "../../repositories/nba/nbaSeasonRepository.js";

// current season's standings, best record first
const getStandings = async (req: Request, res: Response) => {
    const standings = await nbaSeasonRepository.getStandings();
    return res.status(200).json(standings);
};

// current season's league leaders per stat
const getLeaders = async (req: Request, res: Response) => {
    const leaders = await nbaSeasonRepository.getLeaders();
    return res.status(200).json(leaders);
};

// one player's current season averages and their rank in the leader stats (404 if no games this season)
const getPlayerSeason = async (req: Request, res: Response) => {
    const player_id = Number(req.params.playerId);
    if (!Number.isInteger(player_id)) {
        return res.status(400).json({ error: "Missing or invalid player id" });
    }
    const season = await nbaSeasonRepository.getPlayerSeason(player_id);
    if (!season) {
        return res.status(404).json({ error: "No regular season games this season" });
    }
    return res.status(200).json(season);
};

export {
    getStandings,
    getLeaders,
    getPlayerSeason,
};
