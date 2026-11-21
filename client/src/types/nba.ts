// response types of the /api/nba endpoints
// dates come as JSON strings at UTC midnight, e.g. "2026-11-14T00:00:00.000Z" -> use .slice(0, 10) for the date

export type NbaTeam = {
    id: number;
    abbreviation: string;
    name: string;
    wins?: number | null;     // current regular season record, null before the first game
    losses?: number | null;
};

// one team's line in a played game: quarter scores, team stats, record after the game
export type NbaTeamGameStats = {
    game_id: string;
    team_id: number;
    team: string;
    team_name: string;
    is_home: boolean;
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
    ot1: number | null;
    ot2: number | null;
    ot_all: number | null;    // every overtime together
    season_wins: number | null;
    season_losses: number | null;
    fgm: number | null;
    fga: number | null;
    fg3m: number | null;
    fg3a: number | null;
    ftm: number | null;
    fta: number | null;
    reb_off: number | null;
    reb_def: number | null;
    reb: number | null;
    ast: number | null;
    stl: number | null;
    blk: number | null;
    tov: number | null;
    fouls: number | null;
    points_paint: number | null;
    points_fast_break: number | null;
    points_second_chance: number | null;
    points_off_turnovers: number | null;
    points_bench: number | null;
    biggest_lead: number | null;
    biggest_run: number | null;
    lead_changes: number | null;
    times_tied: number | null;
};

export type NbaGame = {
    id: string;
    game_date: string;
    start_time: string | null;   // ISO time in UTC, null if the dataset has no time yet
    season: string;
    home_team_id: number;
    home_team: string;
    home_team_name: string;
    away_team_id: number;
    away_team: string;
    away_team_name: string;
    home_score: number | null;   // null until the game is played
    away_score: number | null;
    overtime_periods: number | null;   // 0 = regulation, null until played
};

export type NbaPlayer = {
    id: number;
    name: string;
    team_id: number | null;
    team: string | null;
    team_name: string | null;
    birth_date: string | null;      // 'yyyy-mm-dd'
    country: string | null;
    school: string | null;
    height_inches: number | null;
    weight_lbs: number | null;
    jersey: string | null;
    position: string | null;        // 'G', 'F', 'C', 'G-F' or 'F-C'
    draft_year: number | null;
    draft_round: number | null;     // null with a draft_year = undrafted
    draft_number: number | null;
    from_year: number | null;
    retired: boolean;               // no team and no games in the current or previous season
};

// player in team's roster, averages are null if no games played this season
export type NbaRosterPlayer = {
    id: number;
    name: string;
    games: number;
    minutes: number | null;
    pts: number | null;
    reb: number | null;
    ast: number | null;
};

export type NbaBoxScore = {
    player_id: number;
    player_name: string;
    game_id: string;
    game_date: string;
    season: string;
    overtime_periods: number | null;
    team_id: number;
    team: string;
    opponent_id: number;
    opponent: string;
    is_home: boolean;
    minutes: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    tov: number;
    fgm: number;
    fga: number;
    fg3m: number;
    fg3a: number;
    ftm: number;
    fta: number;
};

export type NbaSeasonAverages = {
    player_id: number;
    season: string;
    games: number;
    minutes: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    tov: number;
    fgm: number;
    fga: number;
    fg3m: number;
    fg3a: number;
    ftm: number;
    fta: number;
};

export type NbaStat =
    | "pts" | "reb" | "ast" | "stl" | "blk" | "tov"
    | "fgm" | "fga" | "fg3m" | "fg3a" | "ftm" | "fta"
    | "pra" | "pr" | "pa" | "ra" | "stocks";

export type NbaSide = "over" | "under";

