import { get } from "../apiClient";
import type { NbaLeaders, NbaPlayerSeasonRanks, NbaStanding } from "../../types/nba";

// current season's standings, best record first
const getStandings = () =>
    get<NbaStanding[]>("/api/nba/season/current/standings");

// current season's league leaders, top 10 per stat
const getLeaders = () =>
    get<NbaLeaders>("/api/nba/season/current/leaders");

// one player's current season averages and ranks in the leader stats (404 if no games this season)
const getPlayerSeason = (playerId: number) =>
    get<NbaPlayerSeasonRanks>(`/api/nba/players/${playerId}/season`);

export {
    getStandings,
    getLeaders,
    getPlayerSeason,
};
