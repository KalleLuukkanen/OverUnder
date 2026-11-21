import { Link, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import type { WatchKind } from "../../api/watchlistApi";
import useWatchlist from "./useWatchlist";

const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors";

// star button of a player / team page: adds it to the member's watchlist or removes it
// signed out users get a sign in link that comes back to this page
function WatchButton({ kind, id }: { kind: WatchKind, id: number }) {

    const list = useWatchlist();
    const location = useLocation();

    if (!list.signedIn) {
        return (
            <Link
                className={`${base} border-zinc-700 text-zinc-400 hover:border-sky-500 hover:text-sky-400`}
                to="/auth"
                state={{ from: location.pathname + location.search }}
                title="Sign in to use the watchlist"
            >
                <Star size={16} /> Watch
            </Link>
        );
    }

    // disabled until the watchlist is loaded
    const watched = list.isWatched(kind, id);

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                className={`${base} cursor-pointer disabled:opacity-60 ${watched ? "border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20" : "border-zinc-700 text-zinc-300 hover:border-sky-500 hover:text-sky-400"}`}
                type="button"
                aria-pressed={watched}
                disabled={!list.watchlist || list.saving}
                onClick={() => list.toggle(kind, id)}
            >
                <Star size={16} fill={watched ? "currentColor" : "none"} />
                {watched ? "Watching" : "Watch"}
            </button>
            {list.error && <span className="text-xs text-rose-400">{list.error}</span>}
        </div>
    )
}

export default WatchButton;
