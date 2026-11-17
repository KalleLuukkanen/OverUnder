-- One row per team per played game (dataset's TeamStatistics.csv):
-- quarter scores, team game stats and the team's season record after the game.
CREATE TABLE nba_team_game (
    game_id              TEXT     NOT NULL REFERENCES nba_game(id),
    team_id              INTEGER  NOT NULL REFERENCES nba_team(id),
    -- points per period, ot1/ot2 only cover the first two overtimes, ot_all covers every overtime
    q1                   SMALLINT,
    q2                   SMALLINT,
    q3                   SMALLINT,
    q4                   SMALLINT,
    ot1                  SMALLINT,
    ot2                  SMALLINT,
    ot_all               SMALLINT,
    -- season record after this game (regular season)
    season_wins          SMALLINT,
    season_losses        SMALLINT,
    -- team totals
    fgm                  SMALLINT,
    fga                  SMALLINT,
    fg3m                 SMALLINT,
    fg3a                 SMALLINT,
    ftm                  SMALLINT,
    fta                  SMALLINT,
    reb_off              SMALLINT,
    reb_def              SMALLINT,
    reb                  SMALLINT,
    ast                  SMALLINT,
    stl                  SMALLINT,
    blk                  SMALLINT,
    tov                  SMALLINT,
    fouls                SMALLINT,
    -- game flow and scoring breakdown
    points_paint         SMALLINT,
    points_fast_break    SMALLINT,
    points_second_chance SMALLINT,
    points_off_turnovers SMALLINT,
    points_bench         SMALLINT,
    biggest_lead         SMALLINT,
    biggest_run          SMALLINT,
    lead_changes         SMALLINT,
    times_tied           SMALLINT,
    PRIMARY KEY (game_id, team_id)
);

-- "team's latest record" looks up the team's newest game
CREATE INDEX idx_ntg_team ON nba_team_game (team_id);
