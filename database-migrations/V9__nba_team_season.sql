-- Team's abbreviation and name in a given season. Franchises keep their nba.com id when they move or
-- rename (Seattle SuperSonics -> Oklahoma City Thunder), so old games need the name of their own season.
-- Filled by the collector from the dataset's team names, one row per team per synced season.
CREATE TABLE nba_team_season (
    team_id      INTEGER NOT NULL REFERENCES nba_team(id),
    season       TEXT    NOT NULL,             -- e.g. '2007-08'
    abbreviation TEXT    NOT NULL,             -- e.g. 'SEA'
    name         TEXT    NOT NULL,             -- e.g. 'Seattle SuperSonics'
    PRIMARY KEY (team_id, season)
);

-- team's abbreviation in the given season, the current one if the season has no row (upcoming games)
CREATE FUNCTION nba_team_abbreviation(p_team_id INTEGER, p_season TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        (SELECT abbreviation FROM nba_team_season WHERE team_id = p_team_id AND season = p_season),
        (SELECT abbreviation FROM nba_team WHERE id = p_team_id)
    );
$$;

-- team's full name in the given season, the current one if the season has no row
CREATE FUNCTION nba_team_name(p_team_id INTEGER, p_season TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        (SELECT name FROM nba_team_season WHERE team_id = p_team_id AND season = p_season),
        (SELECT name FROM nba_team WHERE id = p_team_id)
    );
$$;

-- season search: a team's games of one season
CREATE INDEX idx_nba_game_season ON nba_game (season);
