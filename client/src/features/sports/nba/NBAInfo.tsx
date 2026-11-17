import { useState, useEffect } from "react";
import { getUpcomingGames } from "../../../api/nba/nbaGamesApi";
import type { NbaGame } from "../../../types/nba";
import NBAGameCard from "./NBAGameCard";
import { usDayKey } from "../../../utils/nbaGame";

type GameDay = { date: string, games: NbaGame[] };

// groups games by date, keeps the order they come in (soonest first)
const groupByDay = (games: NbaGame[]) => {
    const days: GameDay[] = [];
    for (const g of games) {
        const date = g.game_date.slice(0, 10);
        let day = days.find((d) => d.date === date);
        if (!day) {
            day = { date, games: [] };
            days.push(day);
        }
        day.games.push(g);
    }
    return days;
};

// "Today" / "Tomorrow" based on the US date (game_date is the US date), otherwise the date itself
const dayLabel = (date: string) => {
    if (date === usDayKey(0)) return "Today";
    if (date === usDayKey(1)) return "Tomorrow";
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fi-FI");
};

function NBAInfo() {

    const [loading, setLoading] = useState<boolean>(true);

    const [upcomingGames, setUpcomingGames] = useState<NbaGame[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const games = await getUpcomingGames();
                if (!cancelled) setUpcomingGames(games);
            } catch (error) {
                if (!cancelled) {
                    alert("Something went wrong, please try again");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, []);


    if (loading) {
        return (
            <p className="text-2xl">Loading...</p>
        )
    }

    if (upcomingGames.length === 0) {
        return (
            <div className="flex flex-col space-y-4">
                <p className="text-xl">Upcoming games not found...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-4 p-4">
            {groupByDay(upcomingGames).map((day) => (
                <div key={day.date} className="flex flex-col space-y-2">
                    <span className="text-xl font-semibold">{dayLabel(day.date)}</span>
                    <ul className="flex flex-wrap gap-4">
                        {day.games.map((g) => (
                            <li key={g.id}>
                                <NBAGameCard game={g} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}

export default NBAInfo;