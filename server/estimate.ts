// the chance of a bet before its game, from its hit rates
// the one estimator of the app: parlay legs and the accuracy backtest both use it,
// so the backtest measures exactly what the app shows

// a sample of past games: how many there were and how many of them the bet hit
type Sample = { hits: number, games: number };

// the estimator's name, saved with backtest reports so they can be told apart when it changes
const MODEL = "blend-v1";

// how much each sample counts, missing samples (no games) are left out
// and the remaining weights scaled back up to 100%
const WEIGHTS = { last10: 0.4, season: 0.4, opponent: 0.2 } as const;

type SampleKey = keyof typeof WEIGHTS;

// pulls a small sample toward 50% as if every sample had 1 extra hit and 1 extra miss:
// 10/10 -> 11/12 = 92%, 0/5 -> 1/7 = 14%, a long sample barely moves (60/100 -> 60%)
const PRIOR_HITS = 1;
const PRIOR_GAMES = 2;

const adjustedRate = (sample: Sample) => (sample.hits + PRIOR_HITS) / (sample.games + PRIOR_GAMES);

// one sample's part in an estimate
type EstimatePart = {
    key: SampleKey;
    label: string;
    hits: number;
    games: number;
    adjusted: number;   // 0-1, after the pull toward 50%
    weight: number;     // 0-1, after leaving out missing samples
};

type Estimate = {
    chance: number | null;   // 0-1, null if there's nothing to estimate from
    parts: EstimatePart[];
};

// blends the adjusted last 10, season and vs opponent hit rates (labels are shown with the parts)
const estimate = (samples: { key: SampleKey, label: string, sample: Sample | null }[]): Estimate => {
    const used = samples.filter((s): s is { key: SampleKey, label: string, sample: Sample } => !!s.sample && s.sample.games > 0);
    if (used.length === 0) return { chance: null, parts: [] };

    const totalWeight = used.reduce((sum, s) => sum + WEIGHTS[s.key], 0);
    const parts = used.map((s) => ({
        key: s.key,
        label: s.label,
        hits: s.sample.hits,
        games: s.sample.games,
        adjusted: adjustedRate(s.sample),
        weight: WEIGHTS[s.key] / totalWeight,
    }));
    const chance = parts.reduce((sum, p) => sum + p.adjusted * p.weight, 0);
    return { chance, parts };
};

// what a backtest report says about the estimator it measured
const MODEL_INFO = { name: MODEL, weights: WEIGHTS, prior: { hits: PRIOR_HITS, games: PRIOR_GAMES } };

export {
    type Sample,
    type SampleKey,
    type Estimate,
    type EstimatePart,
    MODEL_INFO,
    estimate,
};
