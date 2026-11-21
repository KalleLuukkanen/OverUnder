import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { SPORTS } from "../types/leagues";
import { useLeague } from "../context/LeagueContext";
import useDismiss from "../utils/useDismiss";

// header button showing the current league, opens every league by sport
// picking one goes to its page; leagues that aren't ready are greyed with 'Soon'
function LeagueSwitcher({ className = "" }: { className?: string }) {

    const { league } = useLeague();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, ref);

    const pick = (slug: string) => {
        setOpen(false);
        navigate(`/${slug}`);
    };

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer font-medium hover:bg-zinc-800 hover:text-white ${open ? "bg-zinc-800 text-white" : "text-zinc-200"}`}
                type="button"
                aria-expanded={open}
                aria-label={`League: ${league.name}, change league`}
                onClick={() => setOpen(!open)}
            >
                <span aria-hidden="true">{league.emoji}</span>
                <span className="hidden sm:inline">{league.name}</span>
                <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open &&
                <div className="absolute right-0 top-full mt-2 z-40 flex flex-col gap-2 w-56 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
                    {SPORTS.map((s) => (
                        <div key={s.sport} className="flex flex-col" role="group" aria-label={s.sport}>
                            <span className="px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-500">{s.emoji} {s.sport}</span>
                            {s.leagues.map((l) => {
                                const current = l.slug === league.slug;
                                return (
                                    <button
                                        key={l.slug}
                                        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-sm ${!l.available
                                            ? "text-zinc-600 cursor-not-allowed"
                                            : current ? "text-sky-400 cursor-pointer hover:bg-zinc-800" : "text-zinc-200 cursor-pointer hover:bg-zinc-800 hover:text-white"}`}
                                        type="button"
                                        disabled={!l.available}
                                        aria-current={current ? "true" : undefined}
                                        onClick={() => pick(l.slug)}
                                    >
                                        {l.name}
                                        {!l.available && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
                                        {current && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            }
        </div>
    )
}

export default LeagueSwitcher;
