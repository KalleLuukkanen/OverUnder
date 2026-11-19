import NBAInfo from "../features/sports/nba/NBAInfo";
import NBASeasonPastGames from "../features/sports/nba/NBASeasonPastGames";
import PlayerSearch from "../features/sports/nba/PlayerSearch";
import TeamList from "../features/sports/nba/TeamList";
import SeasonSearch from "../features/sports/nba/SeasonSearch";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { currentSeason } from "../utils/nbaGame";

// panel with a title button that opens and closes its content
// note is a small muted text after the title
function CollapsibleSection({ title, note, open, onToggle, children }:
    { title: string, note?: string, open: boolean, onToggle: () => void, children: React.ReactNode }) {
    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer text-lg font-semibold rounded-xl hover:bg-zinc-800/50"
                type="button"
                onClick={onToggle}
            >
                <span>
                    {title}
                    {note && <span className="ml-2 text-sm font-normal text-zinc-500">{note}</span>}
                </span>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && <div className="px-4 pb-4">{children}</div>}
        </section>
    )
}

function NBAPage() {

    const [showingUpcoming, setShowingUpcoming] = useState(false);
    const [showingPast, setShowingPast] = useState(false);
    const [showingSearch, setShowingSearch] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <h1 className="text-3xl font-bold">NBA</h1>
                <PlayerSearch />
            </div>
            <TeamList />
            <CollapsibleSection title="Upcoming games" note={`${currentSeason()} season`} open={showingUpcoming} onToggle={() => setShowingUpcoming(!showingUpcoming)}>
                <NBAInfo />
            </CollapsibleSection>
            <CollapsibleSection title="Past games" note={`${currentSeason()} season`} open={showingPast} onToggle={() => setShowingPast(!showingPast)}>
                <NBASeasonPastGames />
            </CollapsibleSection>
            <CollapsibleSection title="Season search" note="past seasons" open={showingSearch} onToggle={() => setShowingSearch(!showingSearch)}>
                <SeasonSearch />
            </CollapsibleSection>
        </div>
    )
}

export default NBAPage;
