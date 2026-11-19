import { searchPlayers } from "../../../api/nba/nbaPlayersApi";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { NbaPlayer } from "../../../types/nba";
import { Search } from "lucide-react";

// search players by name, results show as a list below the input
// arrow keys move through the results, enter opens the highlighted one
// onSelect given: the chosen player is passed to it instead of opening the player's page
// activeOnly: retired players aren't listed (prop checker)
function PlayerSearch({ onSelect, placeholder = "Search player...", className = "w-full sm:w-80", activeOnly = false }:
    { onSelect?: (player: NbaPlayer) => void, placeholder?: string, className?: string, activeOnly?: boolean }) {

    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NbaPlayer[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    // index of the result chosen with arrow keys, -1 = none
    const [highlighted, setHighlighted] = useState(-1);

    // wrapper around the input and the list, clicks outside it close the list
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        // api needs at least 2 characters
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        // wait until typing stops so every keypress doesn't send a request
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const players = await searchPlayers(query.trim(), 10, activeOnly);
                if (!cancelled) setResults(players);
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, activeOnly]);

    // new results: nothing highlighted until arrows are used
    useEffect(() => {
        setHighlighted(-1);
    }, [results]);

    // keep the highlighted row visible when the list scrolls
    useEffect(() => {
        if (highlighted < 0 || !listRef.current) return;
        const row = listRef.current.children[highlighted] as HTMLElement | undefined;
        row?.scrollIntoView({ block: "nearest" });
    }, [highlighted]);

    // clear the search, then give the player to onSelect or go to the player's page
    const openPlayer = (player: NbaPlayer) => {
        setQuery("");
        setResults([]);
        setOpen(false);
        if (onSelect) {
            onSelect(player);
        } else {
            navigate(`/nba/player/${player.id}`);
        }
    };

    const showList = open && query.trim().length >= 2;

    // arrows move the highlight (wrapping around), enter opens it, escape closes the list
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case "ArrowDown":
                if (results.length === 0) return;
                e.preventDefault();  // don't move the text cursor
                setOpen(true);
                setHighlighted((i) => (i + 1) % results.length);
                break;
            case "ArrowUp":
                if (results.length === 0) return;
                e.preventDefault();
                setOpen(true);
                setHighlighted((i) => (i <= 0 ? results.length - 1 : i - 1));
                break;
            case "Enter":
                if (results.length === 0) return;
                // nothing highlighted -> first result
                e.preventDefault();  // don't submit a surrounding form
                openPlayer(results[highlighted >= 0 ? highlighted : 0]);
                break;
            case "Escape":
                setOpen(false);
                setHighlighted(-1);
                break;
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
                placeholder={placeholder}
                value={query}
                role="combobox"
                aria-expanded={showList}
                aria-controls="player-search-list"
                aria-activedescendant={highlighted >= 0 ? `player-search-${results[highlighted]?.id}` : undefined}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
            />
            {showList &&
                <ul
                    id="player-search-list"
                    role="listbox"
                    ref={listRef}
                    className="absolute z-20 left-0 right-0 mt-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                >
                    {results.map((p, i) => (
                        <li key={p.id} id={`player-search-${p.id}`} role="option" aria-selected={i === highlighted}>
                            <button
                                className={`flex w-full px-3 py-2 rounded-md text-left cursor-pointer ${i === highlighted ? "bg-zinc-800 text-white" : "text-zinc-200"}`}
                                type="button"
                                tabIndex={-1}
                                onMouseEnter={() => setHighlighted(i)}
                                onClick={() => openPlayer(p)}
                            >
                                {p.name}
                                <span className="ml-auto text-sm text-zinc-500">{p.team ?? (p.retired ? "Retired" : "")}</span>
                            </button>
                        </li>
                    ))}
                    {searching && results.length === 0 && <li className="px-3 py-2 text-zinc-500">Searching...</li>}
                    {!searching && results.length === 0 && <li className="px-3 py-2 text-zinc-500">No players found</li>}
                </ul>
            }
        </div>
    )
}

export default PlayerSearch;
