-- Season totals per player, for season-by-season and career averages.
-- Covers every season in the dataset, so no foreign keys: retired players and
-- old games are not in nba_player / nba_game.
CREATE TABLE nba_player_season (
    player_id     INTEGER NOT NULL,            -- nba.com person id, same as nba_player.id
    season        TEXT    NOT NULL,            -- e.g. '2003-04'
    season_type   TEXT    NOT NULL CHECK (season_type IN ('regular', 'playoffs')),
    teams         TEXT    NOT NULL DEFAULT '', -- e.g. 'CLE' or 'PHX/CLE' when traded, in the order played for
    games         SMALLINT NOT NULL,
    minutes_games SMALLINT NOT NULL,           -- games with minutes recorded, old seasons can be missing them
    minutes       NUMERIC(7, 2) NOT NULL,
    pts           INTEGER NOT NULL,
    reb           INTEGER NOT NULL,
    ast           INTEGER NOT NULL,
    stl           INTEGER NOT NULL,
    blk           INTEGER NOT NULL,
    tov           INTEGER NOT NULL,
    fgm           INTEGER NOT NULL,
    fga           INTEGER NOT NULL,
    fg3m          INTEGER NOT NULL,
    fg3a          INTEGER NOT NULL,
    ftm           INTEGER NOT NULL,
    fta           INTEGER NOT NULL,
    PRIMARY KEY (player_id, season_type, season)
);
