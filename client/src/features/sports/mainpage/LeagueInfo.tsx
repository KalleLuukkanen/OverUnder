import { Link } from "react-router-dom";
import NBAInfo from "../nba/NBAInfo";

function LeagueInfo({ league }: { league: string }) {

    if (league === "NBA") {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase tracking-wide text-zinc-400">Upcoming games</span>
                    <Link className="text-sm text-sky-400 hover:underline" to="/nba">Open NBA page</Link>
                </div>
                <NBAInfo />
            </div>
        )
    } else {
        return (
            <p className="text-zinc-500">Upcoming games not found...</p>
        )
    }
}

export default LeagueInfo;
