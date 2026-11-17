import { searchPlayers } from "../../../api/nba/nbaPlayersApi";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { NbaPlayer } from "../../../types/nba";

// search players by name, results show as a list below the input
function PlayerSearch() {

    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NbaPlayer[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);

    // wrapper around the input and the list, clicks outside it close the list
    const containerRef = useRef<HTMLDivElement>(null);

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
                const players = await searchPlayers(query.trim(), 10);
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
    }, [query]);

    // go to player's page and clear the search
    const openPlayer = (player_id: number) => {
        setQuery("");
        setResults([]);
        setOpen(false);
        navigate(`/nba/player/${player_id}`);
    };

    const showList = open && query.trim().length >= 2;

    return (
        <div className="relative w-100" ref={containerRef}>
            <input
                type="text"
                className="bg-white rounded w-full p-1"
                placeholder="Search player..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && results.length > 0) openPlayer(results[0].id);
                    if (e.key === "Escape") setOpen(false);
                }}
            />
            {showList &&
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white rounded shadow max-h-80 overflow-y-auto">
                    {searching && results.length === 0 && <li className="p-2 text-gray-500">Searching...</li>}
                    {!searching && results.length === 0 && <li className="p-2 text-gray-500">No players found</li>}
                    {results.map((p) => (
                        <li key={p.id}>
                            <button
                                className="flex w-full p-2 text-left cursor-pointer hover:bg-gray-100"
                                type="button"
                                onClick={() => openPlayer(p.id)}
                            >
                                {p.name}
                                {p.team && <span className="ml-auto text-gray-500">{p.team}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}

export default PlayerSearch;
