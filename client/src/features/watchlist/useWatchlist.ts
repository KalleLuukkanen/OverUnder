import { useCallback, useEffect, useState } from "react";
import { authClient } from "../../utils/auth";
import { getWatchlist, watch, unwatch, type WatchKind } from "../../api/watchlistApi";
import { ApiError } from "../../api/apiClient";
import type { NbaWatchlist } from "../../types/nba";

// the signed in member's watchlist and a way to add / remove items
// watchlist is null when signed out or not loaded yet; after a change the list is fetched again,
// so new items come with their next games
const useWatchlist = () => {

    const { data: session } = authClient.useSession();
    const signedIn = Boolean(session);

    const [watchlist, setWatchlist] = useState<NbaWatchlist | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!signedIn) return;
        let cancelled = false;
        const load = async () => {
            try {
                const list = await getWatchlist();
                if (!cancelled) setWatchlist(list);
            } catch {
                if (!cancelled) setWatchlist(null);
            }
        };
        load();
        return () => { cancelled = true };
    }, [signedIn]);

    // a list loaded before signing out isn't used
    const shown = signedIn ? watchlist : null;

    const isWatched = useCallback((kind: WatchKind, id: number) => {
        const items = kind === "player" ? shown?.players : shown?.teams;
        return items?.some((item) => item.id === id) ?? false;
    }, [shown]);

    // adds the item, or removes it if it's already watched
    const toggle = async (kind: WatchKind, id: number) => {
        setSaving(true);
        setError("");
        try {
            if (isWatched(kind, id)) await unwatch(kind, id);
            else await watch(kind, id);
            setWatchlist(await getWatchlist());
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't update the watchlist");
        } finally {
            setSaving(false);
        }
    };

    return { signedIn, watchlist: shown, isWatched, toggle, saving, error };
};

export type Watchlist = ReturnType<typeof useWatchlist>;

export default useWatchlist;
