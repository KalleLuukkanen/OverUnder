import type { NbaBoxScore, NbaStat } from "../../../types/nba";

// stats shown in the stat dropdown, value is what the api expects, short is a table column header
export const STATS: { value: NbaStat, label: string, short: string }[] = [
    { value: "pts", label: "Points", short: "PTS" },
    { value: "reb", label: "Rebounds", short: "REB" },
    { value: "ast", label: "Assists", short: "AST" },
    { value: "pra", label: "Pts + Reb + Ast", short: "PRA" },
    { value: "pr", label: "Pts + Reb", short: "P+R" },
    { value: "pa", label: "Pts + Ast", short: "P+A" },
    { value: "ra", label: "Reb + Ast", short: "R+A" },
    { value: "fg3m", label: "3-pointers made", short: "3PM" },
    { value: "fgm", label: "Field goals made", short: "FGM" },
    { value: "ftm", label: "Free throws made", short: "FTM" },
    { value: "stl", label: "Steals", short: "STL" },
    { value: "blk", label: "Blocks", short: "BLK" },
    { value: "stocks", label: "Steals + Blocks", short: "S+B" },
    { value: "tov", label: "Turnovers", short: "TOV" },
];

// the stat's value in one box score line, combos added up the same way as the api does
export const statValue = (stat: NbaStat, g: NbaBoxScore) => {
    switch (stat) {
        case "pra": return g.pts + g.reb + g.ast;
        case "pr": return g.pts + g.reb;
        case "pa": return g.pts + g.ast;
        case "ra": return g.reb + g.ast;
        case "stocks": return g.stl + g.blk;
        default: return g[stat];
    }
};
