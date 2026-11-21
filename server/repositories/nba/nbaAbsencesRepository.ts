import postgres from "postgres";

const sql = postgres();

// only rotation players: this many minutes a game for the team or more
const MIN_MINUTES = 15;

// one of the team's games with the bet's value in it ('day' = 'yyyy-mm-dd')
type ValuedGame = { game_id: string, season: string, day: string, value: number };

// splits a team's games by each current rotation player (except exclude_id) playing or missing them
// a player counts only while he was on the team: in seasons he played for it, and not before / after a trade
// that season (games while he was with another team aren't 'without' him)
// returns the players who missed some of the games, most minutes first, with the values of both groups
const splitByPlayers = async (team_id: number, games: ValuedGame[], seasons: string[], exclude_id?: number) => {
    // every game of the current players in those seasons, for any team
    const rows = await sql`
        SELECT p.id AS player_id, p.name, pg.game_id, pg.team_id, pg.minutes::float8 AS minutes,
            g.season, to_char(g.game_date, 'YYYY-MM-DD') AS day
        FROM nba_player p
        JOIN nba_player_game pg ON pg.player_id = p.id
        JOIN nba_game g ON g.id = pg.game_id
        WHERE p.team_id = ${team_id} AND p.id <> ${exclude_id ?? 0} AND g.season IN ${sql(seasons)};
    `;

    // player id -> name and games
    const players = new Map<number, { name: string, rows: postgres.Row[] }>();
    for (const row of rows) {
        const player = players.get(row.player_id) ?? { name: row.name as string, rows: [] };
        player.rows.push(row);
        players.set(row.player_id, player);
    }

    return [...players.entries()].map(([id, player]) => {
        const played = new Set(player.rows.map((r) => r.game_id as string));
        const without: number[] = [];
        const withPlayer: number[] = [];
        for (const season of seasons) {
            const own = player.rows.filter((r) => r.season === season && r.team_id === team_id).map((r) => r.day as string).sort();
            if (own.length === 0) continue;
            const other = player.rows.filter((r) => r.season === season && r.team_id !== team_id).map((r) => r.day as string);
            // on the team between his last game elsewhere before joining and his first game elsewhere after leaving
            const from = other.filter((d) => d < own[0]).sort().at(-1) ?? "";
            const to = other.filter((d) => d > own[own.length - 1]).sort()[0] ?? "9999";
            for (const g of games) {
                if (g.season !== season || g.day <= from || g.day >= to) continue;
                (played.has(g.game_id) ? withPlayer : without).push(g.value);
            }
        }
        // his minutes a game for this team, how big a part of the team he is
        const forTeam = player.rows.filter((r) => r.team_id === team_id);
        const minutes = forTeam.reduce((sum, r) => sum + (r.minutes ?? 0), 0) / Math.max(forTeam.length, 1);
        return { id, name: player.name, minutes: Math.round(minutes * 10) / 10, without, with: withPlayer };
    })
        .filter((p) => p.minutes >= MIN_MINUTES && p.without.length > 0)
        .sort((a, b) => b.minutes - a.minutes);
};

export {
    type ValuedGame,
    splitByPlayers,
};
