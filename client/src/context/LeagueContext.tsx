import { createContext, useContext, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { availableLeague, FALLBACK_LEAGUE, LEAGUES } from "../types/leagues";

const STORAGE_KEY = "defaultLeague";

// the default league saved in this browser, NBA if none (or storage is blocked)
const readDefault = () => {
    try {
        return availableLeague(localStorage.getItem(STORAGE_KEY))?.slug ?? FALLBACK_LEAGUE;
    } catch {
        return FALLBACK_LEAGUE;
    }
};

type LeagueState = {
    league: typeof LEAGUES[number];        // the league everything is shown for
    defaultLeague: string;                 // slug '/' goes to
    setDefaultLeague: (slug: string) => void;
};

const LeagueContext = createContext<LeagueState | null>(null);

// the current league: a league page's url decides it (/nba/... = NBA, also for shared links),
// pages without a league (prop checker, parlays, account) keep the last league page's league, at first the default
export function LeagueProvider({ children }: { children: ReactNode }) {

    const location = useLocation();
    const [defaultLeague, setDefault] = useState(readDefault);
    const [lastLeague, setLastLeague] = useState(defaultLeague);

    const fromUrl = availableLeague(location.pathname.split("/")[1])?.slug;
    // remember the url's league for the pages without one (adjusting state during render, no extra effect)
    if (fromUrl && fromUrl !== lastLeague) setLastLeague(fromUrl);
    const slug = fromUrl ?? lastLeague;

    // only an available league can be the default, it's saved in this browser
    const setDefaultLeague = (next: string) => {
        if (!availableLeague(next)) return;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // storage blocked: the default lasts until the page is reloaded
        }
        setDefault(next);
    };

    const league = LEAGUES.find((l) => l.slug === slug)!;

    return (
        <LeagueContext.Provider value={{ league, defaultLeague, setDefaultLeague }}>
            {children}
        </LeagueContext.Provider>
    );
}

// the current league and the default, inside LeagueProvider
export const useLeague = () => {
    const state = useContext(LeagueContext);
    if (!state) throw new Error("useLeague must be used inside LeagueProvider");
    return state;
};
