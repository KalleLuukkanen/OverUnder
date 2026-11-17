import type { NbaGame } from "../types/nba";

// today's date in US Eastern time as 'yyyy-mm-dd' (game_date is stored as the US date)
const usTodayKey = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

// US Eastern date as 'yyyy-mm-dd', days_ahead days from today
const usDayKey = (days_ahead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days_ahead);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
};

// game is played if it has a score, or its US date has passed (score may just not be synced yet)
const isPlayed = (game: NbaGame) =>
    game.home_score !== null || game.game_date.slice(0, 10) < usTodayKey();

// game date has passed but the score hasn't been synced yet
const isScoreMissing = (game: NbaGame) =>
    game.home_score === null && isPlayed(game);

// date and tip-off time in the viewer's own time zone, e.g. '18.11.2026 klo 2.30'
// without a start time only the date is known, shown as the US date
const gameDateTime = (game: NbaGame) => {
    if (!game.start_time) return new Date(game.game_date).toLocaleDateString("fi-FI");
    const start = new Date(game.start_time);
    const day = start.toLocaleDateString("fi-FI");
    const time = start.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${time}`;
};

export { usTodayKey, usDayKey, isPlayed, isScoreMissing, gameDateTime };
