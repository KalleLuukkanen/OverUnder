-- Members' watchlist: players and teams they follow. A row is either a player or a team.
-- Deleting the user deletes their watchlist.
CREATE TABLE watchlist (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    player_id  INTEGER     REFERENCES nba_player(id) ON DELETE CASCADE,
    team_id    INTEGER     REFERENCES nba_team(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT watchlist_player_or_team CHECK ((player_id IS NULL) <> (team_id IS NULL))
);

-- the same player or team only once per user
CREATE UNIQUE INDEX idx_watchlist_user_player ON watchlist (user_id, player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX idx_watchlist_user_team ON watchlist (user_id, team_id) WHERE team_id IS NOT NULL;
