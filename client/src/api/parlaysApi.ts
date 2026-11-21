import { get, post, patch, del } from "./apiClient";
import type { NbaSide, NbaStat, NbaTeamMarket, Parlay } from "../types/nba";

// a new leg: a player prop or a team bet (win and spread need no side, win no line)
// odds = the leg's decimal odds if the user gave them
export type NewLeg =
    | { player_id: number, stat: NbaStat, line: number, side: NbaSide, odds?: number | null }
    | { team_id: number, market: NbaTeamMarket, line: number, side: NbaSide, odds?: number | null };

// member's parlays with legs, results and hit rates, newest first (401 if not signed in)
const getParlays = () =>
    get<Parlay[]>("/api/parlays");

// new empty parlay, returns its id
const createParlay = (name: string, odds?: number | null) =>
    post<{ id: number }>("/api/parlays", { name, odds: odds ?? null });

// rename and/or change the odds (null removes the odds)
const updateParlay = (parlayId: number, changes: { name?: string, odds?: number | null }) =>
    patch<null>(`/api/parlays/${parlayId}`, changes);

const deleteParlay = (parlayId: number) =>
    del<null>(`/api/parlays/${parlayId}`);

// adds a player prop or a team bet, the server ties it to the player's / team's next game
// 400 if there's no upcoming game or the leg clashes with one already in the parlay (same game, same outcome)
const addLeg = (parlayId: number, leg: NewLeg) =>
    post<{ id: number }>(`/api/parlays/${parlayId}/legs`, leg);

const deleteLeg = (parlayId: number, legId: number) =>
    del<null>(`/api/parlays/${parlayId}/legs/${legId}`);

export {
    getParlays,
    createParlay,
    updateParlay,
    deleteParlay,
    addLeg,
    deleteLeg,
};
