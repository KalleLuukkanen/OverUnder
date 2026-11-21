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

// every player of the current regular season with per game averages, whether they're a rookie, and
// the game minimum to be ranked (LEADER_MIN_SHARE of the most games played)
// a rookie's first season is this one (from_year), or without from_year they have no earlier games
const getSeasonPlayers = async () => {
    const season = currentSeason();
    const players = await sql`
        SELECT
            pg.player_id, p.name,
            -- the team of their latest game, traded players show their current team
            nba_team_abbreviation((array_agg(pg.team_id ORDER BY g.game_date DESC))[1], ${season}) AS team,
            (array_agg(pg.team_id ORDER BY g.game_date DESC))[1] AS team_id,
            COALESCE(p.from_year = ${Number(season.slice(0, 4))}, NOT EXISTS (
                SELECT 1 FROM nba_player_game e JOIN nba_game eg ON eg.id = e.game_id
                WHERE e.player_id = pg.player_id AND eg.season < ${season}
            )) AS rookie,
            count(*)::int AS games,
            round(avg(pg.minutes), 1)::float8 AS minutes,
            round(avg(pg.pts), 1)::float8 AS pts,
            round(avg(pg.reb), 1)::float8 AS reb,
            round(avg(pg.ast), 1)::float8 AS ast,
            round(avg(pg.stl), 1)::float8 AS stl,
            round(avg(pg.blk), 1)::float8 AS blk,
            round(avg(pg.tov), 1)::float8 AS tov,
            round(avg(pg.fg3m), 1)::float8 AS fg3m,
            round(100 * sum(pg.fgm)::numeric / nullif(sum(pg.fga), 0), 1)::float8 AS fg_pct,
            round(100 * sum(pg.fg3m)::numeric / nullif(sum(pg.fg3a), 0), 1)::float8 AS fg3_pct,
            round(100 * sum(pg.ftm)::numeric / nullif(sum(pg.fta), 0), 1)::float8 AS ft_pct
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        JOIN nba_player p ON p.id = pg.player_id
        WHERE g.season = ${season} AND ${REGULAR_SEASON}
        GROUP BY pg.player_id, p.name, p.from_year;
    `;
    const mostGames = Math.max(0, ...players.map((p) => p.games as number));
    return { season, players, minGames: Math.ceil(mostGames * LEADER_MIN_SHARE) };
};

// current season's league leaders: top 10 per game in points, rebounds, assists, steals, blocks and threes,
// for all players and for rookies only (the same game minimum for both)
const getLeaders = async (limit = 10) => {
    const { season, players, minGames } = await getSeasonPlayers();
    const qualified = players.filter((p) => p.games >= minGames);

    // top players of each stat in the given group
    const leadersOf = (group: typeof qualified) => Object.fromEntries(LEADER_STATS.map((stat) => [
        stat,
        [...group]
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

    return {
        season,
        min_games: minGames,
        leaders: leadersOf(qualified),
        rookies: leadersOf(qualified.filter((p) => p.rookie)),
    };
};

// one player's current regular season: averages and their rank in each leader stat among the players
// with enough games (rank = 1 + how many are ahead, so ties share a rank), and among rookies for a rookie
// ranks are null when the player has fewer games than the minimum; null overall if no games this season
const getPlayerSeason = async (player_id: number) => {
    const { season, players, minGames } = await getSeasonPlayers();
    const player = players.find((p) => p.player_id === player_id);
    if (!player) return null;
    const qualifies = player.games >= minGames;
    const qualified = players.filter((p) => p.games >= minGames);
    const rankIn = (group: typeof qualified, stat: string) =>
        1 + group.filter((p) => p[stat] > player[stat]).length;

    return {
        season,
        min_games: minGames,
        qualifies,
        rookie: player.rookie as boolean,
        averages: {
            games: player.games as number,
            minutes: player.minutes as number | null,
            pts: player.pts as number,
            reb: player.reb as number,
            ast: player.ast as number,
            stl: player.stl as number,
            blk: player.blk as number,
            tov: player.tov as number,
            fg3m: player.fg3m as number,
            fg_pct: player.fg_pct as number | null,
            fg3_pct: player.fg3_pct as number | null,
            ft_pct: player.ft_pct as number | null,
        },
        ranks: Object.fromEntries(LEADER_STATS.map((stat) => [stat, {
            rank: qualifies ? rankIn(qualified, stat) : null,
            rookie_rank: qualifies && player.rookie ? rankIn(qualified.filter((p) => p.rookie), stat) : null,
        }])),
        qualified_players: qualified.length,
    };
};

export {
    getStandings,
    getLeaders,
    getPlayerSeason,
};
