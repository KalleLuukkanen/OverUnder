import { get, post } from "../apiClient";
import type { NbaRosterPlayer, NbaTeam } from "../../types/nba";

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

export {
    getAll,
    getOne,
    getByAbbreviation,
    getRoster,
};
