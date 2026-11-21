import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { authClient } from "../../utils/auth";
import { getParlays, createParlay, addLeg, type NewLeg } from "../../api/parlaysApi";
import { ApiError } from "../../api/apiClient";
import type { Parlay } from "../../types/nba";

const NEW = "new";

// default name of a new parlay, e.g. 'Parlay 19.11.'
const defaultName = () => {
    const d = new Date();
    return `Parlay ${d.getDate()}.${d.getMonth() + 1}.`;
};

// saves a checked player prop or team bet to one of the member's open parlays or a new one
// the server refuses legs that clash with one already in the parlay, its reason is shown
// signed out users see a small sign in link instead (parlays are a member feature)
function AddToParlay({ leg }: { leg: NewLeg }) {

    const { data: session } = authClient.useSession();
    const location = useLocation();

    // parlays that can still take legs (not won / lost yet)
    const [parlays, setParlays] = useState<Parlay[]>([]);
    const [target, setTarget] = useState<string>(NEW);
    const [newName, setNewName] = useState(defaultName);

    const [saving, setSaving] = useState(false);
    const [added, setAdded] = useState<string | null>(null);   // name of the parlay the prop went to
    const [error, setError] = useState("");

    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        const load = async () => {
            try {
                const all = await getParlays();
                const open = all.filter((p) => p.status === "pending" || p.status === "empty");
                if (!cancelled) {
                    setParlays(open);
                    // latest open parlay is the likely target
                    setTarget(open.length > 0 ? String(open[0].id) : NEW);
                }
            } catch {
                if (!cancelled) setParlays([]);
            }
        };
        load();
        return () => { cancelled = true };
    }, [session]);

    // a new bet checked: the "added" note was for the previous one
    const legKey = JSON.stringify(leg);
    useEffect(() => {
        setAdded(null);
        setError("");
    }, [legKey]);

    if (!session) {
        return (
            <p className="text-sm text-zinc-500">
                <Link className="text-sky-400 hover:underline" to="/auth" state={{ from: location.pathname + location.search }}>Sign in</Link>
                {" "}to save bets to parlays
            </p>
        );
    }

    const add = async () => {
        setSaving(true);
        setError("");
        try {
            let parlayId: number;
            let name: string;
            if (target === NEW) {
                name = newName.trim() || defaultName();
                parlayId = (await createParlay(name)).id;
                // the new parlay is now one of the open ones, keep it selected for the next prop
                setParlays((prev) => [{ id: parlayId, name, odds: null, created_at: new Date().toISOString(), status: "empty", legs: [] }, ...prev]);
                setTarget(String(parlayId));
            } else {
                parlayId = Number(target);
                name = parlays.find((p) => p.id === parlayId)?.name ?? "parlay";
            }
            await addLeg(parlayId, leg);
            setAdded(name);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't add the bet, please try again");
        } finally {
            setSaving(false);
        }
    };

    const control = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-sky-500";

    return (
        <div className="flex flex-col gap-2 pt-3 border-t border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
                <select className={control} value={target} aria-label="Parlay" onChange={(e) => setTarget(e.target.value)}>
                    {parlays.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.legs.length} {p.legs.length === 1 ? "leg" : "legs"})</option>)}
                    <option value={NEW}>New parlay...</option>
                </select>
                {target === NEW &&
                    <input
                        className={`${control} w-36`}
                        value={newName}
                        maxLength={60}
                        aria-label="New parlay name"
                        onChange={(e) => setNewName(e.target.value)}
                    />
                }
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer bg-zinc-800 border border-zinc-700 text-zinc-100 hover:border-sky-500 hover:text-sky-400 disabled:opacity-60 disabled:cursor-wait"
                    type="button"
                    disabled={saving}
                    onClick={add}
                >
                    <Plus size={16} /> Add to parlay
                </button>
            </div>
            {added &&
                <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <Check size={16} /> Added to {added} ·
                    <Link className="text-sky-400 hover:underline" to="/parlays">View parlays</Link>
                </p>
            }
            {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
    )
}

export default AddToParlay;
