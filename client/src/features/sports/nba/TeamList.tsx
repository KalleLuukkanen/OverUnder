import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAll } from "../../../api/nba/nbaTeamsApi";
import type { NbaTeam } from "../../../types/nba";

// quiet row of team abbreviations linking to the team pages, full name on hover
function TeamList() {

    const [teams, setTeams] = useState<NbaTeam[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getAll();
                // abbreviations are easier to scan in their own alphabetical order
                if (!cancelled) setTeams([...result].sort((a, b) => a.abbreviation.localeCompare(b.abbreviation)));
            } catch {
                // the list is only a shortcut, the page works without it
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    if (teams.length === 0) return null;

    return (
        <nav className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-xs" aria-label="NBA teams">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-500">Teams</span>
            {teams.map((t) => (
                <Link
                    key={t.id}
                    className="px-1.5 py-0.5 rounded text-zinc-400 hover:bg-zinc-800 hover:text-sky-400"
                    to={`/nba/team/${t.id}`}
                    title={t.name}
                >
                    {t.abbreviation}
                </Link>
            ))}
        </nav>
    )
}

export default TeamList;
