import type { NbaGame } from "../../../types/nba";
import NBAGameCard from "./NBAGameCard";
import { ChevronDown, ChevronRight } from "lucide-react";
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
        <div className="flex flex-col space-y-2">
            <button className="text-xl flex items-center cursor-pointer w-fit" type="button" onClick={() => setOpen(!open)}>
                Week {start.toLocaleDateString("fi-FI")} - {end.toLocaleDateString("fi-FI")} ({gameCount} games)
                {open ? <ChevronDown /> : <ChevronRight />}
            </button>
            {open &&
                <div className="flex flex-col space-y-4 ml-4">
                    {days.map((d) => (
                        <div key={d.date} className="flex flex-col space-y-2">
                            <span className="text-lg font-semibold capitalize">
                                {toDate(d.date).toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "numeric" })}
                            </span>
                            <ul className="flex flex-wrap gap-2">
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
