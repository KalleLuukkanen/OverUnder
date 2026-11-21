import type { NbaTeamMarket } from "../../../types/nba";

// team bets in the bet dropdown: line = needs a line, side = over / under
// placeholder is an example line, value is how a game's value is shown in the results
export const TEAM_MARKETS: { value: NbaTeamMarket, label: string, line: boolean, side: boolean, placeholder: string }[] = [
    { value: "win", label: "Win (moneyline)", line: false, side: false, placeholder: "" },
    { value: "spread", label: "Spread", line: true, side: false, placeholder: "e.g. -5.5" },
    { value: "total", label: "Game total points", line: true, side: true, placeholder: "e.g. 228.5" },
    { value: "h1_total", label: "1st half total points", line: true, side: true, placeholder: "e.g. 114.5" },
    { value: "team_pts", label: "Team points", line: true, side: true, placeholder: "e.g. 115.5" },
    { value: "opp_pts", label: "Opponent points", line: true, side: true, placeholder: "e.g. 110.5" },
    { value: "team_fg3m", label: "Team 3-pointers made", line: true, side: true, placeholder: "e.g. 13.5" },
    { value: "team_reb", label: "Team rebounds", line: true, side: true, placeholder: "e.g. 44.5" },
];

// +5 / -3 for margins and spread lines, 0 stays 0
export const signed = (value: number) => value > 0 ? `+${value}` : `${value}`;

// the bet in words: 'LAL -5.5', 'LAL to win', 'Over 228.5 game total points'
export const betLabel = (team: string, market: NbaTeamMarket, line: number, side: string) => {
    if (market === "win") return `${team} to win`;
    if (market === "spread") return `${team} ${signed(line)}`;
    const label = TEAM_MARKETS.find((m) => m.value === market)?.label.toLowerCase() ?? market;
    return `${side === "over" ? "Over" : "Under"} ${line} ${label}`;
};
