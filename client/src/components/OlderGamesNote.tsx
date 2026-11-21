import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { previousSeason } from "../utils/nbaGame";

// under a game list that was cut to the open seasons (signed out): says older games need an account
function OlderGamesNote() {
    const location = useLocation();
    return (
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Lock size={14} className="text-sky-400 shrink-0" />
            <span>
                Games before {previousSeason()} are for members.{" "}
                <Link className="text-sky-400 hover:underline" to="/auth" state={{ from: location.pathname + location.search }}>Sign in</Link> to see them.
            </span>
        </p>
    )
}

export default OlderGamesNote;