export type NbaHitRate = {
    stat: NbaStat;
    line: number;
    side: NbaSide;
    games: number;
    hits: number;
    hit_rate: number | null;   // percent, e.g. 80 or 42.9, null if no games
    average: number | null;
    results: {
        game_id: string;
        game_date: string;
        overtime_periods: number | null;
        opponent: string;
        is_home: boolean;
        minutes: number;
        value: number;
        hit: boolean;
    }[];
};

// one sample of a prop's hit rate splits, e.g. 'Last 5' or 'Home (2026-27)'
export type NbaHitRateSplit = {
    key: string;
    label: string;
    games: number;
    hits: number;
    hit_rate: number | null;   // percent, null if no games
    average: number | null;
};

export type NbaHitRateSplits = {
    stat: NbaStat;
    line: number;
    side: NbaSide;
    splits: NbaHitRateSplit[];
};

// per game averages over a season or a whole career, percentages are null without attempts
export type NbaAverages = {
    games: number;
    minutes: number | null;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    tov: number;
    fgm: number;
    fga: number;
    fg3m: number;
    fg3a: number;
    ftm: number;
    fta: number;
    fg_pct: number | null;
    fg3_pct: number | null;
    ft_pct: number | null;
};

export type NbaPlayerSeason = NbaAverages & {
    season: string;
    teams: string;
};

export type NbaCareerAverages = NbaAverages & {
    seasons: number;
};

// season by season + career averages of one season type, career is null if never played
export type NbaPlayerCareerPart = {
    seasons: NbaPlayerSeason[];
    career: NbaCareerAverages | null;
};

// a player's best game in one stat, the first game it was reached and how many games reached it
export type NbaCareerHigh = {
    stat: "pts" | "reb" | "ast" | "stl" | "blk" | "fg3m" | "fgm" | "ftm";
    value: number;
    times: number;
    game: {
        id: string;
        game_date: string;
        season: string;
        is_home: boolean;
        opponent: string;          // abbreviation of that season
        opponent_id: number;
    };
};

// career highs of the regular season and the playoffs, stats without a single made one left out
export type NbaCareerHighs = {
    regular: NbaCareerHigh[];
    playoffs: NbaCareerHigh[];
};

export type NbaPlayerCareer = {
    regular: NbaPlayerCareerPart;
    playoffs: NbaPlayerCareerPart;
};

// a member's parlay leg: pending until its game is played, no_game if the player had no game scheduled,
// void = the player didn't play, push = exactly on the line
export type ParlayLegStatus = "pending" | "no_game" | "hit" | "miss" | "push" | "void";

// what every leg has: the game it's tied to, the line and its result
type ParlayLegBase = {
    id: number;
    parlay_id: number;
    line: number;                  // team bets: the spread for 'spread' (can be negative), 0 for 'win'
    side: NbaSide;                 // 'over' for win and spread
    odds: number | null;           // the leg's decimal odds when added, if given
    game: {
        id: string;
        game_date: string;
        start_time: string | null;
        is_home: boolean;          // the player's / team's side
        opponent: string;
        opponent_id: number;
    } | null;
    status: ParlayLegStatus;
    value: number | null;          // the stat / bet value in the graded game (the margin for win and spread)
    hit_rates: {
        last5: NbaHitRateSplit | null;
        last10: NbaHitRateSplit | null;
        season: NbaHitRateSplit | null;
        opponent: NbaHitRateSplit | null;
    };
};

// a player prop, e.g. Anthony Edwards over 25.5 points
export type ParlayPlayerLeg = ParlayLegBase & {
    kind: "player";
    player_id: number;
    player_name: string;
    stat: NbaStat;
    minutes: number | null;
};

// a team or game bet, e.g. LAL -5.5 or over 228.5 game total points
export type ParlayTeamLeg = ParlayLegBase & {
    kind: "team";
    team_id: number;
    team: string;                  // abbreviation
    team_name: string;
    market: NbaTeamMarket;
    score: { team: number, opponent: number } | null;   // final score from the team's side, once played
};

export type ParlayLeg = ParlayPlayerLeg | ParlayTeamLeg;

