-- Final score of a game, NULL until the game has been played (box scores synced).
ALTER TABLE nba_game
    ADD COLUMN home_score SMALLINT,
    ADD COLUMN away_score SMALLINT;

-- Backfill already synced games: team's score = sum of its players' points
UPDATE nba_game g
SET home_score = s.home_score,
    away_score = s.away_score
FROM (
    SELECT
        game_id,
        sum(pts) FILTER (WHERE is_home)     AS home_score,
        sum(pts) FILTER (WHERE NOT is_home) AS away_score
    FROM nba_player_game
    GROUP BY game_id
) s
WHERE s.game_id = g.id;
