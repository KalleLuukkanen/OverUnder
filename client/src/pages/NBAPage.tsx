import NBAInfo from "../features/sports/nba/NBAInfo";
import NBASeasonPastGames from "../features/sports/nba/NBASeasonPastGames";
import NBALeaders from "../features/sports/nba/NBALeaders";
import NBAStandings from "../features/sports/nba/NBAStandings";
import PlayerSearch from "../features/sports/nba/PlayerSearch";
import TeamsMenu from "../features/sports/nba/TeamsMenu";
import SeasonSearch from "../features/sports/nba/SeasonSearch";
import { useCallback, useRef, useState } from "react";
import useDismiss from "../utils/useDismiss";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { currentSeason } from "../utils/nbaGame";

// the views next to the title: the current season's ones and the search of past seasons
// the first one is shown by default
const SEASON_VIEWS = [
    { key: "upcoming", label: "Upcoming games" },
    { key: "past", label: "Past games" },
    { key: "stats", label: "Stats" },
    { key: "standings", label: "Standings" },
] as const;
const SEARCH_VIEW = { key: "search", label: "Season search" } as const;
const VIEWS = [...SEASON_VIEWS, SEARCH_VIEW];

type View = typeof VIEWS[number]["key"];

// class names of a menu button, the selected one is sky and underlined
const menuButton = (selected: boolean) =>
    `flex items-center gap-1 cursor-pointer border-b-2 pb-0.5 ${selected ? "border-sky-400 text-sky-400 font-medium" : "border-transparent text-zinc-400 hover:text-white"}`;

// the current season's button: opens a list of its views, shows the selected one after the season
// closes when a view is picked, or on a click outside / escape
function SeasonMenu({ season, view, onSelect }: { season: string, view: View, onSelect: (key: View) => void }) {

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = SEASON_VIEWS.find((v) => v.key === view);

    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, ref);

    return (
        <div className="relative" ref={ref}>
            <button className={menuButton(selected !== undefined)} type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
                {season} season
                {selected && <span className="font-normal text-zinc-400">· {selected.label}</span>}
                <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open &&
                <ul className="absolute left-0 top-full mt-2 z-20 flex flex-col min-w-44 p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
                    {SEASON_VIEWS.map((v) => (
                        <li key={v.key}>
                            <button
                                className={`w-full text-left px-3 py-2 rounded-md cursor-pointer hover:bg-zinc-800 hover:text-white ${v.key === view ? "text-sky-400" : "text-zinc-300"}`}
                                type="button"
                                aria-current={v.key === view ? "page" : undefined}
                                onClick={() => { onSelect(v.key); setOpen(false); }}
                            >
                                {v.label}
                            </button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}

function NBAPage() {

    // the view is kept in the url (?view=past), so back, refresh and links keep it
    const [searchParams, setSearchParams] = useSearchParams();
    const view: View = VIEWS.find((v) => v.key === searchParams.get("view"))?.key ?? "upcoming";
    const current = VIEWS.find((v) => v.key === view)!;
    const season = currentSeason();

    // the default view leaves the url clean
    const selectView = (key: View) => {
        setSearchParams(key === "upcoming" ? {} : { view: key }, { replace: true });
    };

    return (
        <div className="flex flex-col gap-4">
            {/* relative: the teams menu opens across this whole header row */}
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                    <h1 className="text-3xl font-bold">NBA</h1>
                    <nav className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm" aria-label="NBA views">
                        <SeasonMenu season={season} view={view} onSelect={selectView} />
                        <button
                            className={menuButton(view === SEARCH_VIEW.key)}
                            type="button"
                            aria-current={view === SEARCH_VIEW.key ? "page" : undefined}
                            onClick={() => selectView(SEARCH_VIEW.key)}
                        >
                            {SEARCH_VIEW.label}
                        </button>
                        <TeamsMenu buttonClass={menuButton(false)} />
                    </nav>
                </div>
                <PlayerSearch />
            </div>
            <section className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h2 className="text-lg font-semibold">
                    {current.label}
                    <span className="ml-2 text-sm font-normal text-zinc-500">{view === "search" ? "past seasons" : `${season} season`}</span>
                </h2>
                {view === "upcoming" && <NBAInfo />}
                {view === "past" && <NBASeasonPastGames />}
                {view === "stats" && <NBALeaders />}
                {view === "standings" && <NBAStandings />}
                {view === "search" && <SeasonSearch />}
            </section>
        </div>
    )
}

export default NBAPage;
