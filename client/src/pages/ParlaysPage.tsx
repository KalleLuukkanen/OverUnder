import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Trash2, X } from "lucide-react";
import { authClient } from "../utils/auth";
import { getParlays, createParlay, updateParlay, deleteParlay, deleteLeg } from "../api/parlaysApi";
import { ApiError } from "../api/apiClient";
import type { NbaHitRateSplit, Parlay, ParlayLeg, ParlayLegStatus } from "../types/nba";
import Loading from "../components/Loading";
import SignInPrompt from "../components/SignInPrompt";
import { gameDateTime } from "../utils/nbaGame";
import { estimateParlay, isSettled, percent } from "../features/parlays/parlayEstimate";
import EstimateInfo from "../features/parlays/EstimateInfo";
import { legBet, legOutcome } from "../features/parlays/legLabels";

const PARLAY_STATUS: Record<Parlay["status"], { label: string, className: string }> = {
    empty: { label: "Empty", className: "bg-zinc-800 text-zinc-400" },
    pending: { label: "Pending", className: "bg-sky-500/15 text-sky-400" },
    won: { label: "Won", className: "bg-emerald-500/15 text-emerald-400" },
    lost: { label: "Lost", className: "bg-rose-500/15 text-rose-400" },
    void: { label: "Void", className: "bg-zinc-800 text-zinc-400" },
};

const LEG_STATUS: Record<ParlayLegStatus, { label: string, className: string }> = {
    pending: { label: "Pending", className: "bg-sky-500/15 text-sky-400" },
    no_game: { label: "No game", className: "bg-zinc-800 text-zinc-400" },
    hit: { label: "Hit", className: "bg-emerald-500/15 text-emerald-400" },
    miss: { label: "Miss", className: "bg-rose-500/15 text-rose-400" },
    push: { label: "Push", className: "bg-zinc-800 text-zinc-400" },
    void: { label: "DNP", className: "bg-zinc-800 text-zinc-400" },
};

// small hit rate chip: 'L10 60%', green from 50% up
function RateChip({ label, split }: { label: string, split: NbaHitRateSplit | null }) {
    if (!split || split.hit_rate === null) return null;
    const good = split.hit_rate >= 50;
    return (
        <span className="px-1.5 rounded text-xs tabular-nums bg-zinc-800 text-zinc-400" title={`${split.label}: ${split.hits}/${split.games} games, avg ${split.average}`}>
            {label} <span className={good ? "text-emerald-400" : "text-rose-400"}>{Math.round(split.hit_rate)}%</span>
        </span>
    );
}

// one leg: result, player prop or team bet, game, hit rates; open legs can be removed
function LegRow({ leg, onRemove }: { leg: ParlayLeg, onRemove: () => void }) {

    const status = LEG_STATUS[leg.status];
    const outcome = legOutcome(leg);
    const name = leg.kind === "player" ? leg.player_name : leg.team_name;
    const open = leg.status === "pending" || leg.status === "no_game";

    return (
        <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
            <span className={`w-16 shrink-0 text-center px-1.5 py-0.5 rounded text-xs font-semibold ${status.className}`}>
                {status.label}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
                <span>
                    <Link
                        className="font-medium hover:text-sky-400 hover:underline"
                        to={leg.kind === "player" ? `/nba/player/${leg.player_id}` : `/nba/team/${leg.team_id}`}
                    >
                        {name}
                    </Link>
                    <span className="ml-2 text-zinc-300">{legBet(leg)}</span>
                    {leg.odds !== null && <span className="ml-2 text-zinc-400 tabular-nums" title="Odds when added">@ {leg.odds.toFixed(2)}</span>}
                    {outcome && <span className="ml-2 text-zinc-500">· {outcome}</span>}
                </span>
                <span className="text-sm text-zinc-500">
                    {leg.game ?
                        <Link className="hover:text-sky-400 hover:underline" to={`/nba/game/${leg.game.id}`}>
                            {leg.game.is_home ? "vs" : "@"} {leg.game.opponent} · {gameDateTime(leg.game)}
                        </Link> :
                        "No game scheduled"
                    }
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <RateChip label="L5" split={leg.hit_rates.last5} />
                <RateChip label="L10" split={leg.hit_rates.last10} />
                <RateChip label="Season" split={leg.hit_rates.season} />
                {leg.game && <RateChip label={`vs ${leg.game.opponent}`} split={leg.hit_rates.opponent} />}
            </div>
            {open ?
                <button
                    className="self-start sm:self-center p-1 rounded-md cursor-pointer text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    type="button"
                    aria-label={`Remove ${name} from the parlay`}
                    onClick={onRemove}
                >
                    <X size={16} />
                </button> :
                <span className="hidden sm:block w-6" />
            }
        </li>
    )
}

