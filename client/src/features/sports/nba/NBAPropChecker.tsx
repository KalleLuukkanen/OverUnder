import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { withBet } from "../../../utils/betParams";
import { User, Users } from "lucide-react";
import NBAPlayerPropChecker from "./NBAPlayerPropChecker";
import NBATeamPropChecker from "./NBATeamPropChecker";

type Mode = "player" | "team";

const MODES: { value: Mode, label: string, icon: React.ReactNode }[] = [
    { value: "player", label: "Player", icon: <User size={14} /> },
    { value: "team", label: "Team & game", icon: <Users size={14} /> },
];

// NBA prop checker: a toggle between player props and team / game bets
// a team bet in the url (?bet=team) opens the team side
function NBAPropChecker() {

    const [searchParams, setSearchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>(searchParams.get("bet") === "team" ? "team" : "player");

    // switching side drops the other side's checked bet from the url
    const changeMode = (next: Mode) => {
        if (next === mode) return;
        setMode(next);
        setSearchParams((params) => withBet(params, next === "team" ? { bet: "team" } : null), { replace: true });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex w-fit rounded-md border border-zinc-700 overflow-hidden text-sm" role="group" aria-label="Bet type">
                {MODES.map((m) => (
                    <button
                        key={m.value}
                        className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer ${mode === m.value ? "bg-sky-500 text-on-accent" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                        type="button"
                        aria-pressed={mode === m.value}
                        onClick={() => changeMode(m.value)}
                    >
                        {m.icon}
                        {m.label}
                    </button>
                ))}
            </div>
            {mode === "player" ? <NBAPlayerPropChecker /> : <NBATeamPropChecker />}
        </div>
    )
}

export default NBAPropChecker;
