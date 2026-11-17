import NBAInfo from "../features/sports/nba/NBAInfo";
import NBASeasonPastGames from "../features/sports/nba/NBASeasonPastGames";
import PlayerSearch from "../features/sports/nba/PlayerSearch";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

// panel with a title button that opens and closes its content
function CollapsibleSection({ title, open, onToggle, children }:
    { title: string, open: boolean, onToggle: () => void, children: React.ReactNode }) {
    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
                className="flex items-center justify-between w-full px-4 py-3 cursor-pointer text-lg font-semibold rounded-xl hover:bg-zinc-800/50"
                type="button"
                onClick={onToggle}
            >
                {title}
                <ChevronDown size={20} className={`text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && <div className="px-4 pb-4">{children}</div>}
        </section>
    )
}

function NBAPage() {

    const [showingUpcoming, setShowingUpcoming] = useState(false);
    const [showingPast, setShowingPast] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <h1 className="text-3xl font-bold">NBA</h1>
                <PlayerSearch />
            </div>
            <CollapsibleSection title="Upcoming games" open={showingUpcoming} onToggle={() => setShowingUpcoming(!showingUpcoming)}>
                <NBAInfo />
            </CollapsibleSection>
            <CollapsibleSection title="Past games" open={showingPast} onToggle={() => setShowingPast(!showingPast)}>
                <NBASeasonPastGames />
            </CollapsibleSection>
        </div>
    )
}

export default NBAPage;
