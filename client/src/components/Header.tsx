import { Link, NavLink, useLocation } from "react-router-dom";
import { LogIn, Target, CircleUser, Layers, Gauge } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LeagueSwitcher from "./LeagueSwitcher";
import Logo from "./Logo";
import { authClient } from "../utils/auth";

// logo, prop checker, parlays and accuracy on the left; league, theme and account on the right
function Header() {
    const { data: session } = authClient.useSession();
    // the auth page returns here after signing in (not when already on the auth page)
    const location = useLocation();
    const from = location.pathname === "/auth" ? undefined : location.pathname + location.search;

    return (
        <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
            <div className="flex items-center gap-6 max-w-7xl mx-auto px-4 h-14">
                <Link
                    className="flex items-center shrink-0 text-zinc-100 hover:text-white"
                    to="/"
                    aria-label="OverUnder home"
                >
                    <Logo markOnly className="h-9 w-9 sm:hidden" />
                    <Logo className="hidden sm:block h-9 w-auto" />
                </Link>
                <NavLink
                    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium hover:bg-zinc-800 hover:text-white ${isActive ? "bg-zinc-800 text-sky-400" : "text-sky-400"}`}
                    to="/props"
                >
                    <Target size={16} />
                    <span className="hidden sm:inline">Prop checker</span>
                </NavLink>
                <NavLink
                    className={({ isActive }) => `flex items-center gap-1.5 -ml-4 px-3 py-1.5 rounded-md hover:bg-zinc-800 hover:text-white ${isActive ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
                    to="/parlays"
                >
                    <Layers size={16} />
                    <span className="hidden sm:inline">Parlays</span>
                </NavLink>
                <NavLink
                    className={({ isActive }) => `flex items-center gap-1.5 -ml-4 px-3 py-1.5 rounded-md hover:bg-zinc-800 hover:text-white ${isActive ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
                    to="/accuracy"
                    title="How accurate the estimated chances are"
                >
                    <Gauge size={16} />
                    <span className="hidden sm:inline">Accuracy</span>
                </NavLink>
                <LeagueSwitcher className="ml-auto -mr-4" />
                <ThemeToggle className="-mr-4" />
                <Link
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    to="/auth"
                    state={{ from }}
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
