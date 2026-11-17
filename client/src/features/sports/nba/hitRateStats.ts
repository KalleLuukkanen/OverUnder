import type { NbaStat } from "../../../types/nba";

// stats shown in the stat dropdown, value is what the api expects
export const STATS: { value: NbaStat, label: string }[] = [
    { value: "pts", label: "Points" },
    { value: "reb", label: "Rebounds" },
    { value: "ast", label: "Assists" },
    { value: "pra", label: "Pts + Reb + Ast" },
    { value: "pr", label: "Pts + Reb" },
    { value: "pa", label: "Pts + Ast" },
    { value: "ra", label: "Reb + Ast" },
    { value: "fg3m", label: "3-pointers made" },
    { value: "fgm", label: "Field goals made" },
    { value: "ftm", label: "Free throws made" },
    { value: "stl", label: "Steals" },
    { value: "blk", label: "Blocks" },
    { value: "stocks", label: "Steals + Blocks" },
    { value: "tov", label: "Turnovers" },
];
