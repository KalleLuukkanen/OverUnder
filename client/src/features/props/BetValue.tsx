import { expectedValue, fairOdds, impliedChance } from "../../utils/odds";

// fewer games than this: the hit rate is a shaky estimate, said next to the numbers
const SMALL_SAMPLE = 10;

const percent = (chance: number) => `${(chance * 100).toFixed(1)}%`;
const signedPercent = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

// one number with its label under it
function Figure({ label, value, tone = "text-zinc-100", title }: { label: string, value: string, tone?: string, title?: string }) {
    return (
        <div className="flex flex-col" title={title}>
            <span className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
        </div>
    )
}

// compares a checked bet's hit rate with the bookmaker's odds:
// the chance the odds imply, the edge, the expected value per unit staked and the fair odds for the hit rate
// without odds a short hint is shown instead
function BetValue({ hit_rate, games, odds }: { hit_rate: number | null, games: number, odds: number | null }) {

    if (hit_rate === null || games === 0) return null;

    if (odds === null) {
        return <p className="text-sm text-zinc-500">Add the bookmaker's odds to compare them with the hit rate.</p>;
    }

    const chance = hit_rate / 100;
    const implied = impliedChance(odds);
    const edge = chance - implied;
    const ev = expectedValue(chance, odds);
    const fair = fairOdds(chance);
    const positive = ev > 0;

    return (
        <div className={`flex flex-col gap-2 p-3 rounded-lg border ${positive ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/40"}`}>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Figure label={`Odds ${odds.toFixed(2)} imply`} value={percent(implied)} title="1 / odds, includes the bookmaker's margin" />
                <Figure label="Hit rate" value={percent(chance)} />
                <Figure
                    label="Edge"
                    value={`${edge >= 0 ? "+" : ""}${(edge * 100).toFixed(1)} pts`}
                    tone={edge > 0 ? "text-emerald-400" : "text-rose-400"}
                    title="Hit rate minus the implied chance"
                />
                <Figure
                    label="EV per bet"
                    value={signedPercent(ev)}
                    tone={positive ? "text-emerald-400" : "text-rose-400"}
                    title="Expected return per unit staked if the hit rate is the true chance"
                />
                <Figure label="Fair odds" value={fair === null ? "–" : fair.toFixed(2)} title="Odds that would match the hit rate" />
            </div>
            <p className="text-xs text-zinc-500">
                {positive ? "Value at these odds, if the hit rate holds." : "No value at these odds by the hit rate."}
                {games < SMALL_SAMPLE && ` Only ${games} games: a small sample, treat it with care.`}
                {" "}A push counts as a miss here.
            </p>
        </div>
    )
}

export default BetValue;
