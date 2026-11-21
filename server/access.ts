import { Request, Response } from "express";
import { previousSeason } from "./repositories/nba/nbaGamesRepository.js";

// seasons before the previous one ("past seasons") are for signed up users only,
// the current and previous season (what props are checked with) stay open to everyone

// 'YYYY-YY' season of a game id: 0022600226 -> [3:5] = '26' -> '2026-27' (the league started in 1946)
const seasonOfGameId = (game_id: string) => {
    const yy = Number(game_id.slice(3, 5));
    const startYear = yy >= 46 ? 1900 + yy : 2000 + yy;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// 'YYYY-YY' season of a 'YYYY-MM-DD' date, a season starts in October
const seasonOfDate = (date: string) => {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const startYear = month >= 10 ? year : year - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// season string comparison works because the format is fixed ('1996-97' < '2025-26')
const isOpenSeason = (season: string) => season >= previousSeason();

// true = request may see the season, otherwise a 401 is sent and the caller just returns
const allowSeason = (req: Request, res: Response, season: string) => {
    if (isOpenSeason(season) || (req as Request & { userId?: string }).userId) {
        return true;
    }
    res.status(401).json({ error: `Sign in to see seasons before ${previousSeason()}`, code: "SIGN_IN_FOR_PAST_SEASONS" });
    return false;
};

// oldest season the request may see game by game in lists that span seasons (latest games, hit rates,
// head to head): the previous season when signed out, undefined = every season
const openFrom = (req: Request) => (req as Request & { userId?: string }).userId ? undefined : previousSeason();

export { seasonOfGameId, seasonOfDate, isOpenSeason, allowSeason, openFrom };
