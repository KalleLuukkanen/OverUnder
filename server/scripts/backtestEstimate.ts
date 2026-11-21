// backtest of the estimated chance: replays past seasons game by game, estimates each bet
// from only the games before it (like a parlay leg) and scores the estimates against what happened
// the report is saved to estimate_backtest, the accuracy page shows the newest one
//
// run (from the project root):
//   docker compose exec -T server node --env-file=.env --import tsx scripts/backtestEstimate.ts
//   ... scripts/backtestEstimate.ts --seasons 2023-24,2024-25,2025-26
//
// there are no old bookmaker lines in the data, so the lines are made from what was known before each game:
// the average of the last 20 games rounded to x.5, and one step below and above it (the alt lines people check too)

import postgres from "postgres";
import { estimate, MODEL_INFO } from "../estimate.js";
import { Scorer } from "../calibration.js";
import { STATS } from "../repositories/nba/nbaPlayerGamesRepository.js";
import { isHit, MARKETS, type Market, type TeamGameRow } from "../repositories/nba/nbaTeamPropsRepository.js";
import { previousSeason } from "../repositories/nba/nbaGamesRepository.js";

const sql = postgres();

// a player prop needs this many games before it (this season and last) to be tested
const MIN_GAMES = 10;
// and this many minutes a game in the last 10: rotation players, the ones bookmakers offer props on
const MIN_MINUTES = 20;
// the line is the average of this many latest games
const LINE_GAMES = 20;

// season before the given one ('2025-26' -> '2024-25')
const seasonBefore = (season: string) => {
    const startYear = Number(season.slice(0, 4)) - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

// --seasons a,b or the last 3 finished seasons
const readSeasons = () => {
    const i = process.argv.indexOf("--seasons");
    if (i !== -1) return process.argv[i + 1].split(",").map((s) => s.trim()).sort();
    const last = previousSeason();
    return [seasonBefore(seasonBefore(last)), seasonBefore(last), last];
};

// '2025-26' -> 2025, seasons are compared as numbers in the replay
const startYear = (season: string) => Number(season.slice(0, 4));

// one game of a player or team for one bet: its season (start year), value and the opponent, in date order
type Item = { season: number, opponent: number, value: number, minutes: number };

// the scores of one kind of bet (a stat or a market): our estimate and the simpler ones it should beat
type Scores = { ours: Scorer, last10: Scorer, season: Scorer };
const newScores = (): Scores => ({ ours: new Scorer(), last10: new Scorer(), season: new Scorer() });

// hits of a line in items[from, to)
const countHits = (items: Item[], from: number, to: number, hit: (value: number) => boolean) => {
    let hits = 0;
    for (let i = from; i < to; i++) if (hit(items[i].value)) hits++;
    return hits;
};

// replays one player's or team's games for one bet, adding every tested bet to the scores (both the group's and the total's)
// lines = the lines tested for a game from the average before it, hitOf = whether a value hits a line,
// eligible = whether the game is tested at all, from the 10 games before it
const replay = (
    items: Item[],
    seasons: Set<number>,
    lines: (average: number) => number[],
    hitOf: (value: number, line: number) => boolean,
    eligible: (last10: Item[]) => boolean,
    targets: Scores[],
) => {
    // first index of last season and of this season, they only move forward as the seasons do
    let windowStart = 0;
    let seasonStart = 0;
    // opponent -> indexes of the games against it so far
    const vs = new Map<number, number[]>();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lastSeason = item.season - 1;
        while (items[windowStart].season < lastSeason) windowStart++;
        while (items[seasonStart].season < item.season) seasonStart++;
        const vsOpponent = vs.get(item.opponent) ?? [];

        if (seasons.has(item.season) && i - windowStart >= MIN_GAMES) {
            const last10From = i - 10;
            if (eligible(items.slice(last10From, i))) {
                const lineFrom = Math.max(windowStart, i - LINE_GAMES);
                const average = countAverage(items, lineFrom, i);
                const opponentGames = vsOpponent.slice(-10);
                for (const line of lines(average)) {
                    const hit = (value: number) => hitOf(value, line);
                    const last10 = { hits: countHits(items, last10From, i, hit), games: 10 };
                    const season = { hits: countHits(items, seasonStart, i, hit), games: i - seasonStart };
                    const opponent = { hits: opponentGames.filter((j) => hit(items[j].value)).length, games: opponentGames.length };
                    const chance = estimate([
                        { key: "last10", label: "", sample: last10 },
                        { key: "season", label: "", sample: season },
                        { key: "opponent", label: "", sample: opponent },
                    ]).chance as number;
                    const result = hit(item.value);
                    for (const t of targets) {
                        t.ours.add(chance, result);
                        t.last10.add(last10.hits / 10, result);
                        t.season.add(season.games ? season.hits / season.games : 0.5, result);
                    }
                }
            }
        }
        vsOpponent.push(i);
        vs.set(item.opponent, vsOpponent);
    }
};

