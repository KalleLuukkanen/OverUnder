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

export { usTodayKey, usDayKey, isPlayed, isScoreMissing };
