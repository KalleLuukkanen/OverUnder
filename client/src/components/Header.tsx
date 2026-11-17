import { useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, House } from "lucide-react";
import { sports } from "../types/sports";

// onSelect closes the dropdown: the header stays mounted when moving between pages
function LeagueList({ leagues, onSelect }: { leagues: string[], onSelect: () => void }) {
    return (
        <ul className="absolute left-0 top-full mt-2 z-10 flex flex-col space-y-2 bg-black p-3 rounded shadow-lg min-w-max">
            {leagues.map((l) => (
                <li key={l}>
                    <Link
                        className="text-gray-300 hover:font-bold"
                        to={`/${l.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={onSelect}
                    >
                        {l}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function Header() {
    const [openSport, setOpenSport] = useState<string | null>(null);

    const toggleShowing = (sport: string) => {
        setOpenSport((current) => (current === sport ? null : sport));
    };

    return (
        <div className="flex bg-black p-4">
            <ul className="flex space-x-6 ml-4">
                <Link
                    className="text-gray-300 cursor-pointer"
                    to="/"
                    onClick={() => setOpenSport(null)}
                >
                    <House />
                </Link>
                {Object.entries(sports).map(([sport, leagues]) => (
                    <li key={sport} className="relative">
                        <button
                            className="cursor-pointer text-gray-300 hover:font-bold"
                            onClick={() => toggleShowing(sport)}
                        >
                            {sport}
                        </button>
                        {openSport === sport && <LeagueList leagues={leagues} onSelect={() => setOpenSport(null)} />}
                    </li>
                ))}
            </ul>
            <div className="ml-auto mr-4">
                <Link
                    className="text-gray-300 flex cursor-pointer hover:font-bold"
                    to="/auth"
                    onClick={() => setOpenSport(null)}
                >
                    <LogIn />Log in
                </Link>
            </div>
        </div>
    );
}

export default Header;