const countAverage = (items: Item[], from: number, to: number) => {
    let total = 0;
    for (let i = from; i < to; i++) total += items[i].value;
    return total / (to - from);
};

// the average rounded down to x.5 and a step below and above it, lines under min left out
const linesAround = (average: number, step: number, min = 0.5) =>
    [...new Set([-step, 0, step].map((d) => Math.floor(average) + 0.5 + d))].filter((l) => l >= min);

// a group's part of the report
const groupReport = (key: string, kind: "player" | "team", scores: Scores) => {
    const round = (value: number | null) => value === null ? null : Math.round(value * 10000) / 10000;
    return {
        key,
        kind,
        ...scores.ours.score(),
        baselines: {
            coin_flip: 0.25,
            last10: round(scores.last10.brier()),
            season: round(scores.season.brier()),
        },
    };
};

// stat columns loaded for the player props, the combos are added up from them
const COLUMNS = ["pts", "reb", "ast", "stl", "blk", "tov", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta"] as const;
type Column = typeof COLUMNS[number];

// the stats of the app made from the columns, like the hit rate api's SQL
const STAT_COLUMNS: Record<string, Column[]> = {
    pra: ["pts", "reb", "ast"],
    pr: ["pts", "reb"],
    pa: ["pts", "ast"],
    ra: ["reb", "ast"],
    stocks: ["stl", "blk"],
};

// player props: every stat of the app, for every rotation player's game in the seasons
const backtestPlayers = async (seasons: string[]) => {
    const tested = new Set(seasons.map(startYear));
    console.log("Loading player games...");

    // the games go into one array per column instead of an object per game: a few hundred thousand
    // games as objects take too much memory. A player's games are next to each other, in date order
    const season: number[] = [];
    const opponent: number[] = [];
    const minutes: number[] = [];
    const columns = Object.fromEntries(COLUMNS.map((c) => [c, [] as number[]])) as Record<Column, number[]>;
    // where each player's games start, and the end
    const starts: number[] = [];
    let lastPlayer = -1;

    // every game of the players who played in the seasons, from their first season on (for vs opponent),
    // read in batches so the whole result is never in memory at once
    await sql`
        SELECT pg.player_id, substr(g.season, 1, 4)::int AS season, pg.opponent_id,
            COALESCE(pg.minutes, 0)::float8 AS minutes,
            pg.pts, pg.reb, pg.ast, pg.stl, pg.blk, pg.tov, pg.fgm, pg.fga, pg.fg3m, pg.fg3a, pg.ftm, pg.fta
        FROM nba_player_game pg
        JOIN nba_game g ON g.id = pg.game_id
        WHERE pg.player_id IN (
            SELECT DISTINCT pg2.player_id FROM nba_player_game pg2
            JOIN nba_game g2 ON g2.id = pg2.game_id
            WHERE g2.season IN ${sql(seasons)}
        ) AND g.season <= ${seasons[seasons.length - 1]}
        ORDER BY pg.player_id, g.game_date;
    `.cursor(5000, (rows) => {
        for (const r of rows) {
            if (r.player_id !== lastPlayer) {
                starts.push(season.length);
                lastPlayer = r.player_id;
            }
            season.push(r.season);
            opponent.push(r.opponent_id);
            minutes.push(r.minutes);
            for (const c of COLUMNS) columns[c].push(r[c]);
        }
    });
    starts.push(season.length);
    console.log(`${season.length} games of ${starts.length - 1} players loaded`);

    const stats = Object.keys(STATS);
    const groups = new Map(stats.map((st) => [st, newScores()]));
    const total = newScores();
    const rotation = (last10: Item[]) => last10.reduce((sum, g) => sum + g.minutes, 0) / last10.length >= MIN_MINUTES;

    for (const stat of stats) {
        const parts = (STAT_COLUMNS[stat] ?? [stat as Column]).map((c) => columns[c]);
        for (let p = 0; p < starts.length - 1; p++) {
            // one player's games for this stat, only while they're replayed
            const items: Item[] = [];
            for (let i = starts[p]; i < starts[p + 1]; i++) {
                let value = 0;
                for (const part of parts) value += part[i];
                items.push({ season: season[i], opponent: opponent[i], value, minutes: minutes[i] });
            }
            replay(
                items,
                tested,
                (average) => linesAround(average, Math.max(1, Math.round(average * 0.2))),
                (v, line) => v > line,
                rotation,
                [groups.get(stat) as Scores, total],
            );
        }
        console.log(`  ${stat}: ${groups.get(stat)?.ours.score().samples} bets`);
    }

    return {
        total: groupReport("player", "player", total),
        groups: stats.map((st) => groupReport(st, "player", groups.get(st) as Scores)),
    };
};

// team bets: every market, for every team's game in the seasons
// the step between the tested lines of each market, in its own units
const TEAM_STEPS: Record<Exclude<Market, "win">, number> = {
    spread: 3,
    team_pts: 5,
    opp_pts: 5,
    total: 8,
    h1_total: 5,
    team_fg3m: 2,
    team_reb: 3,
};

const backtestTeams = async (seasons: string[]) => {
    const tested = new Set(seasons.map(startYear));
    console.log("Loading team games...");
    // both teams' side of every played game, all seasons (for vs opponent)
    const rows = await sql`
        SELECT t.team_id, substr(g.season, 1, 4)::int AS season,
            CASE WHEN t.is_home THEN g.away_team_id ELSE g.home_team_id END AS opponent_id,
            CASE WHEN t.is_home THEN g.home_score ELSE g.away_score END AS team_score,
            CASE WHEN t.is_home THEN g.away_score ELSE g.home_score END AS opp_score,
            tg.fg3m AS team_fg3m, tg.reb AS team_reb, tg.q1 + tg.q2 + og.q1 + og.q2 AS h1_total
        FROM nba_game g
        CROSS JOIN LATERAL (VALUES (g.home_team_id, true), (g.away_team_id, false)) AS t(team_id, is_home)
        LEFT JOIN nba_team_game tg ON tg.game_id = g.id AND tg.team_id = t.team_id
        LEFT JOIN nba_team_game og ON og.game_id = g.id AND og.team_id <> t.team_id
        WHERE g.home_score IS NOT NULL AND g.season <= ${seasons[seasons.length - 1]}
        ORDER BY t.team_id, g.game_date;
    `;
    console.log(`${rows.length} team games loaded`);

    const byTeam = new Map<number, postgres.Row[]>();
    for (const row of rows) {
        const list = byTeam.get(row.team_id) ?? [];
        list.push(row);
        byTeam.set(row.team_id, list);
    }

    const markets = Object.keys(MARKETS) as Market[];
    const groups = new Map(markets.map((m) => [m, newScores()]));
    const total = newScores();

    for (const market of markets) {
        for (const games of byTeam.values()) {
            // games without the market's stat are left out, like in the hit rates
            const items = games
                .map((r) => ({ season: r.season, opponent: r.opponent_id, value: MARKETS[market].value(r as unknown as TeamGameRow), minutes: 0 }))
                .filter((g): g is Item => g.value !== null);
            if (items.length === 0) continue;
            // win: no line; spread: the team's line is minus its margin (win by 6 on average -> -5.5);
            // the rest over the line, like the player props (under is the same bet turned around)
            const lines = market === "win" ? () => [0] :
                market === "spread" ? (average: number) => linesAround(-average, TEAM_STEPS.spread, -Infinity) :
                    (average: number) => linesAround(average, TEAM_STEPS[market]);
            replay(
                items,
                tested,
                lines,
                (v, line) => isHit(market, v, line, "over"),
                () => true,
                [groups.get(market) as Scores, total],
            );
        }
        console.log(`  ${market}: ${groups.get(market)?.ours.score().samples} bets`);
    }

    return {
        total: groupReport("team", "team", total),
        groups: markets.map((m) => groupReport(m, "team", groups.get(m) as Scores)),
    };
};

const main = async () => {
    const seasons = readSeasons();
    console.log(`Backtesting ${MODEL_INFO.name} on ${seasons.join(", ")}`);
    const started = Date.now();
    const players = await backtestPlayers(seasons);
    const teams = await backtestTeams(seasons);

    const report = {
        model: MODEL_INFO,
        seasons,
        line_rule: `Average of the last ${LINE_GAMES} games rounded to x.5, and one step below and above it. ` +
            `Player props: rotation players (${MIN_MINUTES}+ min a game in the last 10) with ${MIN_GAMES}+ games before. Over side, under is the same bet turned around.`,
        totals: { player: players.total, team: teams.total },
        groups: [...players.groups, ...teams.groups],
    };
    await sql`INSERT INTO estimate_backtest (model, report) VALUES (${MODEL_INFO.name}, ${sql.json(report)});`;

    const t = report.totals;
    console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s`);
    for (const [kind, s] of Object.entries(t)) {
        console.log(`${kind}: ${s.samples} bets, Brier ${s.brier} (last 10 only ${s.baselines.last10}, season only ${s.baselines.season}, coin flip 0.25), picks hit ${s.picks_hit}`);
        for (const b of s.buckets) console.log(`  ${Math.round(b.from * 100)}-${Math.round(b.to * 100)}%: ${b.count} bets, said ${(b.predicted * 100).toFixed(1)}%, hit ${(b.actual * 100).toFixed(1)}%`);
    }
    await sql.end();
};

main().catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
});
