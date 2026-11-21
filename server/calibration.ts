// scores how well predicted chances match what happened (calibration)
// used by the backtest script and the real parlay legs' report

// a calibration bucket: the bets whose chance (of the side we'd bet) fell in [from, to)
type Bucket = {
    from: number;        // 0-1
    to: number;
    count: number;
    predicted: number;   // average chance in the bucket, 0-1
    actual: number;      // share of them that hit, 0-1
};

type Score = {
    samples: number;
    brier: number | null;        // average (chance - result)^2, lower is better, always saying 50% gives 0.25
    picks_hit: number | null;    // how often the side we'd bet (chance 50%+) hit, 0-1
    buckets: Bucket[];
};

// collects predictions one at a time (millions in a backtest, so nothing is kept but sums)
// width = bucket width, buckets go from 50% up by the side we'd bet
class Scorer {
    private width: number;
    private samples = 0;
    private squaredError = 0;
    private picksHit = 0;
    private buckets: { count: number, chance: number, hits: number }[];

    constructor(width = 0.05) {
        this.width = width;
        this.buckets = Array.from({ length: Math.round(0.5 / width) }, () => ({ count: 0, chance: 0, hits: 0 }));
    }

    // chance = 0-1 for the bet, hit = how it went
    add(chance: number, hit: boolean) {
        this.samples++;
        this.squaredError += (chance - (hit ? 1 : 0)) ** 2;
        // the side we'd bet: the bet itself at 50%+, otherwise the other side of it
        const pick = chance >= 0.5 ? chance : 1 - chance;
        const pickHit = chance >= 0.5 ? hit : !hit;
        if (pickHit) this.picksHit++;
        const bucket = this.buckets[Math.min(Math.floor((pick - 0.5) / this.width), this.buckets.length - 1)];
        bucket.count++;
        bucket.chance += pick;
        if (pickHit) bucket.hits++;
    }

    // the Brier score alone (for comparing with baselines)
    brier() {
        return this.samples ? this.squaredError / this.samples : null;
    }

    score(): Score {
        const round = (value: number) => Math.round(value * 10000) / 10000;
        return {
            samples: this.samples,
            brier: this.samples ? round(this.squaredError / this.samples) : null,
            picks_hit: this.samples ? round(this.picksHit / this.samples) : null,
            buckets: this.buckets
                .map((b, i) => ({
                    from: round(0.5 + i * this.width),
                    to: round(0.5 + (i + 1) * this.width),
                    count: b.count,
                    predicted: b.count ? round(b.chance / b.count) : 0,
                    actual: b.count ? round(b.hits / b.count) : 0,
                }))
                .filter((b) => b.count > 0),
        };
    }
}

export {
    type Bucket,
    type Score,
    Scorer,
};
