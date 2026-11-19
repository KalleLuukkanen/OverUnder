import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlayersGames } from "../../../api/nba/nbaPlayerGamesApi";
import type { NbaBoxScore, NbaSide, NbaStat } from "../../../types/nba";
import table from "../../../styles/table";
import { isPostseason, gameTypeTag, overtimeLabel } from "../../../utils/nbaGame";
import { STATS, statValue } from "./hitRateStats";

// a line being checked against the games, e.g. over 25.5 points
type Prop = { stat: NbaStat, line: number, side: NbaSide };

const isHit = (prop: Prop, value: number) => prop.side === "over" ? value > prop.line : value < prop.line;

type Stat = "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fgm" | "fga" | "fg3m" | "fg3a" | "ftm" | "fta" | "minutes";

// "made-attempted" shooting format, e.g. 8-15
const shooting = (made: number, attempted: number) => `${made}-${attempted}`;

// one part of the season (regular season or playoffs): a stat line per game and averages at the bottom
// the team column is only shown when the player played for more than one team (traded mid-season)
// with a prop, every game gets the stat's value marked as a hit or miss, and the title the hit rate
function StatLines({ title, games, prop }: { title: string, games: NbaBoxScore[], prop: Prop | null }) {

    const showTeam = new Set(games.map((g) => g.team)).size > 1;
    const hits = prop ? games.filter((g) => isHit(prop, statValue(prop.stat, g))).length : 0;
    const hitRate = Math.round((hits / games.length) * 100);
    const propShort = prop ? STATS.find((s) => s.value === prop.stat)?.short : "";

    // per game average of a stat, one decimal
    const avg = (key: Stat) => (games.reduce((sum, g) => sum + g[key], 0) / games.length).toFixed(1);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">
                {title}
                <span className="ml-2 text-sm font-normal text-zinc-400">{games.length} {games.length === 1 ? "game" : "games"}</span>
                {prop &&
                    <span className="ml-3 text-sm font-normal">
                        <span className={`font-semibold ${hitRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{hitRate}%</span>
                        <span className="text-zinc-400"> hit · {hits}/{games.length} <span className="capitalize">{prop.side}</span> {prop.line} {propShort}</span>
                    </span>
                }
            </h3>
            <div className={table.wrapper}>
                <table className={table.table}>
                    <thead>
                        <tr className={table.headRow}>
                            <th className={`${table.th} text-left`}>Date</th>
                            {showTeam && <th className={`${table.th} text-left`}>Team</th>}
                            <th className={`${table.th} text-left`}>Game</th>
                            {prop && <th className={`${table.th} text-sky-400`}>{propShort}</th>}
                            <th className={table.th}>MIN</th>
                            <th className={table.th}>PTS</th>
                            <th className={table.th}>REB</th>
                            <th className={table.th}>AST</th>
                            <th className={table.th}>STL</th>
                            <th className={table.th}>BLK</th>
                            <th className={table.th}>TOV</th>
                            <th className={table.th}>FG</th>
                            <th className={table.th}>3PT</th>
                            <th className={table.th}>FT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map((g) => {
                            const tag = gameTypeTag(g.game_id);
                            const value = prop ? statValue(prop.stat, g) : 0;
                            const hit = prop ? isHit(prop, value) : false;
                            return (
                                <tr key={g.game_id} className={table.row}>
                                    <td className={`${table.td} text-left text-zinc-400`}>{new Date(g.game_date).toLocaleDateString("fi-FI")}</td>
                                    {showTeam && <td className={`${table.td} text-left text-zinc-400`}>{g.team}</td>}
                                    <td className={`${table.td} text-left`}>
                                        <Link className={table.link} to={`/nba/game/${g.game_id}`}>
                                            {g.is_home ? "vs" : "@"} {g.opponent}
                                        </Link>
                                        {overtimeLabel(g.overtime_periods) &&
                                            <span className="ml-2 px-1.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400">{overtimeLabel(g.overtime_periods)}</span>
                                        }
                                        {tag && <span className="ml-2 px-1.5 rounded text-xs bg-zinc-800 text-zinc-400">{tag}</span>}
                                    </td>
                                    {prop &&
                                        <td className={table.td}>
                                            <span className={`inline-block min-w-8 px-1.5 rounded font-semibold ${hit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                                                {value}
                                            </span>
                                        </td>
                                    }
                                    <td className={`${table.td} text-zinc-400`}>{Math.round(g.minutes)}</td>
                                    <td className={`${table.td} font-semibold`}>{g.pts}</td>
                                    <td className={table.td}>{g.reb}</td>
                                    <td className={table.td}>{g.ast}</td>
                                    <td className={table.td}>{g.stl}</td>
                                    <td className={table.td}>{g.blk}</td>
                                    <td className={table.td}>{g.tov}</td>
                                    <td className={table.td}>{shooting(g.fgm, g.fga)}</td>
                                    <td className={table.td}>{shooting(g.fg3m, g.fg3a)}</td>
                                    <td className={table.td}>{shooting(g.ftm, g.fta)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className={table.footRow}>
                            <td className={`${table.td} text-left`} colSpan={showTeam ? 3 : 2}>Average</td>
                            {prop && <td className={table.td}>{(games.reduce((sum, g) => sum + statValue(prop.stat, g), 0) / games.length).toFixed(1)}</td>}
                            <td className={table.td}>{avg("minutes")}</td>
                            <td className={table.td}>{avg("pts")}</td>
                            <td className={table.td}>{avg("reb")}</td>
                            <td className={table.td}>{avg("ast")}</td>
                            <td className={table.td}>{avg("stl")}</td>
                            <td className={table.td}>{avg("blk")}</td>
                            <td className={table.td}>{avg("tov")}</td>
                            <td className={table.td}>{shooting(Number(avg("fgm")), Number(avg("fga")))}</td>
                            <td className={table.td}>{shooting(Number(avg("fg3m")), Number(avg("fg3a")))}</td>
                            <td className={table.td}>{shooting(Number(avg("ftm")), Number(avg("fta")))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

// player's every game of a season in date order, regular season first and the playoffs below it
function PlayerSeasonGames({ player_id, season }: { player_id: number, season: string }) {

    const [games, setGames] = useState<NbaBoxScore[]>([]);
    const [loading, setLoading] = useState(true);

    // line checker, the games update as soon as a line is typed
    const [stat, setStat] = useState<NbaStat>("pts");
    const [side, setSide] = useState<NbaSide>("over");
    const [line, setLine] = useState("");
    const prop: Prop | null = line !== "" && Number.isFinite(Number(line)) ? { stat, side, line: Number(line) } : null;

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = async () => {
            try {
                const result = await getPlayersGames(player_id, season);
                // the api gives latest first, a season reads better from the first game on
                if (!cancelled) setGames([...result].reverse());
            } catch {
                if (!cancelled) setGames([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player_id, season]);

    if (loading) return <p className="text-zinc-400">Loading games...</p>;
    if (games.length === 0) return <p className="text-zinc-500">No games played this season</p>;

    const regular = games.filter((g) => !isPostseason(g.game_id));
    const playoffs = games.filter((g) => isPostseason(g.game_id));

    const control = "bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 focus:outline-none focus:border-sky-500";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Check a line</span>
                <select className={control} value={stat} aria-label="Stat" onChange={(e) => setStat(e.target.value as NbaStat)}>
                    {STATS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="flex rounded-md border border-zinc-700 overflow-hidden" role="group" aria-label="Side">
                    {(["over", "under"] as NbaSide[]).map((s) => (
                        <button
                            key={s}
                            className={`px-3 py-1.5 cursor-pointer capitalize ${side === s ? "bg-sky-500 text-on-accent" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-800"}`}
                            type="button"
                            aria-pressed={side === s}
                            onClick={() => setSide(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <input
                    className={`${control} w-24`}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 24.5"
                    aria-label="Line"
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                />
                {line !== "" &&
                    <button className="px-2 py-1.5 rounded-md cursor-pointer text-zinc-500 hover:text-white hover:bg-zinc-800" type="button" onClick={() => setLine("")}>
                        Clear
                    </button>
                }
            </div>
            {regular.length > 0 && <StatLines title="Regular season" games={regular} prop={prop} />}
            {playoffs.length > 0 && <StatLines title="Playoffs" games={playoffs} prop={prop} />}
        </div>
    )
}

export default PlayerSeasonGames;
