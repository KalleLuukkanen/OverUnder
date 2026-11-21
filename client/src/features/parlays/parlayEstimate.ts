import type { LegEstimate, ParlayLeg } from "../../types/nba";

// a leg's chance before its game: the server blends the last 10, season and vs opponent hit rates
// (server/estimate.ts, the same estimator the accuracy backtest measures)
export const estimateLeg = (leg: ParlayLeg): LegEstimate => leg.estimate;

// true once the leg's game is played and it has a result
export const isSettled = (leg: ParlayLeg) => leg.status !== "pending" && leg.status !== "no_game";

// a leg's chance right now: settled legs count as they went (hit / push / DNP = 1, miss = 0),
// open legs use the pre-game estimate
const liveLegChance = (leg: ParlayLeg) => {
    if (leg.status === "miss") return 0;
    if (isSettled(leg)) return 1;
    return estimateLeg(leg).chance;
};

// the parlay's chance: the legs' chances multiplied, as if they were independent
// live = with the settled legs' results, otherwise the estimate before any game was played
// null if a leg has nothing to estimate from
export const estimateParlay = (legs: ParlayLeg[], live = false) => {
    if (legs.length === 0) return null;
    let chance = 1;
    for (const leg of legs) {
        const legChance = live ? liveLegChance(leg) : estimateLeg(leg).chance;
        if (legChance === null) return null;
        chance *= legChance;
    }
    return chance;
};

// 0.4567 -> '46%', small chances keep a decimal: 0.0456 -> '4.6%'
export const percent = (value: number) => `${(value * 100).toFixed(value < 0.1 && value > 0 ? 1 : 0)}%`;
