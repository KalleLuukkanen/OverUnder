import { useEffect, useState } from "react";
import { getTeamPlayerSplits } from "../../../api/nba/nbaTeamsApi";
import type { NbaTeamHitRate, NbaTeamPlayerSplits } from "../../../types/nba";
import AbsenceTable from "./AbsenceTable";

// the checked team bet in games each current rotation player missed vs played (this season and last),
// e.g. the team total without its star; uses the result's bet, not the form's current values
function TeamPlayerSplits({ team_id, result }: { team_id: number, result: NbaTeamHitRate }) {

    // the splits with the bet they were loaded for: a new bet is loading until its own arrive
    const key = `${team_id}-${result.market}-${result.line}-${result.side}`;
    const [loaded, setLoaded] = useState<{ key: string, data: NbaTeamPlayerSplits | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getTeamPlayerSplits(team_id, { market: result.market, line: result.line, side: result.side });
                if (!cancelled) setLoaded({ key, data: res });
            } catch {
                if (!cancelled) setLoaded({ key, data: null });
            }
        };
        load();
        return () => { cancelled = true };
    }, [key, team_id, result.market, result.line, result.side]);

    if (loaded?.key !== key) return <p className="text-sm text-zinc-500">Loading player splits...</p>;
    if (!loaded.data) return null;

    // win and spread averages are the margin
    const signed = result.market === "win" || result.market === "spread";
    return <AbsenceTable title="When a player sits" column="Player" rows={loaded.data.players} seasons={loaded.data.seasons} signed={signed} />;
}

export default TeamPlayerSplits;
