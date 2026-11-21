-- Team and game bets in parlays: a leg is either a player prop (player_id + stat)
-- or a team bet (team_id + market: win, spread, team_pts, opp_pts, total, h1_total, team_fg3m, team_reb).
-- Team bets use the team's next game; line is the team's spread for 'spread' (can be negative), 0 for 'win'.
ALTER TABLE parlay_leg
    ALTER COLUMN player_id DROP NOT NULL,
    ALTER COLUMN stat DROP NOT NULL,
    ADD COLUMN team_id INTEGER REFERENCES nba_team(id),
    ADD COLUMN market  TEXT,
    ADD CONSTRAINT parlay_leg_player_or_team CHECK (
        (player_id IS NOT NULL AND stat IS NOT NULL AND team_id IS NULL AND market IS NULL)
        OR (player_id IS NULL AND stat IS NULL AND team_id IS NOT NULL AND market IS NOT NULL)
    );
