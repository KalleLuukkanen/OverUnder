import type { ParlayLeg } from "../../types/nba";
import { STATS } from "../sports/nba/hitRateStats";
import { signed, TEAM_MARKETS } from "../sports/nba/teamMarkets";

// a team bet's short stat name, e.g. 'game total', 'PTS'
const TEAM_SHORT: Record<string, string> = {
    total: "game total",
    h1_total: "1st half total",
    team_pts: "PTS",
    opp_pts: "opp PTS",
    team_fg3m: "3PM",
    team_reb: "REB",
};

// short name of a leg, e.g. 'Edwards O 25.5 PTS', 'LAL -5.5', 'LAL ML', 'LAL O 228.5 game total'
export const legName = (leg: ParlayLeg) => {
    const ou = `${leg.side === "over" ? "O" : "U"} ${leg.line}`;
    if (leg.kind === "team") {
        if (leg.market === "win") return `${leg.team} ML`;
        if (leg.market === "spread") return `${leg.team} ${signed(leg.line)}`;
        return `${leg.team} ${ou} ${TEAM_SHORT[leg.market]}`;
    }
    const lastName = leg.player_name.split(" ").slice(1).join(" ") || leg.player_name;
    const stat = STATS.find((s) => s.value === leg.stat)?.short ?? leg.stat.toUpperCase();
    return `${lastName} ${ou} ${stat}`;
};

// the bet after the player / team name on the parlays page, e.g. 'Over 25.5 PTS', 'to win', '-5.5 spread'
export const legBet = (leg: ParlayLeg) => {
    const ou = `${leg.side === "over" ? "Over" : "Under"} ${leg.line}`;
    if (leg.kind === "player") return `${ou} ${STATS.find((s) => s.value === leg.stat)?.short ?? leg.stat.toUpperCase()}`;
    if (leg.market === "win") return "to win (moneyline)";
    if (leg.market === "spread") return `${signed(leg.line)} spread`;
    return `${ou} ${TEAM_MARKETS.find((m) => m.value === leg.market)?.label.toLowerCase() ?? leg.market}`;
};

// how the leg went, e.g. 'had 31', 'won 118-110 (+8)', 'total 231'
export const legOutcome = (leg: ParlayLeg) => {
    if (leg.value === null) return null;
    if (leg.kind === "player") return `had ${leg.value}`;
    const score = leg.score ? `${leg.score.team > leg.score.opponent ? "won" : "lost"} ${leg.score.team}-${leg.score.opponent}` : "";
    if (leg.market === "win") return score;
    if (leg.market === "spread") return `${score} (${signed(leg.value)})`;
    return `had ${leg.value}`;
};
