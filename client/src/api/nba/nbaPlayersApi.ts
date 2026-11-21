import { get, post } from "../apiClient";
import type { NbaCareerHighs, NbaPlayer, NbaPlayerCareer } from "../../types/nba";

// get one player based on id
const getOne = (playerId: number) =>
    get<NbaPlayer>(`/api/nba/players/${playerId}`);

// get one player based on exact name, case insensitive ('anthony edwards')
const getByName = (name: string) =>
    post<NbaPlayer>("/api/nba/players/name", { name });

// search players by part of name ('edwa'), at least 2 characters
// activeOnly leaves retired players out
const searchPlayers = (query: string, limit?: number, activeOnly = false) =>
    post<NbaPlayer[]>("/api/nba/players/search", { query, limit, active_only: activeOnly });

// get player's season by season and career averages, regular season and playoffs
const getPlayersCareer = (playerId: number) =>
    get<NbaPlayerCareer>(`/api/nba/players/${playerId}/career`);

// get player's best game in each stat, regular season and playoffs
const getPlayersCareerHighs = (playerId: number) =>
    get<NbaCareerHighs>(`/api/nba/players/${playerId}/career-highs`);

export {
    getPlayersCareerHighs,
    getOne,
    getByName,
    searchPlayers,
    getPlayersCareer,
};
