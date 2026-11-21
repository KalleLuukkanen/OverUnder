import { useState } from "react";
import { User, Users } from "lucide-react";
import NBAPlayerPropChecker from "./NBAPlayerPropChecker";
import NBATeamPropChecker from "./NBATeamPropChecker";

type Mode = "player" | "team";

const MODES: { value: Mode, label: string, icon: React.ReactNode }[] = [
    { value: "player", label: "Player", icon: <User size={14} /> },
    { value: "team", label: "Team & game", icon: <Users size={14} /> },
];

// NBA prop checker: a toggle between player props and team / game bets
function NBAPropChecker() {

    const [mode, setMode] = useState<Mode>("player");

    return (
        <div className="flex flex-col gap-4">
            <div className="flex w-fit rounded-md border border-zinc-700 overflow-hidden text-sm" role="group" aria-label="Bet type">
                {MODES.map((m) => (
                    <button
                        key={m.value}
                        className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer ${mode === m.value ? "bg-sky-500 text-on-accent" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
                        type="button"
                        aria-pressed={mode === m.value}
                        onClick={() => setMode(m.value)}
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
