import type { NbaTeamGameStats } from "../../../types/nba";
import table from "../../../styles/table";

type Period = { label: string, points: (t: NbaTeamGameStats) => number | null };

// quarters, then overtimes: OT and 2OT separately, 3+ overtimes as one 'OT' column (dataset only splits the first two)
const periods = (overtime_periods: number): Period[] => {
    const list: Period[] = [
        { label: "Q1", points: (t) => t.q1 },
        { label: "Q2", points: (t) => t.q2 },
        { label: "Q3", points: (t) => t.q3 },
        { label: "Q4", points: (t) => t.q4 },
    ];
    if (overtime_periods > 2) {
        list.push({ label: "OT", points: (t) => t.ot_all });
    } else {
        if (overtime_periods >= 1) list.push({ label: "OT", points: (t) => t.ot1 });
        if (overtime_periods === 2) list.push({ label: "2OT", points: (t) => t.ot2 });
    }
    return list;
};

// final score from the periods, works even before the game's own score is synced
const total = (t: NbaTeamGameStats) =>
    [t.q1, t.q2, t.q3, t.q4, t.ot_all].reduce<number>((sum, p) => sum + (p ?? 0), 0);

// overtime periods from the points when the game doesn't know them yet
const overtimeFromPoints = (teams: NbaTeamGameStats[]) => {
    if (teams.some((t) => t.ot2 !== null && t.ot2 > 0)) return 2;
    return teams.some((t) => (t.ot_all ?? 0) > 0) ? 1 : 0;
};

// points per quarter for both teams, the team that won the period is highlighted
function LineScore({ teams, overtime_periods }: { teams: NbaTeamGameStats[], overtime_periods: number | null }) {

    const cols = periods(overtime_periods ?? overtimeFromPoints(teams));

    // bold the team that won the period
    const isBest = (col: Period, team: NbaTeamGameStats) => {
        const values = teams.map((t) => col.points(t) ?? 0);
        return (col.points(team) ?? 0) === Math.max(...values) && new Set(values).size > 1;
    };

    return (
        <div className={table.wrapper}>
            <table className={table.table}>
                <thead>
                    <tr className={table.headRow}>
                        <th className={`${table.th} text-left`}>Team</th>
                        {cols.map((c) => <th key={c.label} className={table.th}>{c.label}</th>)}
                        <th className={table.th}>T</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((t) => (
                        <tr key={t.team_id} className={table.row}>
                            <td className={`${table.td} text-left font-medium`}>{t.team}</td>
                            {cols.map((c) => (
                                <td key={c.label} className={`${table.td} ${isBest(c, t) ? "text-zinc-100 font-semibold" : "text-zinc-400"}`}>
                                    {c.points(t) ?? "-"}
                                </td>
                            ))}
                            <td className={`${table.td} font-bold`}>{total(t)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default LineScore;
