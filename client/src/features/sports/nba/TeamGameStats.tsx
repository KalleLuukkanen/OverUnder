import type { NbaTeamGameStats } from "../../../types/nba";

type StatRow = {
    label: string,
    value: (t: NbaTeamGameStats) => number | null,   // compared between the teams
    show?: (t: NbaTeamGameStats) => string,            // shown text, defaults to the value
    lowerIsBetter?: boolean,
};

// made-attempted (percent), e.g. '48-99 (48.5%)'
const shooting = (made: number | null, attempted: number | null) => {
    if (made === null || attempted === null) return "-";
    const pct = attempted > 0 ? ` (${(100 * made / attempted).toFixed(1)}%)` : "";
    return `${made}-${attempted}${pct}`;
};

// shooting rows compare percentages, so 10-20 beats 11-30
const pct = (made: number | null, attempted: number | null) =>
    made === null || !attempted ? null : made / attempted;

const SECTIONS: { title: string, rows: StatRow[] }[] = [
    {
        title: "Shooting",
        rows: [
            { label: "Field goals", value: (t) => pct(t.fgm, t.fga), show: (t) => shooting(t.fgm, t.fga) },
            { label: "3-pointers", value: (t) => pct(t.fg3m, t.fg3a), show: (t) => shooting(t.fg3m, t.fg3a) },
            { label: "Free throws", value: (t) => pct(t.ftm, t.fta), show: (t) => shooting(t.ftm, t.fta) },
        ],
    },
    {
        title: "Totals",
        rows: [
            { label: "Rebounds", value: (t) => t.reb, show: (t) => `${t.reb ?? "-"} (${t.reb_off ?? "-"} off)` },
            { label: "Assists", value: (t) => t.ast },
            { label: "Steals", value: (t) => t.stl },
            { label: "Blocks", value: (t) => t.blk },
            { label: "Turnovers", value: (t) => t.tov, lowerIsBetter: true },
            { label: "Fouls", value: (t) => t.fouls, lowerIsBetter: true },
        ],
    },
    {
        title: "Scoring",
        rows: [
            { label: "Points in the paint", value: (t) => t.points_paint },
            { label: "Fast break points", value: (t) => t.points_fast_break },
            { label: "Second chance points", value: (t) => t.points_second_chance },
            { label: "Points off turnovers", value: (t) => t.points_off_turnovers },
            { label: "Bench points", value: (t) => t.points_bench },
        ],
    },
    {
        title: "Game flow",
        rows: [
            { label: "Biggest lead", value: (t) => t.biggest_lead },
            { label: "Biggest scoring run", value: (t) => t.biggest_run },
        ],
    },
];

// side-by-side team stats, the better value of each row is highlighted
function TeamGameStats({ away, home }: { away: NbaTeamGameStats, home: NbaTeamGameStats }) {

    // 'away' / 'home' / null (tie or unknown)
    const better = (row: StatRow) => {
        const a = row.value(away);
        const h = row.value(home);
        if (a === null || h === null || a === h) return null;
        return (a > h) !== Boolean(row.lowerIsBetter) ? "away" : "home";
    };

    const cell = (row: StatRow, team: NbaTeamGameStats, side: "away" | "home") => (
        <span className={`tabular-nums ${better(row) === side ? "text-zinc-100 font-semibold" : "text-zinc-400"}`}>
            {row.show ? row.show(team) : (row.value(team) ?? "-")}
        </span>
    );

    return (
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 px-4 py-2.5 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                <span className="font-semibold text-zinc-200">{away.team}</span>
                <span />
                <span className="text-right font-semibold text-zinc-200">{home.team}</span>
            </div>
            {SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col py-1 border-b border-zinc-800/60 last:border-b-0">
                    <span className="px-4 pt-1.5 text-[11px] uppercase tracking-wide text-zinc-500">{section.title}</span>
                    {section.rows.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-1">
                            {cell(row, away, "away")}
                            <span className="text-center text-zinc-500">{row.label}</span>
                            <span className="text-right">{cell(row, home, "home")}</span>
                        </div>
                    ))}
                </div>
            ))}
            {(away.lead_changes !== null || away.times_tied !== null) &&
                <p className="px-4 py-2.5 border-t border-zinc-800 text-zinc-400">
                    {away.lead_changes ?? 0} lead changes · tied {away.times_tied ?? 0} times
                </p>
            }
        </div>
    )
}

export default TeamGameStats;
