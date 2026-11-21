import express from "express";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import wrap from "./asyncHandler.js";
import * as nbaGamesController from "./controllers/nba/nbaGamesController.js";
import * as nbaTeamsController from "./controllers/nba/nbaTeamsController.js";
import * as nbaPlayersController from "./controllers/nba/nbaPlayersController.js";
import * as nbaPlayerGamesController from "./controllers/nba/nbaPlayerGamesController.js";
import * as nbaSeasonController from "./controllers/nba/nbaSeasonController.js";
import * as nbaTeamPropsController from "./controllers/nba/nbaTeamPropsController.js";
import * as parlayController from "./controllers/parlayController.js";

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(morgan("dev"));

// Auth route must come before express.json() — Better Auth reads the raw body itself
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());


// Attach userId to every request if a valid session exists
app.use(wrap(async (req, res, next) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
        return next();
    }
    (req as any).userId = session.user.id;
    return next();
}));

// routes not protected for now
/*
// Reject unauthenticated requests to protected routes
app.use("/api", (req, res, next) => {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
});
*/

// Example protected route — replace with your own controllers
app.get("/api/me", (req, res) => {
    res.json({ userId: (req as any).userId });
});

// NBA routes. Routes that read req.body are POST, because browsers can't send a body with GET.
// Specific paths (/upcoming, /date...) must come before /:gameId.

// seasons
app.get("/api/nba/seasons", wrap(nbaGamesController.getSeasons));
app.get("/api/nba/season/current/standings", wrap(nbaSeasonController.getStandings));
app.get("/api/nba/season/current/leaders", wrap(nbaSeasonController.getLeaders));

// games
app.get("/api/nba/games/upcoming", wrap(nbaGamesController.getUpcomingGames));
app.post("/api/nba/games/date", wrap(nbaGamesController.getGamesByDate));
app.post("/api/nba/games/season", wrap(nbaGamesController.getSeasonAllGames));
app.get("/api/nba/games/season/current/past", wrap(nbaGamesController.getCurrentSeasonPastGames));
app.get("/api/nba/games/season/current/upcoming", wrap(nbaGamesController.getCurrentSeasonUpcomingGames));
app.get("/api/nba/games/:gameId", wrap(nbaGamesController.getOne));
app.get("/api/nba/games/:gameId/box-score", wrap(nbaPlayerGamesController.getGameBoxScore));
app.get("/api/nba/games/:gameId/team-stats", wrap(nbaGamesController.getGameTeamStats));

// teams
app.get("/api/nba/teams", wrap(nbaTeamsController.getAll));
app.post("/api/nba/teams/abbreviation", wrap(nbaTeamsController.getByAbbreviation));
app.get("/api/nba/teams/:teamId", wrap(nbaTeamsController.getOne));
app.get("/api/nba/teams/:teamId/roster", wrap(nbaTeamsController.getRoster));
app.post("/api/nba/teams/:teamId/games", wrap(nbaGamesController.getTeamsGames));
app.get("/api/nba/teams/:teamId/games/past", wrap(nbaGamesController.getTeamsPastGames));
app.get("/api/nba/teams/:teamId/games/upcoming", wrap(nbaGamesController.getTeamsUpcomingGames));
app.get("/api/nba/teams/:teamId/games/next", wrap(nbaGamesController.getTeamsNextGame));
app.get("/api/nba/teams/:teamId/vs/:opponentId/games", wrap(nbaGamesController.getHeadToHeadGames));
app.post("/api/nba/teams/:teamId/hit-rate", wrap(nbaTeamPropsController.getTeamHitRate));
app.post("/api/nba/teams/:teamId/hit-rate/splits", wrap(nbaTeamPropsController.getTeamHitRateSplits));

// players
app.post("/api/nba/players/name", wrap(nbaPlayersController.getByName));
app.post("/api/nba/players/search", wrap(nbaPlayersController.searchPlayers));
app.get("/api/nba/players/:playerId", wrap(nbaPlayersController.getOne));
app.get("/api/nba/players/:playerId/career", wrap(nbaPlayersController.getPlayersCareer));
app.get("/api/nba/players/:playerId/career-highs", wrap(nbaPlayersController.getPlayersCareerHighs));
app.get("/api/nba/players/:playerId/season", wrap(nbaSeasonController.getPlayerSeason));
app.post("/api/nba/players/:playerId/games", wrap(nbaPlayerGamesController.getPlayersGames));
app.post("/api/nba/players/:playerId/games/last", wrap(nbaPlayerGamesController.getPlayersLastGames));
app.post("/api/nba/players/:playerId/averages", wrap(nbaPlayerGamesController.getPlayersSeasonAverages));
app.post("/api/nba/players/:playerId/hit-rate", wrap(nbaPlayerGamesController.getHitRate));
app.post("/api/nba/players/:playerId/hit-rate/splits", wrap(nbaPlayerGamesController.getHitRateSplits));
app.post("/api/nba/players/:playerId/vs/:opponentId/games", wrap(nbaPlayerGamesController.getPlayersLastGamesVsOpponent));
app.post("/api/nba/players/:playerId/vs/:opponentId/hit-rate", wrap(nbaPlayerGamesController.getHitRate));

// parlays: member feature, every route needs a session and only touches the user's own parlays
app.use("/api/parlays", parlayController.requireUser);
app.get("/api/parlays", wrap(parlayController.getParlays));
app.post("/api/parlays", wrap(parlayController.createParlay));
app.patch("/api/parlays/:parlayId", wrap(parlayController.updateParlay));
app.delete("/api/parlays/:parlayId", wrap(parlayController.deleteParlay));
app.post("/api/parlays/:parlayId/legs", wrap(parlayController.addLeg));
app.delete("/api/parlays/:parlayId/legs/:legId", wrap(parlayController.deleteLeg));

// errors of every route end up here (async ones through wrap): logged, and the client gets a 500
// instead of the server crashing. The four arguments mark it as Express's error handler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: "Something went wrong on the server, please try again" });
});

export default app;