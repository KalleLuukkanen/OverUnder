import { useState } from "react";
import { sports } from "../../types/sports";
import NBAPropChecker from "../sports/nba/NBAPropChecker";

// leagues that have a prop checker, the rest show "coming soon"
const AVAILABLE: Record<string, () => React.ReactNode> = {
    NBA: () => <NBAPropChecker />,
};

// every league from every sport, in the order they're listed in sports
const LEAGUES = Object.values(sports).flat();

// prop checker with a league switcher on top
function PropChecker() {

    const [league, setLeague] = useState("NBA");

    const checker = AVAILABLE[league];

    return (
        <section className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold">Check a prop</h1>
                <p className="text-zinc-400">How often would your bet have hit? Pick a player, a stat and a line.</p>
            </div>
            {/* league switcher, scrolls sideways on small screens */}
            <div className="flex gap-1 p-1 w-fit max-w-full overflow-x-auto bg-zinc-950 border border-zinc-800 rounded-lg">
                {LEAGUES.map((l) => (
                    <button
                        key={l}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm whitespace-nowrap cursor-pointer ${league === l ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                        type="button"
                        onClick={() => setLeague(l)}
                    >
                        {l}
                        {!AVAILABLE[l] && <span className="text-[10px] uppercase tracking-wide text-zinc-500">Soon</span>}
                    </button>
                ))}
            </div>
            {checker ?
                checker() :
                <div className="py-10 text-center text-zinc-500">
                    <p className="text-lg text-zinc-300">{league} props are coming soon</p>
                    <p>Only NBA is available for now.</p>
                </div>
            }
        </section>
    )
}

export default PropChecker;
