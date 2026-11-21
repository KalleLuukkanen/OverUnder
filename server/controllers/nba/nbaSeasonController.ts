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

export {
    getStandings,
    getLeaders,
};
