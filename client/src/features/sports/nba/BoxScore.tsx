import type { NbaBoxScore } from "../../../types/nba";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import table from "../../../styles/table";

type SortKey = "minutes" | "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fga" | "fg3a" | "fta";

// sortable columns, shooting columns sort by attempts
const COLUMNS: { label: string, key: SortKey }[] = [
    { label: "MIN", key: "minutes" },
    { label: "PTS", key: "pts" },
    { label: "REB", key: "reb" },
    { label: "AST", key: "ast" },
    { label: "STL", key: "stl" },
    { label: "BLK", key: "blk" },
    { label: "TOV", key: "tov" },
    { label: "FG", key: "fga" },
    { label: "3PT", key: "fg3a" },
    { label: "FT", key: "fta" },
];

// "made-attempted" shooting format, e.g. 8-15
const shooting = (made: number, attempted: number) => `${made}-${attempted}`;

// one team's box score table, sorted by minutes at first, totals on the last row
function TeamBox({ team, team_id, players }: { team: string, team_id: number, players: NbaBoxScore[] }) {

    const [sortKey, setSortKey] = useState<SortKey>("minutes");
    const [ascending, setAscending] = useState(false);

    // new column starts descending, clicking the same column again flips the direction
    const changeSort = (key: SortKey) => {
        if (key === sortKey) {
            setAscending(!ascending);
        } else {
            setSortKey(key);
            setAscending(false);
        }
    };

    const sorted = [...players].sort((a, b) => ascending ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);

    // sums the given stat over all players
    const total = (key: keyof NbaBoxScore) => players.reduce((sum, p) => sum + Number(p[key]), 0);

    return (
        <div className="flex flex-col gap-2 min-w-0">
            <Link className="w-fit font-semibold text-zinc-300 hover:text-sky-400 hover:underline" to={`/nba/team/${team_id}`}>{team}</Link>
            {players.length === 0 ?
                <p className="text-zinc-500">No stats for this team</p> :
                <div className={table.wrapper}>
                    <table className={table.table}>
                        <thead>
                            <tr className={table.headRow}>
                                <th className={`${table.th} text-left`}>Player</th>
                                {COLUMNS.map((c) => (
                                    <th key={c.key} className={table.th}>
                                        <button
                                            className={table.sortButton(sortKey === c.key)}
                                            type="button"
                                            onClick={() => changeSort(c.key)}
                                        >
                                            {c.label}
                                            {sortKey === c.key && (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((p) => (
                                <tr key={p.player_id} className={table.row}>
                                    <td className={`${table.td} text-left`}>
                                        <Link className={table.link} to={`/nba/player/${p.player_id}`}>
                                            {p.player_name}
                                        </Link>
                                    </td>
                                    <td className={`${table.td} text-zinc-400`}>{Math.round(p.minutes)}</td>
                                    <td className={`${table.td} font-semibold`}>{p.pts}</td>
                                    <td className={table.td}>{p.reb}</td>
                                    <td className={table.td}>{p.ast}</td>
                                    <td className={table.td}>{p.stl}</td>
                                    <td className={table.td}>{p.blk}</td>
                                    <td className={table.td}>{p.tov}</td>
                                    <td className={table.td}>{shooting(p.fgm, p.fga)}</td>
                                    <td className={table.td}>{shooting(p.fg3m, p.fg3a)}</td>
                                    <td className={table.td}>{shooting(p.ftm, p.fta)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className={table.footRow}>
                                <td className={`${table.td} text-left`}>Total</td>
                                <td className={table.td}></td>
                                <td className={table.td}>{total("pts")}</td>
                                <td className={table.td}>{total("reb")}</td>
                                <td className={table.td}>{total("ast")}</td>
                                <td className={table.td}>{total("stl")}</td>
                                <td className={table.td}>{total("blk")}</td>
                                <td className={table.td}>{total("tov")}</td>
                                <td className={table.td}>{shooting(total("fgm"), total("fga"))}</td>
                                <td className={table.td}>{shooting(total("fg3m"), total("fg3a"))}</td>
                                <td className={table.td}>{shooting(total("ftm"), total("fta"))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }
        </div>
    )
}

function BoxScore({ boxScore, away_team, away_team_id, home_team, home_team_id }:
    { boxScore: NbaBoxScore[], away_team: string, away_team_id: number, home_team: string, home_team_id: number }) {

    const awayPlayers = boxScore.filter((val) => val.team_id === away_team_id);
    const homePlayers = boxScore.filter((val) => val.team_id === home_team_id);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <TeamBox team={away_team} team_id={away_team_id} players={awayPlayers} />
            <TeamBox team={home_team} team_id={home_team_id} players={homePlayers} />
        </div>
    )
}

export default BoxScore;
