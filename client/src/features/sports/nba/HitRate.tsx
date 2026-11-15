import type { NbaHitRate, NbaRosterPlayer, NbaSide, NbaStat, NbaTeam } from "../../../types/nba";
import { getHitRate } from "../../../api/nba/nbaPlayerGamesApi";
import { getOne, getRoster } from "../../../api/nba/nbaTeamsApi";
import { useState, useEffect } from "react";

// stats shown in the stat dropdown, value is what the api expects
const STATS: { value: NbaStat, label: string }[] = [
    { value: "pts", label: "Points" },
    { value: "reb", label: "Rebounds" },
    { value: "ast", label: "Assists" },
    { value: "pra", label: "Pts + Reb + Ast" },
    { value: "pr", label: "Pts + Reb" },
    { value: "pa", label: "Pts + Ast" },
    { value: "ra", label: "Reb + Ast" },
    { value: "fg3m", label: "3-pointers made" },
    { value: "fgm", label: "Field goals made" },
    { value: "ftm", label: "Free throws made" },
    { value: "stl", label: "Steals" },
    { value: "blk", label: "Blocks" },
    { value: "stocks", label: "Steals + Blocks" },
    { value: "tov", label: "Turnovers" },
];

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
        } catch {
            setResult(null);
            setErrorMessage("Couldn't calculate hit rate, please try again");
        } finally {
            setCalculating(false);
        }
    };

    if (loading) return <p className="text-2xl">Loading hit rate...</p>;

    const roster = rosterSelected === team1_id ? team1Roster : team2Roster;
    const canCalculate = playerSelected !== null && line !== "" && !calculating;

    return (
        <div className="col-span-2 mt-6">
            <span className="text-2xl underline">Calculate hit rate</span>
            <form className="flex flex-wrap gap-8 mt-4" onSubmit={calculate}>
                <div className="flex flex-col space-y-3">
                    <label className="flex flex-col">
                        <span className="text-xl">Select team:</span>
                        <select
                            className="border w-fit rounded p-1"
                            value={rosterSelected}
                            onChange={(e) => changeTeam(Number(e.target.value))}
                        >
                            <option value={team1_id}>{team1?.name}</option>
                            {team2_id && <option value={team2_id}>{team2?.name}</option>}
                        </select>
                    </label>
                    <label className="flex flex-col">
                        <span className="text-xl">Select player:</span>
                        <select
                            className="border w-fit rounded p-1"
                            value={playerSelected ?? ""}
                            onChange={(e) => setPlayerSelected(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">-- choose player --</option>
                            {roster.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col">
                        <span className="text-xl">Stat:</span>
                        <select
                            className="border w-fit rounded p-1"
                            value={stat}
                            onChange={(e) => setStat(e.target.value as NbaStat)}
                        >
                            {STATS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex space-x-4">
                        <label className="flex flex-col">
                            <span className="text-xl">Side:</span>
                            <select
                                className="border w-fit rounded p-1"
                                value={side}
                                onChange={(e) => setSide(e.target.value as NbaSide)}
                            >
                                <option value="over">Over</option>
                                <option value="under">Under</option>
                            </select>
                        </label>
                        <label className="flex flex-col">
                            <span className="text-xl">Line:</span>
                            <input
                                className="border w-24 rounded p-1"
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="e.g. 24.5"
                                value={line}
                                onChange={(e) => setLine(e.target.value)}
                            />
                        </label>
                        <label className="flex flex-col">
                            <span className="text-xl">Last games:</span>
                            <select
                                className="border w-fit rounded p-1"
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
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={vsOpponent}
                                onChange={(e) => setVsOpponent(e.target.checked)}
                            />
                            <span>Only games against {opponent.name}</span>
                        </label>
                    }
                </div>

                <div className="flex flex-col space-y-3 min-w-64">
                    <button
                        className="bg-blue-500 text-white rounded px-4 py-2 w-fit cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={!canCalculate}
                    >
                        {calculating ? "Calculating..." : "Calculate"}
                    </button>
                    {errorMessage && <p className="text-red-600">{errorMessage}</p>}
                    {result && (
                        result.games === 0 ?
                            <p className="text-gray-500">No games found</p> :
                            <div className="flex flex-col space-y-2">
                                <p className="text-3xl font-bold">{result.hit_rate}%</p>
                                <p>
                                    {result.side} {result.line}: {result.hits}/{result.games} games, avg {result.average}
                                </p>
                                <ul className="flex flex-col space-y-1">
                                    {result.results.map((r) => (
                                        <li key={r.game_id} className={r.hit ? "text-green-700" : "text-red-600"}>
                                            {new Date(r.game_date).toLocaleDateString("fi-FI")} {r.is_home ? "vs" : "@"} {r.opponent}: {r.value} ({r.minutes} min)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                    )}
                </div>
            </form>
        </div>
    )
}

export default HitRate;
