import type { NbaBoxScore } from "../../../types/nba";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
function TeamBox({ team, players }: { team: string, players: NbaBoxScore[] }) {

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
        <div className="flex flex-col space-y-3">
            <span className="text-2xl underline">{team}</span>
            {players.length === 0 ?
                <p className="text-gray-500">No stats for this team</p> :
                <div className="overflow-x-auto">
                    <table className="text-right bg-white rounded shadow">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-2">Player</th>
                                {COLUMNS.map((c) => (
                                    <th key={c.key} className="p-2">
                                        <button
                                            className={`flex items-center ml-auto cursor-pointer ${sortKey === c.key ? "text-blue-600" : ""}`}
                                            type="button"
                                            onClick={() => changeSort(c.key)}
                                        >
                                            {c.label}
                                            {sortKey === c.key && (ascending ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((p) => (
                                <tr key={p.player_id} className="border-b">
                                    <td className="text-left p-2 whitespace-nowrap">{p.player_name}</td>
                                    <td className="p-2">{Math.round(p.minutes)}</td>
                                    <td className="p-2 font-semibold">{p.pts}</td>
                                    <td className="p-2">{p.reb}</td>
                                    <td className="p-2">{p.ast}</td>
                                    <td className="p-2">{p.stl}</td>
                                    <td className="p-2">{p.blk}</td>
                                    <td className="p-2">{p.tov}</td>
                                    <td className="p-2">{shooting(p.fgm, p.fga)}</td>
                                    <td className="p-2">{shooting(p.fg3m, p.fg3a)}</td>
                                    <td className="p-2">{shooting(p.ftm, p.fta)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-semibold">
                                <td className="text-left p-2">Total</td>
                                <td className="p-2"></td>
                                <td className="p-2">{total("pts")}</td>
                                <td className="p-2">{total("reb")}</td>
                                <td className="p-2">{total("ast")}</td>
                                <td className="p-2">{total("stl")}</td>
                                <td className="p-2">{total("blk")}</td>
                                <td className="p-2">{total("tov")}</td>
                                <td className="p-2">{shooting(total("fgm"), total("fga"))}</td>
                                <td className="p-2">{shooting(total("fg3m"), total("fg3a"))}</td>
                                <td className="p-2">{shooting(total("ftm"), total("fta"))}</td>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <TeamBox team={away_team} players={awayPlayers} />
            <TeamBox team={home_team} players={homePlayers} />
        </div>
    )
}

export default BoxScore;
