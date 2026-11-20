import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, ChevronDown, Target, CircleUser, Layers } from "lucide-react";
import { sports } from "../types/sports";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import { authClient } from "../utils/auth";

// onSelect closes the dropdown: the header stays mounted when moving between pages
function LeagueList({ leagues, onSelect }: { leagues: string[], onSelect: () => void }) {
    return (
        <ul className="absolute left-0 top-full mt-2 z-20 flex flex-col min-w-40 p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            {leagues.map((l) => (
                <li key={l}>
                    <Link
                        className="block px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
    const { data: session } = authClient.useSession();
    // the auth page returns here after signing in (not when already on the auth page)
    const location = useLocation();
    const from = location.pathname === "/auth" ? undefined : location.pathname + location.search;

    // clicking outside the sports menu closes the open dropdown
    const navRef = useRef<HTMLUListElement>(null);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setOpenSport(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const toggleShowing = (sport: string) => {
        setOpenSport((current) => (current === sport ? null : sport));
    };

    return (
        <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
            <div className="flex items-center gap-6 max-w-7xl mx-auto px-4 h-14">
                <Link
                    className="flex items-center shrink-0 text-zinc-100 hover:text-white"
                    to="/"
                    aria-label="OverUnder home"
                    onClick={() => setOpenSport(null)}
                >
                    <Logo markOnly className="h-9 w-9 sm:hidden" />
                    <Logo className="hidden sm:block h-9 w-auto" />
                </Link>
                <NavLink
                    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium hover:bg-zinc-800 hover:text-white ${isActive ? "bg-zinc-800 text-sky-400" : "text-sky-400"}`}
                    to="/props"
                    onClick={() => setOpenSport(null)}
                >
                    <Target size={16} />
                    <span className="hidden sm:inline">Prop checker</span>
                </NavLink>
                <NavLink
                    className={({ isActive }) => `flex items-center gap-1.5 -ml-4 px-3 py-1.5 rounded-md hover:bg-zinc-800 hover:text-white ${isActive ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
                    to="/parlays"
                    onClick={() => setOpenSport(null)}
                >
                    <Layers size={16} />
                    <span className="hidden sm:inline">Parlays</span>
                </NavLink>
                <ul className="flex items-center gap-1" ref={navRef}>
                    {Object.entries(sports).map(([sport, leagues]) => (
                        <li key={sport} className="relative">
                            <button
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer hover:bg-zinc-800 hover:text-white ${openSport === sport ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
                                type="button"
                                onClick={() => toggleShowing(sport)}
                            >
                                {sport}
                                <ChevronDown size={16} className={`transition-transform ${openSport === sport ? "rotate-180" : ""}`} />
                            </button>
                            {openSport === sport && <LeagueList leagues={leagues} onSelect={() => setOpenSport(null)} />}
                        </li>
                    ))}
                </ul>
                <ThemeToggle className="ml-auto -mr-4" />
                <Link
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    to="/auth"
                    state={{ from }}
                    onClick={() => setOpenSport(null)}
                >
                    {session ?
                        <><CircleUser size={18} /><span className="hidden sm:inline max-w-32 truncate">{session.user.name}</span></> :
                        <><LogIn size={18} />Log in</>
                    }
                </Link>
            </div>
        </header>
    );
}

export default Header;
