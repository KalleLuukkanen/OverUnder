import { useEffect, useState } from "react";
import { getCalibration } from "../api/calibrationApi";
import type { BacktestGroup, BacktestReport, Calibration, LegsCalibration } from "../types/nba";
import Loading from "../components/Loading";
import { authClient } from "../utils/auth";
import CalibrationChart from "../features/accuracy/CalibrationChart";
import BucketTable from "../features/accuracy/BucketTable";
import { STATS } from "../features/sports/nba/hitRateStats";
import { TEAM_MARKETS } from "../features/sports/nba/teamMarkets";

// fewer settled real legs than this: the numbers are shown, but said to be too few to trust
const FEW_LEGS = 50;

const pct = (value: number | null) => value === null ? "–" : `${(value * 100).toFixed(1)}%`;
const signedPct = (value: number | null) => value === null ? "–" : `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const brier = (value: number | null) => value === null ? "–" : value.toFixed(4);

// a bet type's name: a player stat or a team market, or the totals
const groupLabel = (group: BacktestGroup) => {
    if (group.key === "player") return "All player props";
    if (group.key === "team") return "All team bets";
    if (group.kind === "player") return STATS.find((s) => s.value === group.key)?.label ?? group.key.toUpperCase();
    return TEAM_MARKETS.find((m) => m.value === group.key)?.label ?? group.key;
};

// how much better than always saying 50% (Brier 0.25), e.g. '+4.8%'
const skill = (score: number | null) => score === null ? null : 1 - score / 0.25;

// one number with its label under it
function Figure({ label, value, note }: { label: string, value: string, note?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-xl font-semibold tabular-nums text-zinc-100">{value}</span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
            {note && <span className="text-xs text-zinc-500">{note}</span>}
        </div>
    )
}

// two or more options as a segmented control
function Segmented<T extends string>({ value, options, onChange, label }: {
    value: T,
    options: { value: T, label: string }[],
    onChange: (value: T) => void,
    label: string,
}) {
    return (
        <div className="inline-flex p-0.5 rounded-lg bg-zinc-800" role="group" aria-label={label}>
            {options.map((o) => (
                <button
                    key={o.value}
                    className={`px-3 py-1 rounded-md text-sm cursor-pointer ${value === o.value ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

// the estimator against the simpler ways of guessing, by Brier score (lower is better)
function Baselines({ group }: { group: BacktestGroup }) {
    const rows = [
        { label: "Our estimate", value: group.brier, ours: true },
        { label: "Last 10 hit rate alone", value: group.baselines.last10, ours: false },
        { label: "Season hit rate alone", value: group.baselines.season, ours: false },
        { label: "Always 50% (coin flip)", value: group.baselines.coin_flip, ours: false },
    ];
    const best = Math.min(...rows.map((r) => r.value ?? Infinity));
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-xs text-zinc-500">
                    <th className="py-1 text-left font-normal">Way of guessing</th>
                    <th className="py-1 text-right font-normal" title="Average of (chance - result)², lower is better">Brier score</th>
                    <th className="py-1 text-right font-normal">vs coin flip</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 tabular-nums">
                {rows.map((r) => (
                    <tr key={r.label} className={r.ours ? "font-medium" : ""}>
                        <td className="py-1.5 text-zinc-200">
                            {r.label}
                            {r.value === best && <span className="ml-2 px-1.5 rounded text-xs bg-emerald-500/15 text-emerald-400">best</span>}
                        </td>
                        <td className="py-1.5 text-right text-zinc-100">{brier(r.value)}</td>
                        <td className="py-1.5 text-right text-zinc-400">{signedPct(skill(r.value))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// every bet type of a kind, the selected one highlighted; clicking one selects it
function GroupTable({ groups, selected, onSelect }: { groups: BacktestGroup[], selected: string, onSelect: (key: string) => void }) {
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-xs text-zinc-500">
                    <th className="py-1 text-left font-normal">Bet</th>
                    <th className="py-1 text-right font-normal">Bets</th>
                    <th className="py-1 text-right font-normal">Picks hit</th>
                    <th className="py-1 text-right font-normal">Brier</th>
                    <th className="py-1 text-right font-normal">vs coin flip</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 tabular-nums">
                {groups.map((g) => (
                    <tr
                        key={g.key}
                        className={`cursor-pointer hover:bg-zinc-800/50 ${g.key === selected ? "bg-zinc-800/70" : ""}`}
                        onClick={() => onSelect(g.key)}
                    >
                        <td className="py-1.5 pl-1">
                            <button className="text-left text-zinc-200 hover:text-sky-400 cursor-pointer" type="button" aria-pressed={g.key === selected}>
                                {groupLabel(g)}
                            </button>
                        </td>
                        <td className="py-1.5 text-right text-zinc-400">{g.samples.toLocaleString()}</td>
                        <td className="py-1.5 text-right text-zinc-300">{pct(g.picks_hit)}</td>
                        <td className="py-1.5 text-right text-zinc-100">{brier(g.brier)}</td>
                        <td className="py-1.5 pr-1 text-right text-zinc-400">{signedPct(skill(g.brier))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// the backtest: player props or team bets, one bet type at a time
function BacktestSection({ report }: { report: BacktestReport }) {

    const [kind, setKind] = useState<"player" | "team">("player");
    const [selected, setSelected] = useState("player");

    // only the bet types the app offers, with something tested
    const offered = (g: BacktestGroup) => g.kind === "player" ? STATS.some((s) => s.value === g.key) : true;
    const groups = [report.totals[kind], ...report.groups.filter((g) => g.kind === kind && offered(g) && g.samples > 0)];
    const group = groups.find((g) => g.key === selected) ?? groups[0];

    const changeKind = (k: "player" | "team") => {
        setKind(k);
        setSelected(k);
    };

    return (
        <section className="flex flex-col gap-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">Backtest on past seasons</h2>
                    <p className="text-sm text-zinc-500">
                        {report.seasons.join(", ")} · run {new Date(report.created_at).toLocaleDateString()} · estimator {report.model.name}
                    </p>
                </div>
                <div className="ml-auto">
                    <Segmented
                        label="Bet kind"
                        value={kind}
                        options={[{ value: "player", label: "Player props" }, { value: "team", label: "Team bets" }]}
                        onChange={changeKind}
                    />
                </div>
            </div>

            <label className="flex flex-col gap-1 w-full sm:w-72">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bet type</span>
                <select
                    className="px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 [color-scheme:dark] [&>option]:bg-zinc-800"
                    value={group.key}
                    onChange={(e) => setSelected(e.target.value)}
                >
                    {groups.map((g) => <option key={g.key} value={g.key}>{groupLabel(g)}</option>)}
                </select>
            </label>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
                <Figure label="Bets tested" value={group.samples.toLocaleString()} />
                <Figure label="Picks hit" value={pct(group.picks_hit)} note="the side we'd bet" />
                <Figure label="Brier score" value={brier(group.brier)} note={`${signedPct(skill(group.brier))} vs coin flip`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Said vs hit</h3>
                    <CalibrationChart buckets={group.buckets} />
                    <p className="text-xs text-zinc-500">
                        Dots below the dashed line: the chances were too optimistic. Faint dots have under 30 bets.
                    </p>
                </div>
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">By chance</h3>
                        <BucketTable buckets={group.buckets} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Against simpler guesses</h3>
                        <Baselines group={group} />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Every bet type</h3>
                <GroupTable groups={groups} selected={group.key} onSelect={setSelected} />
            </div>

            <p className="text-xs text-zinc-500">
                Each bet is estimated from only the games before it, like a parlay leg. There are no old bookmaker lines
                in the data, so the lines are made from what was known before each game: {report.line_rule}
            </p>
        </section>
    )
}

// real settled parlay legs: how the estimates did and, for legs with odds, against the bookmaker
function LegsSection({ legs, signedIn }: { legs: Calibration["legs"], signedIn: boolean }) {

    const [whose, setWhose] = useState<"all" | "mine">("all");
    const data: LegsCalibration | null = whose === "mine" ? legs.mine : legs.all;

    return (
        <section className="flex flex-col gap-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">Real parlay legs</h2>
                    <p className="text-sm text-zinc-500">Settled legs of every member's parlays. Pushes and DNPs left out.</p>
                </div>
                {signedIn &&
                    <div className="ml-auto">
                        <Segmented
                            label="Whose legs"
                            value={whose}
                            options={[{ value: "all", label: "Everyone" }, { value: "mine", label: "Yours" }]}
                            onChange={setWhose}
                        />
                    </div>
                }
            </div>

            {!data || data.samples === 0 ?
                <p className="text-sm text-zinc-500">No settled legs yet. This fills up as parlay legs' games are played.</p> :
                <>
                    {data.samples < FEW_LEGS &&
                        <p className="text-sm text-amber-400">
                            Only {data.samples} settled {data.samples === 1 ? "leg" : "legs"} so far: too few to say much. Trust the backtest above for now.
                        </p>
                    }
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                        <Figure label="Settled legs" value={data.samples.toLocaleString()} />
                        <Figure label="Picks hit" value={pct(data.picks_hit)} />
                        <Figure label="Brier score" value={brier(data.brier)} note={`${signedPct(skill(data.brier))} vs coin flip`} />
                    </div>
                    <BucketTable buckets={data.buckets} />
                    {data.odds &&
                        <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                            <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Against the bookmaker ({data.odds.legs} legs with odds)</h3>
                            <div className="flex flex-wrap gap-x-8 gap-y-3">
                                <Figure label="Our Brier" value={brier(data.odds.brier)} />
                                <Figure label="Bookmaker's Brier" value={brier(data.odds.bookmaker_brier)} note="1 / odds as the chance" />
                                <Figure label="Return, every leg" value={signedPct(data.odds.roi)} note="1 unit on each" />
                                <Figure
                                    label="Return, value legs"
                                    value={signedPct(data.odds.value_roi)}
                                    note={`${data.odds.value_legs} legs where chance × odds > 1`}
                                />
                            </div>
                        </div>
                    }
                </>
            }
        </section>
    )
}

// how accurate the estimated chances are: the backtest on past seasons and the real legs
function AccuracyPage() {

    const { data: session } = authClient.useSession();
    const signedIn = !!session;
    const [calibration, setCalibration] = useState<Calibration | null>(null);
    const [error, setError] = useState<string | null>(null);

    // loaded again on signing in or out: the user's own legs come with a session
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getCalibration();
                if (!cancelled) setCalibration(res);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the accuracy report");
            }
        };
        load();
        return () => { cancelled = true };
    }, [signedIn]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">How accurate are we?</h1>
                <p className="max-w-2xl text-zinc-400">
                    When the app says a bet has a 70% chance, it should hit about 70 times out of 100.
                    This page checks that, on thousands of past games and on real parlay legs.
                </p>
            </div>
            {error && <p className="text-rose-400">{error}</p>}
            {!calibration && !error && <Loading />}
            {calibration &&
                <>
                    {calibration.backtest ?
                        <BacktestSection report={calibration.backtest} /> :
                        <p className="text-zinc-500">The backtest hasn't been run yet.</p>
                    }
                    <LegsSection legs={calibration.legs} signedIn={signedIn} />
                </>
            }
        </div>
    )
}

export default AccuracyPage;
