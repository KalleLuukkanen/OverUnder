import postgres from "postgres";
import { currentSeason } from "./nbaGamesRepository.js";

const sql = postgres();

// regular season games only: the game id's 3rd digit is 2 (preseason, play-in, playoffs and the Cup final left out)
const REGULAR_SEASON = sql`substring(g.id, 3, 1) = '2'`;

// stats with league leaders, per game averages
const LEADER_STATS = ["pts", "reb", "ast", "stl", "blk", "fg3m"] as const;

// share of the most games played a player needs to be a leader (the NBA uses about 70%)
const LEADER_MIN_SHARE = 0.7;

// Eastern Conference teams by franchise id (ids stay the same when a team moves), the rest are West
const EAST = new Set([
    1610612737, 1610612738, 1610612739, 1610612741, 1610612748, // ATL BOS CLE CHI MIA
    1610612749, 1610612751, 1610612752, 1610612753, 1610612754, // MIL BKN NYK ORL IND
    1610612755, 1610612761, 1610612764, 1610612765, 1610612766, // PHI TOR WAS DET CHA
]);

type TeamRecord = {
    team_id: number;
    abbreviation: string;
    name: string;
    wins: number;
    losses: number;
    home_wins: number;
    home_losses: number;
    away_wins: number;
    away_losses: number;
    points_for: number;
    points_against: number;
    results: boolean[];   // won or not, oldest first
};

// current season's standings from the played regular season games, best record first
// every team of the season is included, also before its first game
const getStandings = async () => {
    const season = currentSeason();

    const teams = await sql`
        SELECT t.id, nba_team_abbreviation(t.id, ${season}) AS abbreviation, nba_team_name(t.id, ${season}) AS name
        FROM nba_team t
        WHERE EXISTS (SELECT 1 FROM nba_game g WHERE g.season = ${season} AND t.id IN (g.home_team_id, g.away_team_id));
    `;
    const games = await sql`
        SELECT g.home_team_id, g.away_team_id, g.home_score, g.away_score
        FROM nba_game g
        WHERE g.season = ${season} AND ${REGULAR_SEASON} AND g.home_score IS NOT NULL
        ORDER BY g.game_date, g.start_time NULLS LAST;
    `;

    const records = new Map<number, TeamRecord>(teams.map((t) => [t.id as number, {
        team_id: t.id as number,
        abbreviation: t.abbreviation as string,
        name: t.name as string,
        wins: 0, losses: 0, home_wins: 0, home_losses: 0, away_wins: 0, away_losses: 0,
        points_for: 0, points_against: 0,
        results: [],
    }]));

    // adds one game to a team's record
    const add = (team_id: number, isHome: boolean, scored: number, allowed: number) => {
        const record = records.get(team_id);
        if (!record) return;
        const won = scored > allowed;
        if (won) record.wins++; else record.losses++;
        if (isHome) { if (won) record.home_wins++; else record.home_losses++; }
        else { if (won) record.away_wins++; else record.away_losses++; }
        record.points_for += scored;
        record.points_against += allowed;
        record.results.push(won);
    };
    for (const g of games) {
        add(g.home_team_id, true, g.home_score, g.away_score);
        add(g.away_team_id, false, g.away_score, g.home_score);
    }

    return [...records.values()].map(({ results, ...r }) => {
        const played = r.wins + r.losses;
        const last10 = results.slice(-10);
        // streak: how many of the latest games in a row ended the same way
        let streak = 0;
        for (let i = results.length - 1; i >= 0 && results[i] === results[results.length - 1]; i--) streak++;
        return {
            ...r,
            conference: EAST.has(r.team_id) ? "East" : "West",
            pct: played ? r.wins / played : 0,
            last10_wins: last10.filter(Boolean).length,
            last10_losses: last10.filter((won) => !won).length,
            streak: streak === 0 ? null : `${results[results.length - 1] ? "W" : "L"}${streak}`,
            points_for: played ? Math.round((r.points_for / played) * 10) / 10 : null,
            points_against: played ? Math.round((r.points_against / played) * 10) / 10 : null,
        };
    }).sort((a, b) => b.pct - a.pct || b.wins - a.wins || a.abbreviation.localeCompare(b.abbreviation));
};

// current season's league leaders: top 10 per game in points, rebounds, assists, steals, blocks and threes
// only players with enough games count (LEADER_MIN_SHARE of the most games played)
const getLeaders = async (limit = 10) => {
    const season = currentSeason();

    const players = await sql`
        SELECT
            pg.player_id, p.name,
            -- the team of their latest game, traded players show their current team
            nba_team_abbreviation((array_agg(pg.team_id ORDER BY g.game_date DESC))[1], ${season}) AS team,
            (array_agg(pg.team_id ORDER BY g.game_date DESC))[1] AS team_id,
            count(*)::int AS games,
            round(avg(pg.pts), 1)::float8 AS pts,
            round(avg(pg.reb), 1)::float8 AS reb,
            round(avg(pg.ast), 1)::float8 AS ast,
            round(avg(pg.stl), 1)::float8 AS stl,
            round(avg(pg.blk), 1)::float8 AS blk,
            round(avg(pg.fg3m), 1)::float8 AS fg3m
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        JOIN nba_player p ON p.id = pg.player_id
        WHERE g.season = ${season} AND ${REGULAR_SEASON}
        GROUP BY pg.player_id, p.name;
    `;
    const mostGames = Math.max(0, ...players.map((p) => p.games as number));
    const minGames = Math.ceil(mostGames * LEADER_MIN_SHARE);
    const qualified = players.filter((p) => p.games >= minGames);

    const leaders = Object.fromEntries(LEADER_STATS.map((stat) => [
        stat,
        [...qualified]
            .sort((a, b) => b[stat] - a[stat] || b.games - a.games)
            .slice(0, limit)
            .map((p) => ({
                player_id: p.player_id as number,
                name: p.name as string,
                team: p.team as string,
                team_id: p.team_id as number,
                games: p.games as number,
                value: p[stat] as number,
            })),
    ]));

    return { season, min_games: minGames, leaders };
};

export {
    getStandings,
    getLeaders,
};
