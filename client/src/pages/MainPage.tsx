import SportInfo from "../features/sports/mainpage/SportInfo";
import { sports } from "../types/sports";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

function MainPage() {
    // all sports open by default
    const [openSports, setOpenSports] = useState<string[]>(() => Object.keys(sports));

    const toggleShowing = (sport: string) => {
        setOpenSports((prev) =>
            prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
        );
    };

    return (
        <ul className="flex flex-col gap-6">
            {Object.entries(sports).map(([sport, leagues]) => (
                <li key={sport} className="flex flex-col gap-3">
                    <button
                        className="flex items-center gap-2 w-fit cursor-pointer text-3xl font-bold text-zinc-100 hover:text-white"
                        type="button"
                        onClick={() => toggleShowing(sport)}
                    >
                        {sport}
                        <ChevronDown size={24} className={`text-zinc-500 transition-transform ${openSports.includes(sport) ? "" : "-rotate-90"}`} />
                    </button>
                    {openSports.includes(sport) && <SportInfo leagues={leagues} />}
                </li>
            ))}
        </ul>
    )
}

export default MainPage;
