import { get, post, patch, del } from "./apiClient";
import type { NbaSide, NbaStat, Parlay } from "../types/nba";

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

// adds a prop, the server ties it to the player's next game (400 if the player has none)
const addLeg = (parlayId: number, leg: { player_id: number, stat: NbaStat, line: number, side: NbaSide }) =>
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
