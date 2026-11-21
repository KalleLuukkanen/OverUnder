import { get } from "../apiClient";
import type { NbaLeaders, NbaStanding } from "../../types/nba";

// current season's standings, best record first
const getStandings = () =>
    get<NbaStanding[]>("/api/nba/season/current/standings");

// current season's league leaders, top 10 per stat
const getLeaders = () =>
    get<NbaLeaders>("/api/nba/season/current/leaders");

export {
    getStandings,
    getLeaders,
};
