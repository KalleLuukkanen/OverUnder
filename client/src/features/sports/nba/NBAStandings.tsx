import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStandings } from "../../../api/nba/nbaSeasonApi";
import type { NbaStanding } from "../../../types/nba";
import table from "../../../styles/table";

// .812 like on standings pages, 1.000 for an unbeaten team
const formatPct = (pct: number) => pct === 1 ? "1.000" : pct.toFixed(3).slice(1);

// games behind the conference leader, '–' for the leader
const gamesBehind = (team: NbaStanding, leader: NbaStanding) => {
    const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
    return gb <= 0 ? "–" : gb.toFixed(1);
};

// one conference's table, the line after 6th (playoffs) and 10th (play-in)
function ConferenceTable({ title, teams }: { title: string, teams: NbaStanding[] }) {
    return (
        <div className="flex flex-col gap-2 min-w-0">
            <h3 className="font-semibold text-zinc-300">{title}</h3>
            <div className={table.wrapper}>
                <table className={table.table}>
                    <thead>
                        <tr className={table.headRow}>
                            <th className={`${table.th} text-left`}>Team</th>
                            <th className={table.th}>W</th>
                            <th className={table.th}>L</th>
                            <th className={table.th}>Pct</th>
                            <th className={table.th}>GB</th>
                            <th className={table.th}>Home</th>
                            <th className={table.th}>Away</th>
                            <th className={table.th}>L10</th>
                            <th className={table.th}>Strk</th>
                            <th className={table.th} title="Points per game">PPG</th>
                            <th className={table.th} title="Opponent points per game">Opp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((t, i) => (
                            <tr key={t.team_id} className={`${table.row} ${i === 5 || i === 9 ? "border-b-zinc-600!" : ""}`}>
                                <td className={`${table.td} text-left`}>
                                    <span className="inline-block w-5 text-zinc-500 tabular-nums">{i + 1}</span>
                                    <Link className={table.link} to={`/nba/team/${t.team_id}`} title={t.name}>{t.abbreviation}</Link>
                                </td>
                                <td className={`${table.td} font-semibold`}>{t.wins}</td>
                                <td className={`${table.td} font-semibold`}>{t.losses}</td>
                                <td className={table.td}>{formatPct(t.pct)}</td>
                                <td className={`${table.td} text-zinc-400`}>{gamesBehind(t, teams[0])}</td>
                                <td className={table.td}>{t.home_wins}-{t.home_losses}</td>
                                <td className={table.td}>{t.away_wins}-{t.away_losses}</td>
                                <td className={table.td}>{t.last10_wins}-{t.last10_losses}</td>
                                <td className={`${table.td} ${t.streak?.startsWith("W") ? "text-emerald-400" : "text-rose-400"}`}>{t.streak ?? "–"}</td>
                                <td className={table.td}>{t.points_for ?? "–"}</td>
                                <td className={table.td}>{t.points_against ?? "–"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// current season's standings by conference, from the played regular season games
function NBAStandings() {

    const [loading, setLoading] = useState(true);
    const [standings, setStandings] = useState<NbaStanding[]>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getStandings();
                if (!cancelled) setStandings(result);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    if (loading) return <p className="text-zinc-400">Loading standings...</p>;
    if (error) return <p className="text-rose-400">Couldn't load the standings, please try again</p>;
    if (standings.length === 0) return <p className="text-zinc-500">No games scheduled this season yet</p>;

    return (
        <div className="flex flex-col gap-4">
            <ConferenceTable title="Eastern Conference" teams={standings.filter((t) => t.conference === "East")} />
            <ConferenceTable title="Western Conference" teams={standings.filter((t) => t.conference === "West")} />
            <p className="text-xs text-zinc-500">
                Regular season games only. Top 6 go to the playoffs, 7–10 to the play-in. Ties are ordered by wins, not the NBA's tiebreakers.
            </p>
        </div>
    )
}

export default NBAStandings;
