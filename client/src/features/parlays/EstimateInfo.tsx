import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import type { ParlayLeg } from "../../types/nba";
import { Link } from "react-router-dom";
import { estimateLeg, estimateParlay, percent } from "./parlayEstimate";
import { legName } from "./legLabels";

// ⓘ next to the estimated chance: hovering or clicking shows how it was calculated,
// with the numbers of every leg of this parlay
function EstimateInfo({ legs }: { legs: ParlayLeg[] }) {

    const [open, setOpen] = useState(false);
    // clicked open: stays open when the mouse leaves, until clicked again / outside / escape
    const [pinned, setPinned] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    // opens above the ⓘ, or below it when there's no room above (it would go under the sticky header)
    const [below, setBelow] = useState(false);

    // measured before the browser paints, so the box never shows in the wrong place
    useLayoutEffect(() => {
        if (!open) {
            setBelow(false);
            return;
        }
        if (below || !boxRef.current) return;
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        if (boxRef.current.getBoundingClientRect().top < headerBottom + 8) setBelow(true);
    }, [open, below]);

    useEffect(() => {
        if (!open) return;
        const close = () => { setOpen(false); setPinned(false); };
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const total = estimateParlay(legs);

    return (
        <div
            className="relative"
            ref={ref}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => { if (!pinned) setOpen(false); }}
        >
            <button
                className="p-0.5 rounded-full cursor-pointer text-zinc-500 hover:text-sky-400 aria-expanded:text-sky-400"
                type="button"
                aria-label="How the estimated chance is calculated"
                aria-expanded={open}
                onClick={() => {
                    setPinned(!pinned);
                    setOpen(!pinned);
                }}
            >
                <Info size={14} />
            </button>
            {open &&
                <div
                    ref={boxRef}
                    className={`absolute z-20 left-0 ${below ? "top-full mt-2" : "bottom-full mb-2"} w-[min(22rem,calc(100vw-2rem))] flex flex-col gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-sm normal-case tracking-normal text-zinc-300`}
                    role="dialog"
                    aria-label="Estimated chance explained"
                >
                    <p className="font-semibold text-zinc-100">How the chance is estimated</p>
                    <ol className="flex flex-col gap-1.5 list-decimal pl-4 text-zinc-400">
                        <li>
                            Each leg blends its hit rates over the last 10 games, this season and vs the opponent,
                            weighted as shown below. Missing samples are left out.
                        </li>
                        <li>
                            Small samples are pulled toward 50% by counting one extra hit and one extra miss,
                            so 10/10 becomes 92%, not a sure thing.
                        </li>
                        <li>
                            Only games before each leg's game count, so the estimate stays the same after the game is played.
                        </li>
                        <li>
                            The legs are multiplied together as if independent. Legs from the same game often
                            move together, so treat it as a rough guide.
                        </li>
                    </ol>
                    <ul className="flex flex-col gap-2 pt-3 border-t border-zinc-800">
                        {legs.map((leg) => {
                            const e = estimateLeg(leg);
                            return (
                                <li key={leg.id} className="flex flex-col gap-0.5">
                                    <span className="flex justify-between gap-3">
                                        <span className="truncate text-zinc-200">{legName(leg)}</span>
                                        <span className="font-semibold tabular-nums text-zinc-100">{e.chance === null ? "–" : percent(e.chance)}</span>
                                    </span>
                                    <span className="text-xs text-zinc-500 tabular-nums">
                                        {e.parts.length === 0 ?
                                            "no games to estimate from" :
                                            e.parts.map((p) => `${p.label} ${p.hits}/${p.games} → ${percent(p.adjusted)} × ${Math.round(p.weight * 100)}%`).join(" · ")
                                        }
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="flex justify-between pt-2 border-t border-zinc-800 text-zinc-100">
                        <span>All legs multiplied</span>
                        <span className="font-semibold tabular-nums">{total === null ? "–" : percent(total)}</span>
                    </p>
                    <Link className="text-xs text-sky-400 hover:underline" to="/accuracy">How accurate are these chances? →</Link>
                </div>
            }
        </div>
    )
}

export default EstimateInfo;
