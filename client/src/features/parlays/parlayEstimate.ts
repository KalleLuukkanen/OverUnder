import type { NbaHitRateSplit, ParlayLeg } from "../../types/nba";

// how much each sample counts in a leg's chance, missing samples (no games) are left out
// and the remaining weights scaled back up to 100%
export const WEIGHTS = { last10: 0.4, season: 0.4, opponent: 0.2 } as const;

// pulls a small sample toward 50% as if every sample had 1 extra hit and 1 extra miss:
// 10/10 -> 11/12 = 92%, 0/5 -> 1/7 = 14%, a long sample barely moves (60/100 -> 60%)
export const PRIOR_HITS = 1;
export const PRIOR_GAMES = 2;

export const adjustedRate = (split: NbaHitRateSplit) =>
    (split.hits + PRIOR_HITS) / (split.games + PRIOR_GAMES);

// one sample's part in a leg's estimate
export type EstimatePart = {
    label: string;
    hits: number;
    games: number;
    adjusted: number;   // 0-1, after the pull toward 50%
    weight: number;     // 0-1, after leaving out missing samples
};

export type LegEstimate = {
    chance: number | null;   // 0-1, null if there's nothing to estimate from
    settled: boolean;        // game played: chance is the result (1 or 0), not an estimate
    parts: EstimatePart[];
};

// a leg's chance: settled legs count as they went (hit / push / DNP = 1, miss = 0),
// open legs blend the adjusted last 10, season and vs opponent hit rates
export const estimateLeg = (leg: ParlayLeg): LegEstimate => {
    if (leg.status === "miss") return { chance: 0, settled: true, parts: [] };
    if (leg.status === "hit" || leg.status === "push" || leg.status === "void") return { chance: 1, settled: true, parts: [] };

    const samples: [keyof typeof WEIGHTS, string, NbaHitRateSplit | null][] = [
        ["last10", "Last 10", leg.hit_rates.last10],
        ["season", "Season", leg.hit_rates.season],
        ["opponent", leg.game ? `vs ${leg.game.opponent}` : "vs opponent", leg.hit_rates.opponent],
    ];
    const used = samples.filter(([, , split]) => split && split.games > 0) as [keyof typeof WEIGHTS, string, NbaHitRateSplit][];
    if (used.length === 0) return { chance: null, settled: false, parts: [] };

    const totalWeight = used.reduce((sum, [key]) => sum + WEIGHTS[key], 0);
    const parts = used.map(([key, label, split]) => ({
        label,
        hits: split.hits,
        games: split.games,
        adjusted: adjustedRate(split),
        weight: WEIGHTS[key] / totalWeight,
    }));
    const chance = parts.reduce((sum, p) => sum + p.adjusted * p.weight, 0);
    return { chance, settled: false, parts };
};

// the parlay's chance: the legs' chances multiplied, as if they were independent
// null if a leg has nothing to estimate from
export const estimateParlay = (legs: ParlayLeg[]) => {
    if (legs.length === 0) return null;
    let chance = 1;
    for (const leg of legs) {
        const estimate = estimateLeg(leg);
        if (estimate.chance === null) return null;
        chance *= estimate.chance;
    }
    return chance;
};

// 0.4567 -> '46%', small chances keep a decimal: 0.0456 -> '4.6%'
export const percent = (value: number) => `${(value * 100).toFixed(value < 0.1 && value > 0 ? 1 : 0)}%`;
