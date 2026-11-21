import type { NbaWatchGame } from "../../types/nba";
import { usDayKey } from "../../utils/nbaGame";

export type WatchPick = {
    id: number;
    name: string;
    next_game: NbaWatchGame | null;
};

// when the next game is: 'today' / 'tomorrow' (US dates like game_date), 'vs LAL', or 'no game'
const nextLabel = (game: NbaWatchGame | null) => {
    if (!game) return "no game";
    const versus = `${game.is_home ? "vs" : "@"} ${game.opponent}`;
    if (game.game_date === usDayKey(0)) return `${versus} today`;
    if (game.game_date === usDayKey(1)) return `${versus} tomorrow`;
    return versus;
};

// compact pick from the watchlist next to a prop checker field's label, one line however long the list is
// shows the picked item when it's on the list; nothing is shown for an empty list (or signed out)
function WatchPicks({ items, selectedId, onPick, label }: { items: WatchPick[], selectedId: number | null, onPick: (id: number) => void, label: string }) {

    if (items.length === 0) return null;
    const selected = items.some((item) => item.id === selectedId);

    return (
        <select
            // dark color-scheme + option colors: the opened list is dark like the rest of the page, not the browser's white
            className={`max-w-48 truncate bg-zinc-800 border rounded-md px-1.5 py-0.5 text-xs cursor-pointer [color-scheme:dark] focus:outline-none focus:border-sky-500 [&>option]:bg-zinc-800 [&>option]:text-zinc-100 ${selected ? "border-amber-400/50 text-amber-300" : "border-zinc-600 text-zinc-200 hover:border-zinc-500"}`}
            value={selected ? selectedId! : ""}
            aria-label={label}
            onChange={(e) => { if (e.target.value) onPick(Number(e.target.value)); }}
        >
            <option value="" disabled>★ Watchlist ({items.length})</option>
            {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {nextLabel(item.next_game)}</option>
            ))}
        </select>
    )
}

export default WatchPicks;
