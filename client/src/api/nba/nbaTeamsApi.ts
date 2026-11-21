import { get, post } from "../apiClient";
import type { NbaRosterPlayer, NbaSide, NbaTeam, NbaTeamHitRate, NbaTeamHitRateSplits, NbaTeamMarket } from "../../types/nba";

// get all teams, alphabetically
// with a season ('2007-08'): only that season's teams, with their names back then
const getAll = (season?: string) =>
    get<NbaTeam[]>(season ? `/api/nba/teams?season=${encodeURIComponent(season)}` : "/api/nba/teams");

// get one team based on id
const getOne = (teamId: number) =>
    get<NbaTeam>(`/api/nba/teams/${teamId}`);

// get one team based on abbreviation ('MIN' or 'min')
const getByAbbreviation = (abbreviation: string) =>
    post<NbaTeam>("/api/nba/teams/abbreviation", { abbreviation });

// get team's current players with season averages, most minutes first
const getRoster = (teamId: number) =>
    get<NbaRosterPlayer[]>(`/api/nba/teams/${teamId}/roster`);

// a team bet in the team's latest games, optionally only vs one opponent
// e.g. getTeamHitRate(1610612747, { market: "total", line: 228.5, side: "over" }) -> Lakers games over 228.5 points
const getTeamHitRate = (
    teamId: number,
    bet: { market: NbaTeamMarket; line: number; side: NbaSide; limit?: number },
    opponentId?: number,
) =>
    post<NbaTeamHitRate>(`/api/nba/teams/${teamId}/hit-rate`, { ...bet, opponent_id: opponentId });

// the team bet over several samples (last 5 / 10 / 20, season, home / away, last season, vs opponent)
const getTeamHitRateSplits = (
    teamId: number,
    bet: { market: NbaTeamMarket; line: number; side: NbaSide },
    opponentId?: number,
) =>
    post<NbaTeamHitRateSplits>(`/api/nba/teams/${teamId}/hit-rate/splits`, { ...bet, opponent_id: opponentId });

export {
    getAll,
    getOne,
    getByAbbreviation,
    getRoster,
    getTeamHitRate,
    getTeamHitRateSplits,
};
