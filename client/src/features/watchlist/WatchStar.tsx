import { Star } from "lucide-react";
import type { WatchKind } from "../../api/watchlistApi";
import type { Watchlist } from "./useWatchlist";

// small star toggle for a player / team picked in a prop checker, only for signed in members
// the checker passes its useWatchlist, so the quick picks update right away
function WatchStar({ list, kind, id, name }: { list: Watchlist, kind: WatchKind, id: number, name: string }) {

    if (!list.watchlist) return null;
    const watched = list.isWatched(kind, id);

    return (
        <button
            className={`p-1 rounded cursor-pointer disabled:opacity-60 hover:bg-zinc-700 ${watched ? "text-amber-300" : "text-zinc-400 hover:text-amber-300"}`}
            type="button"
            aria-pressed={watched}
            aria-label={watched ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
            title={watched ? "On your watchlist" : "Add to watchlist"}
            disabled={list.saving}
            onClick={() => list.toggle(kind, id)}
        >
            <Star size={16} fill={watched ? "currentColor" : "none"} />
        </button>
    )
}

export default WatchStar;
