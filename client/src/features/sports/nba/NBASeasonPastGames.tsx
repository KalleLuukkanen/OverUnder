import { getCurrentSeasonPastGames } from "../../../api/nba/nbaGamesApi";
import { useEffect, useState } from "react";
import type { NbaGame } from "../../../types/nba";
import NBAPastGamesWeek, { type GameDay } from "./NBAPastGamesWeek";

type GameWeek = { weekStart: string, days: GameDay[] };

// formats a local date as 'yyyy-mm-dd'
const toKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// monday of the week the given 'yyyy-mm-dd' day belongs to
const weekStartOf = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const offset = (date.getDay() + 6) % 7; // monday = 0, sunday = 6
    date.setDate(date.getDate() - offset);
    return toKey(date);
};

// groups games into weeks and the weeks into days, keeps the order games come in (latest first)
const groupByWeek = (games: NbaGame[]) => {
    const weeks: GameWeek[] = [];
    for (const g of games) {
        const day = g.game_date.slice(0, 10);
        const weekStart = weekStartOf(day);

        let week = weeks.find((w) => w.weekStart === weekStart);
        if (!week) {
            week = { weekStart, days: [] };
            weeks.push(week);
        }

        let gameDay = week.days.find((d) => d.date === day);
        if (!gameDay) {
            gameDay = { date: day, games: [] };
            week.days.push(gameDay);
        }
        gameDay.games.push(g);
    }
    return weeks;
};

function NBASeasonPastGames() {

    const [loading, setLoading] = useState(true);
    const [weeks, setWeeks] = useState<GameWeek[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const games = await getCurrentSeasonPastGames();
                if (!cancelled) setWeeks(groupByWeek(games));
            } catch {
                if (cancelled) return;
                alert("Something went wrong, please try again");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true };
    }, []);

    if (loading) return <p className="text-2xl">Loading past games...</p>;
    if (weeks.length === 0) return <p className="text-gray-500">No games played yet this season</p>;

    return (
        <div className="flex flex-col space-y-3 mt-2 ml-2">
            {weeks.map((w, i) => (
                <NBAPastGamesWeek key={w.weekStart} weekStart={w.weekStart} days={w.days} defaultOpen={i === 0} />
            ))}
        </div>
    )
}

export default NBASeasonPastGames;
