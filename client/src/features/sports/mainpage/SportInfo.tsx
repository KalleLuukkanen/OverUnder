import { useState } from "react";
import { ChevronDown } from "lucide-react";
import LeagueInfo from "./LeagueInfo";

function SportInfo({ leagues }: { leagues: string[] }) {
    // all leagues open by default
    const [openLeagues, setOpenLeagues] = useState<string[]>([]);

    const toggleShowing = (league: string) => {
        setOpenLeagues((prev) =>
            prev.includes(league) ? prev.filter((l) => l !== league) : [...prev, league]
        );
    };

    return (
        <ul className="flex flex-col gap-3">
            {leagues.map((l) => (
                <li key={l} className="bg-zinc-900 border border-zinc-800 rounded-xl">
                    <button
                        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer text-lg font-semibold rounded-xl hover:bg-zinc-800/50"
                        type="button"
                        onClick={() => toggleShowing(l)}
                    >
                        {l}
                        <ChevronDown size={20} className={`text-zinc-500 transition-transform ${openLeagues.includes(l) ? "" : "-rotate-90"}`} />
                    </button>
                    {openLeagues.includes(l) &&
                        <div className="px-4 pb-4">
                            <LeagueInfo league={l} />
                        </div>
                    }
                </li>
            ))}
        </ul>
    )
}

export default SportInfo;
