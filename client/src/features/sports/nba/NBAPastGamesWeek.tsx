import type { NbaGame } from "../../../types/nba";
import NBAGameCard from "./NBAGameCard";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

// one day inside a week, date is 'yyyy-mm-dd'
export type GameDay = { date: string, games: NbaGame[] };

// turns 'yyyy-mm-dd' into a local date (avoids timezone shifting the day)
const toDate = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
};

// one week of played games, can be opened and closed
function NBAPastGamesWeek({ weekStart, days, defaultOpen = false }: { weekStart: string, days: GameDay[], defaultOpen?: boolean }) {

    const [open, setOpen] = useState(defaultOpen);

    const start = toDate(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const gameCount = days.reduce((sum, d) => sum + d.games.length, 0);

    return (
        <div className="flex flex-col border border-zinc-800 rounded-lg">
            <button
                className="flex items-center justify-between gap-4 px-3 py-2 cursor-pointer rounded-lg hover:bg-zinc-800/50"
                type="button"
                onClick={() => setOpen(!open)}
            >
                <span className="font-medium">
                    Week {start.toLocaleDateString("fi-FI")} - {end.toLocaleDateString("fi-FI")}
                    <span className="ml-2 text-sm font-normal text-zinc-500">{gameCount} games</span>
                </span>
                <ChevronDown size={18} className={`text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open &&
                <div className="flex flex-col gap-4 px-3 pb-3 pt-1">
                    {days.map((d) => (
                        <div key={d.date} className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-zinc-400 capitalize">
                                {toDate(d.date).toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "numeric" })}
                            </span>
                            <ul className="flex flex-wrap gap-3">
                                {d.games.map((g) => (
                                    <li key={g.id}>
                                        <NBAGameCard game={g} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            }
        </div>
    )
}

export default NBAPastGamesWeek;
