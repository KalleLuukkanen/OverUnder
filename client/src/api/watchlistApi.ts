import { get, put, del } from "./apiClient";
import type { NbaWatchlist } from "../types/nba";

export type WatchKind = "player" | "team";

// path of one watched player or team
const itemPath = (kind: WatchKind, id: number) => `/api/watchlist/${kind === "player" ? "players" : "teams"}/${id}`;

// member's watched players and teams with their next games, soonest first (401 if not signed in)
const getWatchlist = () =>
    get<NbaWatchlist>("/api/watchlist");

// adds a player or team, already watched is fine
const watch = (kind: WatchKind, id: number) =>
    put<null>(itemPath(kind, id));

// removes a player or team, not watched is fine
const unwatch = (kind: WatchKind, id: number) =>
    del<null>(itemPath(kind, id));

export {
    getWatchlist,
    watch,
    unwatch,
};