// one parlay: name and status, legs, the estimated chance and the bookmaker's odds
function ParlayCard({ parlay, onChange }: { parlay: Parlay, onChange: () => void }) {

    const [odds, setOdds] = useState(parlay.odds === null ? "" : String(parlay.odds));
    const [oddsError, setOddsError] = useState("");

    const status = PARLAY_STATUS[parlay.status];
    // estimate before the games, and while some legs are settled the chance right now
    const chance = estimateParlay(parlay.legs);
    const liveChance = estimateParlay(parlay.legs, true);
    const implied = parlay.odds ? 1 / parlay.odds : null;
    const open = parlay.status === "pending" || parlay.status === "empty";
    // every leg has its own odds: their product is the parlay's odds (before any boost)
    const legsOdds = parlay.legs.length > 0 && parlay.legs.every((l) => l.odds !== null)
        ? Math.round(parlay.legs.reduce((product, l) => product * (l.odds as number), 1) * 100) / 100
        : null;

    // odds are saved when the field loses focus (or text is given), empty removes them
    const saveOdds = async (text = odds) => {
        const value = text.trim() === "" ? null : Number(text.replace(",", "."));
        if (value === parlay.odds) return;
        if (value !== null && (!Number.isFinite(value) || value < 1.01)) {
            setOddsError("Decimal odds, e.g. 6.50");
            return;
        }
        setOddsError("");
        try {
            await updateParlay(parlay.id, { odds: value });
            onChange();
        } catch (err) {
            setOddsError(err instanceof ApiError ? err.message : "Couldn't save the odds");
        }
    };

    const rename = async () => {
        const name = prompt("Parlay name", parlay.name)?.trim();
        if (!name || name === parlay.name) return;
        try {
            await updateParlay(parlay.id, { name });
            onChange();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "Couldn't rename the parlay");
        }
    };

    const remove = async () => {
        if (!confirm(`Delete "${parlay.name}"?`)) return;
        try {
            await deleteParlay(parlay.id);
            onChange();
        } catch {
            alert("Couldn't delete the parlay, please try again");
        }
    };

    const removeLeg = async (legId: number) => {
        try {
            await deleteLeg(parlay.id, legId);
            onChange();
        } catch {
            alert("Couldn't remove the leg, please try again");
        }
    };

    return (
        <section className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <button className="text-lg font-semibold text-left cursor-pointer hover:text-sky-400" type="button" title="Rename" onClick={rename}>
                    {parlay.name}
                </button>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${status.className}`}>{status.label}</span>
                <span className="text-sm text-zinc-500">{parlay.legs.length} {parlay.legs.length === 1 ? "leg" : "legs"}</span>
                <button
                    className="ml-auto p-1.5 rounded-md cursor-pointer text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                    type="button"
                    aria-label={`Delete ${parlay.name}`}
                    onClick={remove}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {parlay.legs.length === 0 ?
                <p className="text-sm text-zinc-500">
                    No legs yet. Check a prop in the <Link className="text-sky-400 hover:underline" to="/props">prop checker</Link> and add it here.
                </p> :
                <ul className="flex flex-col divide-y divide-zinc-800">
                    {parlay.legs.map((leg) => <LegRow key={leg.id} leg={leg} onRemove={() => removeLeg(leg.id)} />)}
                </ul>
            }

            {parlay.legs.length > 0 &&
                <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pt-3 border-t border-zinc-800 text-sm">
                    <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-zinc-500">
                            Estimated chance <EstimateInfo legs={parlay.legs} />
                        </span>
                        <span className="text-xl font-semibold tabular-nums">
                            {chance === null ? "–" : percent(chance)}
                        </span>
                        <span className="text-xs text-zinc-500">
                            {!open ? "before the games" :
                                parlay.legs.some(isSettled) && liveChance !== null ? `now ${percent(liveChance)}` :
                                "blended hit rates"}
                        </span>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-zinc-500">Odds</span>
                        <input
                            className="w-24 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-100 focus:outline-none focus:border-sky-500"
                            inputMode="decimal"
                            placeholder="e.g. 6.50"
                            value={odds}
                            onChange={(e) => setOdds(e.target.value)}
                            onBlur={() => saveOdds()}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        />
                        {legsOdds !== null && legsOdds !== parlay.odds &&
                            <button
                                className="w-fit text-xs text-sky-400 hover:underline cursor-pointer"
                                type="button"
                                title="The legs' odds multiplied together"
                                onClick={() => { setOdds(String(legsOdds)); saveOdds(String(legsOdds)); }}
                            >
                                Use legs' {legsOdds.toFixed(2)}
                            </button>
                        }
                    </label>
                    {implied !== null &&
                        <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-wide text-zinc-500">Odds imply</span>
                            <span className="text-xl font-semibold tabular-nums">{(implied * 100).toFixed(1)}%</span>
                            {chance !== null &&
                                <span className={`text-xs ${chance > implied ? "text-emerald-400" : "text-rose-400"}`}>
                                    {chance > implied ? "estimate is above the odds" : "estimate is below the odds"}
                                </span>
                            }
                        </div>
                    }
                    {oddsError && <span className="text-rose-400">{oddsError}</span>}
                </div>
            }
        </section>
    )
}

// member's parlays: create, follow and settle them automatically from the box scores
function ParlaysPage() {

    const { data: session, isPending } = authClient.useSession();

    const [parlays, setParlays] = useState<Parlay[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setParlays(await getParlays());
        } catch {
            setError("Couldn't load parlays, please try again");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session) load();
    }, [session, load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setError("");
        try {
            await createParlay(name.trim());
            setName("");
            load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't create the parlay");
        }
    };

    if (isPending) return <Loading />;

    if (!session) {
        return (
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold">Parlays</h1>
                <SignInPrompt
                    title="Parlays are for members"
                    text="Save props into parlays, see each leg's hit rates and a combined chance, and have them graded automatically after the games."
                />
            </div>
        );
    }

    if (loading) return <Loading />;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="flex items-center gap-2 text-3xl font-bold"><Layers size={26} className="text-sky-400" /> Parlays</h1>
                    <p className="text-sm text-zinc-500">Legs are graded automatically from the box score once their game is played.</p>
                    <p className="text-sm text-zinc-500">
                        Like at bookmakers, one game can't have two bets on the same outcome: one moneyline or spread,
                        one game total, one 1st half total, one bet per team stat, and one prop per player stat.
                    </p>
                </div>
                <form className="flex gap-2" onSubmit={create}>
                    <input
                        className="w-full sm:w-56 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
                        placeholder="New parlay name"
                        maxLength={60}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button
                        className="px-4 py-2 rounded-lg font-medium cursor-pointer bg-sky-500 hover:bg-sky-400 text-on-accent disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={!name.trim()}
                    >
                        Create
                    </button>
                </form>
            </div>
            {error && <p className="text-rose-400">{error}</p>}
            {parlays.length === 0 ?
                <p className="text-zinc-500 py-8 text-center">
                    No parlays yet. Create one above, or check a prop in the <Link className="text-sky-400 hover:underline" to="/props">prop checker</Link> and add it straight to a new parlay.
                </p> :
                // key with the odds: a reload with new odds resets the card's odds field
                parlays.map((p) => <ParlayCard key={`${p.id}-${p.odds}`} parlay={p} onChange={load} />)
            }
        </div>
    )
}

export default ParlaysPage;
