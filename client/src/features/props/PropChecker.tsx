import { useLeague } from "../../context/LeagueContext";
import NBAPropChecker from "../sports/nba/NBAPropChecker";

// leagues that have a prop checker
const CHECKERS: Record<string, () => React.ReactNode> = {
    nba: () => <NBAPropChecker />,
};

// prop checker of the current league (changed from the header)
function PropChecker() {

    const { league } = useLeague();
    const checker = CHECKERS[league.slug];

    return (
        <section className="flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    Check a prop
                    <span className="ml-3 text-base font-normal text-zinc-500">{league.emoji} {league.name}</span>
                </h1>
                <p className="text-zinc-400">How often would your bet have hit? Pick a player or a team, a bet and a line.</p>
            </div>
            {checker ?
                checker() :
                <p className="py-10 text-center text-lg text-zinc-300">{league.name} props are coming soon</p>
            }
        </section>
    )
}

export default PropChecker;
