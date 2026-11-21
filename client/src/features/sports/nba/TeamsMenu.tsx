import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { getAll } from "../../../api/nba/nbaTeamsApi";
import type { NbaTeam } from "../../../types/nba";
import useDismiss from "../../../utils/useDismiss";

// conferences and their divisions by team id, the menu's columns
const CONFERENCES = [
    {
        name: "Eastern",
        divisions: [
            { name: "Atlantic", ids: [1610612738, 1610612751, 1610612752, 1610612755, 1610612761] },     // BOS BKN NYK PHI TOR
            { name: "Central", ids: [1610612741, 1610612739, 1610612765, 1610612754, 1610612749] },      // CHI CLE DET IND MIL
            { name: "Southeast", ids: [1610612737, 1610612766, 1610612748, 1610612753, 1610612764] },    // ATL CHA MIA ORL WAS
        ],
    },
    {
        name: "Western",
        divisions: [
            { name: "Northwest", ids: [1610612743, 1610612750, 1610612760, 1610612757, 1610612762] },    // DEN MIN OKC POR UTA
            { name: "Pacific", ids: [1610612744, 1610612746, 1610612747, 1610612756, 1610612758] },      // GSW LAC LAL PHX SAC
            { name: "Southwest", ids: [1610612742, 1610612745, 1610612763, 1610612740, 1610612759] },    // DAL HOU MEM NOP SAS
        ],
    },
];

// "Teams" button next to the NBA views: opens every team in columns, East and West by division
// the panel spans the header (its nearest positioned parent), so 30 teams fit without a tall list
function TeamsMenu({ buttonClass }: { buttonClass: string }) {

    const [open, setOpen] = useState(false);
    const [teams, setTeams] = useState<NbaTeam[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, ref);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getAll();
                if (!cancelled) setTeams(result);
            } catch {
                // the menu is only a shortcut, the page works without it
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    if (teams.length === 0) return null;

    const byId = new Map(teams.map((t) => [t.id, t]));

    return (
        <div ref={ref}>
            <button className={buttonClass} type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
                Teams
                <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open &&
                <nav
                    className="absolute left-0 right-0 top-full mt-2 z-20 grid gap-x-8 gap-y-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl lg:grid-cols-2"
                    aria-label="NBA teams"
                >
                    {CONFERENCES.map((conference) => (
                        <div key={conference.name} className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{conference.name} Conference</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                {conference.divisions.map((division) => (
                                    <div key={division.name} className="flex flex-col min-w-0">
                                        <span className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">{division.name}</span>
                                        {division.ids.map((id) => byId.get(id)).filter((t) => t !== undefined).map((t) => (
                                            <Link
                                                key={t.id}
                                                className="flex items-baseline gap-2 -mx-1.5 px-1.5 py-1 rounded text-sm text-zinc-200 hover:bg-zinc-800 hover:text-sky-400"
                                                to={`/nba/team/${t.id}`}
                                                onClick={close}
                                            >
                                                <span className="w-9 shrink-0 text-xs font-semibold text-zinc-500">{t.abbreviation}</span>
                                                <span className="truncate">{t.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            }
        </div>
    )
}

export default TeamsMenu;
