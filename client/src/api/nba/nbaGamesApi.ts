import { get, post } from "../apiClient";
import type { NbaGame, NbaTeamGameStats } from "../../types/nba";

// seasons that have played games, latest first ('2026-27', '2025-26', ...)
const getSeasons = () =>
    get<string[]>("/api/nba/seasons");

// get one game based on id
const getOne = (gameId: string) =>
    get<NbaGame>(`/api/nba/games/${gameId}`);

// all today's and tomorrow's games
const getUpcomingGames = () =>
    get<NbaGame[]>("/api/nba/games/upcoming");

// all games on given date ('2026-11-14')
const getGamesByDate = (date: string) =>
    post<NbaGame[]>("/api/nba/games/date", { date });

// all games of given season ('2026-27')
const getSeasonAllGames = (season: string) =>
    post<NbaGame[]>("/api/nba/games/season", { season });

// current season's played games, latest first
const getCurrentSeasonPastGames = () =>
    get<NbaGame[]>("/api/nba/games/season/current/past");

// current season's upcoming games, soonest first
const getCurrentSeasonUpcomingGames = () =>
    get<NbaGame[]>("/api/nba/games/season/current/upcoming");

// team's all games from given season (defaults to current season)
const getTeamsGames = (teamId: number, season?: string) =>
    post<NbaGame[]>(`/api/nba/teams/${teamId}/games`, { season });

// team's current season's played games, latest first
const getTeamsPastGames = (teamId: number) =>
    get<NbaGame[]>(`/api/nba/teams/${teamId}/games/past`);

// team's current season's upcoming games, soonest first
const getTeamsUpcomingGames = (teamId: number) =>
    get<NbaGame[]>(`/api/nba/teams/${teamId}/games/upcoming`);

// team's next game (throws ApiError 404 if none scheduled)
const getTeamsNextGame = (teamId: number) =>
    get<NbaGame>(`/api/nba/teams/${teamId}/games/next`);

// played games between two teams, latest first
const getHeadToHeadGames = (teamId: number, opponentId: number) =>
    get<NbaGame[]>(`/api/nba/teams/${teamId}/vs/${opponentId}/games`);

// quarter scores, team stats and records of a played game, [] if not synced yet
const getGameTeamStats = (gameId: string) =>
    get<NbaTeamGameStats[]>(`/api/nba/games/${gameId}/team-stats`);

export {
    getSeasons,
    getGameTeamStats,
    getOne,
    getUpcomingGames,
    getGamesByDate,
    getSeasonAllGames,
    getCurrentSeasonPastGames,
    getCurrentSeasonUpcomingGames,
    getTeamsGames,
    getTeamsPastGames,
    getTeamsUpcomingGames,
    getTeamsNextGame,
    getHeadToHeadGames,
};
