import type { NbaHitRate, NbaRosterPlayer, NbaSide, NbaStat, NbaTeam } from "../../../types/nba";
import { getHitRate } from "../../../api/nba/nbaPlayerGamesApi";
import { getOne, getRoster } from "../../../api/nba/nbaTeamsApi";
import { useState, useEffect } from "react";
import { STATS } from "./hitRateStats";
import HitRateResult from "./HitRateResult";
import HitRateSplits from "./HitRateSplits";
import AddToParlay from "../../parlays/AddToParlay";

function HitRate({ team1_id, team2_id }: { team1_id: number, team2_id?: number }) {

    const [loading, setLoading] = useState(true);

    const [team1, setTeam1] = useState<NbaTeam | null>(null);
    const [team2, setTeam2] = useState<NbaTeam | null>(null);

    const [team1Roster, setTeam1Roster] = useState<NbaRosterPlayer[]>([]);
    const [team2Roster, setTeam2Roster] = useState<NbaRosterPlayer[]>([]);

    const [rosterSelected, setRosterSelected] = useState<number>(team1_id);
    const [playerSelected, setPlayerSelected] = useState<number | null>(null);

    // bet selections
    const [stat, setStat] = useState<NbaStat>("pts");
    const [line, setLine] = useState("");
    const [side, setSide] = useState<NbaSide>("over");
    const [limit, setLimit] = useState(10);
    const [vsOpponent, setVsOpponent] = useState(false);

    const [calculating, setCalculating] = useState(false);
    const [result, setResult] = useState<NbaHitRate | null>(null);
    // player the result was calculated for, the select may already show another one
    const [resultPlayer, setResultPlayer] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                // fetch everything in parallel, use the local values (state isn't updated yet inside this effect)
                const [t1, r1, t2, r2] = await Promise.all([
                    getOne(team1_id),
                    getRoster(team1_id),
                    team2_id ? getOne(team2_id) : null,
                    team2_id ? getRoster(team2_id) : [],
                ]);
                if (!cancelled) {
                    setTeam1(t1);
                    setTeam1Roster(r1);
                    setTeam2(t2);
                    setTeam2Roster(r2);
                }
            } catch {
                if (cancelled) return;
                alert("Something went wrong, please try again");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [team1_id, team2_id]);

    // switching team clears the player, since the old one isn't in the new roster
    const changeTeam = (team_id: number) => {
        setRosterSelected(team_id);
        setPlayerSelected(null);
        setResult(null);
    };

    // opponent is the team that isn't selected, undefined if there's only one team
    const opponent = rosterSelected === team1_id ? team2 : team1;

    const calculate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerSelected || line === "") return;
        setCalculating(true);
        setErrorMessage("");
        try {
            const res = await getHitRate(
                playerSelected,
                { stat, line: Number(line), side, limit },
                vsOpponent && opponent ? opponent.id : undefined,
            );
            setResult(res);
            setResultPlayer(playerSelected);
        } catch {
            setResult(null);
            setErrorMessage("Couldn't calculate hit rate, please try again");
        } finally {
            setCalculating(false);
        }
    };

    if (loading) return <p className="text-zinc-400">Loading hit rate...</p>;

    const roster = rosterSelected === team1_id ? team1Roster : team2Roster;
    const canCalculate = playerSelected !== null && line !== "" && !calculating;

    // shared look of the form controls
    const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";
    const label = "text-xs font-medium uppercase tracking-wide text-zinc-400";

    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-xl font-semibold">Calculate hit rate</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4" onSubmit={calculate}>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                            <span className={label}>Team</span>
                            <select
                                className={control}
                                value={rosterSelected}
                                onChange={(e) => changeTeam(Number(e.target.value))}
                            >
                                <option value={team1_id}>{team1?.name}</option>
                                {team2_id && <option value={team2_id}>{team2?.name}</option>}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className={label}>Player</span>
                            <select
                                className={control}
                                value={playerSelected ?? ""}
                                onChange={(e) => setPlayerSelected(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">-- choose player --</option>
                                {roster.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className={label}>Stat</span>
                        <select
                            className={control}
                            value={stat}
                            onChange={(e) => setStat(e.target.value as NbaStat)}
                        >
                            {STATS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className={label}>Side</span>
                            {/* over / under as a two-button toggle */}
                            <div className="flex rounded-md border border-zinc-700 overflow-hidden">
                                {(["over", "under"] as NbaSide[]).map((s) => (
                                    <button
                                        key={s}
                                        className={`flex-1 py-1.5 cursor-pointer capitalize ${side === s ? "bg-sky-500 text-on-accent" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                                        type="button"
                                        onClick={() => setSide(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="flex flex-col gap-1">
                            <span className={label}>Line</span>
                            <input
                                className={control}
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="e.g. 24.5"
                                value={line}
                                onChange={(e) => setLine(e.target.value)}
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className={label}>Last games</span>
                            <select
                                className={control}
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                            >
                                {[5, 10, 15, 20, 30].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {opponent &&
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-fit">
                            <input
                                className="accent-sky-500 w-4 h-4"
                                type="checkbox"
                                checked={vsOpponent}
                                onChange={(e) => setVsOpponent(e.target.checked)}
                            />
                            <span>Only games against {opponent.name}</span>
                        </label>
                    }
                    <button
                        className="mt-1 bg-sky-500 hover:bg-sky-400 text-on-accent font-medium rounded-md px-4 py-2 cursor-pointer disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={!canCalculate}
                    >
                        {calculating ? "Calculating..." : "Calculate"}
                    </button>
                </div>

                <div className="flex flex-col gap-3 md:border-l md:border-zinc-800 md:pl-6">
                    {errorMessage && <p className="text-rose-400">{errorMessage}</p>}
                    {!result && !errorMessage &&
                        <p className="text-zinc-500">Choose a player, stat and line to see how often it would have hit.</p>
                    }
                    {result && resultPlayer !== null &&
                        <HitRateResult result={result}>
                            <HitRateSplits player_id={resultPlayer} result={result} opponent_id={opponent?.id} />
                            <AddToParlay player_id={resultPlayer} stat={result.stat} line={result.line} side={result.side} />
                        </HitRateResult>
                    }
                </div>
            </form>
        </section>
    )
}

export default HitRate;
