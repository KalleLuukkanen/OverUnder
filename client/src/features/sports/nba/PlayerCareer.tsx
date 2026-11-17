import { getPlayersCareer } from "../../../api/nba/nbaPlayersApi";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import table from "../../../styles/table";
import type { NbaAverages, NbaPlayerCareer, NbaPlayerSeason } from "../../../types/nba";

type SeasonType = "regular" | "playoffs";

type SortKey = "season" | "games" | "minutes" | "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fg_pct" | "fg3_pct" | "ft_pct";

// sortable stat columns after Season and Team
const COLUMNS: { label: string, key: SortKey }[] = [
    { label: "GP", key: "games" },
    { label: "MIN", key: "minutes" },
    { label: "PTS", key: "pts" },
    { label: "REB", key: "reb" },
    { label: "AST", key: "ast" },
    { label: "STL", key: "stl" },
    { label: "BLK", key: "blk" },
    { label: "TOV", key: "tov" },
    { label: "FG%", key: "fg_pct" },
    { label: "3P%", key: "fg3_pct" },
    { label: "FT%", key: "ft_pct" },
];

// percentage with one decimal, '-' when there were no attempts
const pct = (value: number | null) => value === null ? "-" : value.toFixed(1);

// compares two seasons by the given column, missing values (null) always go last
const compareSeasons = (a: NbaPlayerSeason, b: NbaPlayerSeason, key: SortKey, ascending: boolean) => {
    if (key === "season") {
        return ascending ? a.season.localeCompare(b.season) : b.season.localeCompare(a.season);
    }
    const x = a[key];
    const y = b[key];
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return ascending ? x - y : y - x;
};

// the stat cells shared by season rows and the career row
function AverageCells({ avg }: { avg: NbaAverages }) {
    return (
        <>
            <td className={table.td}>{avg.games}</td>
            <td className={table.td}>{avg.minutes === null ? "-" : avg.minutes.toFixed(1)}</td>
            <td className={`${table.td} font-semibold`}>{avg.pts.toFixed(1)}</td>
            <td className={table.td}>{avg.reb.toFixed(1)}</td>
            <td className={table.td}>{avg.ast.toFixed(1)}</td>
            <td className={table.td}>{avg.stl.toFixed(1)}</td>
            <td className={table.td}>{avg.blk.toFixed(1)}</td>
            <td className={table.td}>{avg.tov.toFixed(1)}</td>
            <td className={table.td}>{pct(avg.fg_pct)}</td>
            <td className={table.td}>{pct(avg.fg3_pct)}</td>
            <td className={table.td}>{pct(avg.ft_pct)}</td>
        </>
    )
}

// header button that sorts by its column, the active column is blue with an arrow
function SortHeader({ label, active, ascending, onClick, alignLeft = false }:
    { label: string, active: boolean, ascending: boolean, onClick: () => void, alignLeft?: boolean }) {
    return (
        <button
            className={table.sortButton(active, alignLeft)}
            type="button"
            onClick={onClick}
        >
            {label}
            {active && (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </button>
    )
}

// player's per game averages for every season and the whole career, regular season or playoffs
function PlayerCareer({ player_id }: { player_id: number }) {

    const [career, setCareer] = useState<NbaPlayerCareer | null>(null);
    const [seasonType, setSeasonType] = useState<SeasonType>("regular");
    const [loading, setLoading] = useState(true);

    // oldest season first at start
    const [sortKey, setSortKey] = useState<SortKey>("season");
    const [ascending, setAscending] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const result = await getPlayersCareer(player_id);
                if (!cancelled) setCareer(result);
            } catch {
                if (!cancelled) setCareer(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id]);

    // new column starts descending, clicking the same column again flips the direction
    const changeSort = (key: SortKey) => {
        if (key === sortKey) {
            setAscending(!ascending);
        } else {
            setSortKey(key);
            setAscending(false);
        }
    };

    if (loading) return <p className="text-zinc-400">Loading career stats...</p>
    if (!career) return <p className="text-zinc-500">Career stats not available</p>

    const part = career[seasonType];
    const sorted = [...part.seasons].sort((a, b) => compareSeasons(a, b, sortKey, ascending));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex w-fit p-1 gap-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                {(["regular", "playoffs"] as SeasonType[]).map((type) => (
                    <button
                        key={type}
                        className={`px-3 py-1 rounded-md text-sm cursor-pointer ${seasonType === type ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        type="button"
                        onClick={() => setSeasonType(type)}
                    >
                        {type === "regular" ? "Regular season" : "Playoffs"}
                    </button>
                ))}
            </div>
            {part.career === null ?
                <p className="text-zinc-500">No {seasonType === "regular" ? "regular season" : "playoff"} games</p> :
                <div className={table.wrapper}>
                    <table className={table.table}>
                        <thead>
                            <tr className={table.headRow}>
                                <th className={`${table.th} text-left`}>
                                    <SortHeader
                                        label="Season"
                                        active={sortKey === "season"}
                                        ascending={ascending}
                                        onClick={() => changeSort("season")}
                                        alignLeft
                                    />
                                </th>
                                <th className={`${table.th} text-left`}>Team</th>
                                {COLUMNS.map((c) => (
                                    <th key={c.key} className={table.th}>
                                        <SortHeader
                                            label={c.label}
                                            active={sortKey === c.key}
                                            ascending={ascending}
                                            onClick={() => changeSort(c.key)}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((s) => (
                                <tr key={s.season} className={table.row}>
                                    <td className={`${table.td} text-left`}>{s.season}</td>
                                    <td className={`${table.td} text-left text-zinc-400`}>{s.teams}</td>
                                    <AverageCells avg={s} />
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className={table.footRow}>
                                <td className={`${table.td} text-left`}>Career</td>
                                <td className={`${table.td} text-left text-zinc-400`}>{part.career.seasons} seasons</td>
                                <AverageCells avg={part.career} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }
        </div>
    )
}

export default PlayerCareer;