export type Parlay = {
    id: number;
    name: string;
    odds: number | null;           // bookmaker's decimal odds, optional
    created_at: string;
    status: "empty" | "pending" | "won" | "lost" | "void";
    legs: ParlayLeg[];
};

// a team's row in the current season's standings (regular season games only)
export type NbaStanding = {
    team_id: number;
    abbreviation: string;
    name: string;
    conference: "East" | "West";
    wins: number;
    losses: number;
    pct: number;                   // 0-1
    home_wins: number;
    home_losses: number;
    away_wins: number;
    away_losses: number;
    last10_wins: number;
    last10_losses: number;
    streak: string | null;         // 'W3', 'L1', null before the first game
    points_for: number | null;     // per game
    points_against: number | null;
};

export type NbaLeaderStat = "pts" | "reb" | "ast" | "stl" | "blk" | "fg3m";

export type NbaLeader = {
    player_id: number;
    name: string;
    team: string;
    team_id: number;
    games: number;
    value: number;                 // per game
};

// current season's league leaders, all players and rookies only, min_games = games needed to be listed
export type NbaLeaders = {
    season: string;
    min_games: number;
    leaders: Record<NbaLeaderStat, NbaLeader[]>;
    rookies: Record<NbaLeaderStat, NbaLeader[]>;
};

// team bets of the prop checker: win = moneyline, spread = the team's line (e.g. -5.5),
// the rest over / under a line
export type NbaTeamMarket = "win" | "spread" | "team_pts" | "opp_pts" | "total" | "h1_total" | "team_fg3m" | "team_reb";

export type NbaTeamHitRate = {
    market: NbaTeamMarket;
    line: number;
    side: NbaSide;
    games: number;
    hits: number;
    hit_rate: number | null;       // percent, null if no games
    average: number | null;        // average value, for win and spread the average margin
    results: {
        game_id: string;
        game_date: string;
        overtime_periods: number | null;
        opponent: string;
        is_home: boolean;
        team_score: number;
        opp_score: number;
        value: number;             // the bet's value in that game, for win and spread the margin
        hit: boolean;
    }[];
};

export type NbaTeamHitRateSplits = {
    market: NbaTeamMarket;
    line: number;
    side: NbaSide;
    splits: NbaHitRateSplit[];
};

// a player's rank in a leader stat among players with enough games, rookie_rank among rookies (rookies only)
// null when the player has too few games to be ranked
export type NbaStatRank = { rank: number | null, rookie_rank: number | null };

// one player's current regular season: averages and ranks in the leader stats
export type NbaPlayerSeasonRanks = {
    season: string;
    min_games: number;
    qualifies: boolean;            // enough games to be ranked
    rookie: boolean;
    averages: {
        games: number;
        minutes: number | null;
        pts: number;
        reb: number;
        ast: number;
        stl: number;
        blk: number;
        tov: number;
        fg3m: number;
        fg_pct: number | null;
        fg3_pct: number | null;
        ft_pct: number | null;
    };
    ranks: Record<NbaLeaderStat, NbaStatRank>;
    qualified_players: number;     // how many players are ranked
};

// a watched player's / team's next game, from that team's side
export type NbaWatchGame = {
    id: string;
    game_date: string;          // 'yyyy-mm-dd', US date
    start_time: string | null;
    is_home: boolean;
    opponent_id: number;
    opponent: string;
};

export type NbaWatchedPlayer = {
    id: number;
    name: string;
    team_id: number | null;
    team: string | null;
    next_game: NbaWatchGame | null;   // null when no game is scheduled (e.g. free agent)
};

export type NbaWatchedTeam = {
    id: number;
    name: string;
    abbreviation: string;
    next_game: NbaWatchGame | null;
};

export type NbaWatchlist = {
    players: NbaWatchedPlayer[];
    teams: NbaWatchedTeam[];
};
