-- Members' parlays: a named group of player props. Deleting the user deletes their parlays.
CREATE TABLE parlay (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    odds       NUMERIC(8, 2),                     -- bookmaker's total decimal odds, optional (e.g. 6.50)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parlay_user ON parlay (user_id);

-- One prop of a parlay, e.g. Anthony Edwards over 25.5 points.
-- game_id = the player's next game when the leg was added, the leg is graded from that game's box score
-- (NULL if the player had no game scheduled: the leg is never graded)
CREATE TABLE parlay_leg (
    id         SERIAL PRIMARY KEY,
    parlay_id  INTEGER     NOT NULL REFERENCES parlay(id) ON DELETE CASCADE,
    player_id  INTEGER     NOT NULL REFERENCES nba_player(id),
    game_id    TEXT        REFERENCES nba_game(id),
    stat       TEXT        NOT NULL,               -- same keys as the hit rate api: 'pts', 'pra', ...
    line       NUMERIC(5, 1) NOT NULL,
    side       TEXT        NOT NULL CHECK (side IN ('over', 'under')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parlay_leg_parlay ON parlay_leg (parlay_id);
