import { useEffect, useState } from "react";
import { getTeammateSplits } from "../../../api/nba/nbaPlayerGamesApi";
import type { NbaHitRate, NbaTeammateSplits } from "../../../types/nba";
import AbsenceTable from "./AbsenceTable";

// the checked prop in games each current teammate missed vs played (this season and last, current team)
// a big difference hints the prop depends on that teammate playing, e.g. more shots when the star sits
// uses the result's stat, line and side (what was checked), not the form's current values
function TeammateSplits({ player_id, result }: { player_id: number, result: NbaHitRate }) {

    // the splits with the bet they were loaded for: a new bet is loading until its own arrive
    const key = `${player_id}-${result.stat}-${result.line}-${result.side}`;
    const [loaded, setLoaded] = useState<{ key: string, data: NbaTeammateSplits | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getTeammateSplits(player_id, { stat: result.stat, line: result.line, side: result.side });
                if (!cancelled) setLoaded({ key, data: res });
            } catch {
                if (!cancelled) setLoaded({ key, data: null });
            }
        };
        load();
        return () => { cancelled = true };
    }, [key, player_id, result.stat, result.line, result.side]);

    if (loaded?.key !== key) return <p className="text-sm text-zinc-500">Loading teammate splits...</p>;
    if (!loaded.data) return null;

    return <AbsenceTable title="When a teammate sits" column="Teammate" rows={loaded.data.teammates} seasons={loaded.data.seasons} />;
}

export default TeammateSplits;
