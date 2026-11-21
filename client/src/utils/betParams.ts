import type { NbaGame, NbaSide } from "../types/nba";

// url params of a checked bet, e.g. ?player=1630162&stat=pts&line=24.5&side=over&last=10&vs=1
// the checkers write them after a check and re-run the check from them when the page opens,
// so signing in (which returns to the same url), refreshing or sharing a link keeps the bet
export const BET_KEYS = ["bet", "player", "team", "stat", "market", "line", "side", "last", "vs"] as const;

type BetValues = Partial<Record<typeof BET_KEYS[number], string | number | boolean | null>>;

// the url's params with the bet params replaced (null = removed), other params (e.g. the page's view) stay
export const withBet = (params: URLSearchParams, values: BetValues | null) => {
    const next = new URLSearchParams(params);
    BET_KEYS.forEach((key) => next.delete(key));
    for (const [key, value] of Object.entries(values ?? {})) {
        if (value === null || value === false || value === undefined) continue;
        next.set(key, value === true ? "1" : String(value));
    }
    return next;
};

export const LIMITS = [5, 10, 15, 20, 30];

// 'last games' from the url, 10 if missing or not one of the choices
export const readLimit = (params: URLSearchParams) => {
    const limit = Number(params.get("last"));
    return LIMITS.includes(limit) ? limit : 10;
};

// the line from the url as the form's text, null if missing or not a number
export const readLine = (params: URLSearchParams) => {
    const line = params.get("line");
    return line !== null && line !== "" && Number.isFinite(Number(line)) ? line : null;
};

export const readSide = (params: URLSearchParams): NbaSide => params.get("side") === "under" ? "under" : "over";

// the opponent of a team in a game: the other team, and whether the team is at home
export const opponentIn = (game: NbaGame, team_id: number) =>
    game.home_team_id === team_id
        ? { id: game.away_team_id, abbreviation: game.away_team, home: true }
        : { id: game.home_team_id, abbreviation: game.home_team, home: false };
