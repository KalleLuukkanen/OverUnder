import { useState, useEffect } from "react";
import { getUpcomingGames } from "../../../api/nba/nbaGamesApi";
import type { NbaGame } from "../../../types/nba";
import NBAGameCard from "./NBAGameCard";
import { usDayKey } from "../../../utils/nbaGame";
import useWatchlist from "../../watchlist/useWatchlist";
import WatchlistStrip from "../../watchlist/WatchlistStrip";

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

// today's and tomorrow's games; members also see their watchlist, and games with a watched team or player are marked
function NBAInfo() {

    // the watchlist is extra: if it fails, the games are still shown
    const { watchlist } = useWatchlist();

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


    // teams whose games are marked: watched teams and watched players' teams
    const watchedTeams = new Set<number>([
        ...(watchlist?.teams.map((t) => t.id) ?? []),
        ...(watchlist?.players.flatMap((p) => p.team_id === null ? [] : [p.team_id]) ?? []),
    ]);


    if (loading) {
        return (
            <p className="text-zinc-400">Loading games...</p>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            {watchlist && <WatchlistStrip watchlist={watchlist} />}
            {upcomingGames.length === 0 && <p className="text-zinc-500">Upcoming games not found...</p>}
            {groupByDay(upcomingGames).map((day) => (
                <div key={day.date} className="flex flex-col gap-2">
                    <span className="font-semibold text-zinc-300">
                        {dayLabel(day.date)}
                        <span className="ml-2 text-sm font-normal text-zinc-500">{day.games.length} games</span>
                    </span>
                    <ul className="flex flex-wrap gap-3">
                        {day.games.map((g) => (
                            <li key={g.id}>
                                <NBAGameCard game={g} watched={watchedTeams.has(g.home_team_id) || watchedTeams.has(g.away_team_id)} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}

export default NBAInfo;