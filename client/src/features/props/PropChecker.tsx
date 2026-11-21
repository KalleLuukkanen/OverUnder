import { useState, Fragment } from "react";
import { sports } from "../../types/sports";
import NBAPropChecker from "../sports/nba/NBAPropChecker";

// leagues that have a prop checker, the rest show "coming soon"
const AVAILABLE: Record<string, () => React.ReactNode> = {
    NBA: () => <NBAPropChecker />,
};

// prop checker with a league switcher on top
function PropChecker() {

    const [league, setLeague] = useState("NBA");

    const checker = AVAILABLE[league];

    return (
        <section className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold">Check a prop</h1>
                <p className="text-zinc-400">How often would your bet have hit? Pick a player or a team, a bet and a line.</p>
            </div>
            {/* league switcher, scrolls sideways on small screens */}
            <div className="flex gap-2 p-1 w-fit max-w-full overflow-x-auto bg-zinc-950 border border-zinc-800 rounded-lg">
                {/* leagues grouped by sport, a thin divider between the sports */}
                {Object.entries(sports).map(([sport, leagues], i) => (
                    <Fragment key={sport}>
                        {i > 0 && <span className="w-px my-1 shrink-0 bg-zinc-700" aria-hidden="true" />}
                        <div className="flex flex-col gap-0.5" role="group" aria-label={sport}>
                            {/* small sport label, only there to explain the grouping */}
                            <span className="px-3 pt-0.5 text-[10px] uppercase tracking-wide text-zinc-500" aria-hidden="true">{sport}</span>
                            <div className="flex gap-1">
                                {leagues.map((l) => (
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
                        </div>
                    </Fragment>
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
