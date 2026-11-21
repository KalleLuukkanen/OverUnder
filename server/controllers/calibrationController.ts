import { Request, Response } from "express";
import * as calibrationRepository from "../repositories/calibrationRepository.js";
import * as parlayRepository from "../repositories/parlayRepository.js";

// how accurate the estimated chances are: the newest backtest on past seasons, and the real parlay legs
// (every member's, and the user's own when signed in). Open to everyone, the legs only as totals
const getCalibration = async (req: Request, res: Response) => {
    const userId = (req as Request & { userId?: string }).userId;
    const [backtest, legs] = await Promise.all([
        calibrationRepository.getLatestBacktest(),
        parlayRepository.getLegsCalibration(userId),
    ]);
    return res.json({ backtest, legs });
};

export {
    getCalibration,
};
