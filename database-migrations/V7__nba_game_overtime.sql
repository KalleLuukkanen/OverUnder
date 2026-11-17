-- Number of overtime periods, NULL until the game is played (box scores synced).
-- Worked out from minutes: regulation = 48 min x 5 players = 240 team minutes, each OT adds 5 x 5 = 25.
ALTER TABLE nba_game
    ADD COLUMN overtime_periods SMALLINT;

-- Backfill already synced games, the team with more minutes decides (rounding absorbs small data gaps)
UPDATE nba_game g
SET overtime_periods = s.overtime_periods
FROM (
    SELECT game_id, greatest(0, max(round((team_minutes - 240) / 25)))::smallint AS overtime_periods
    FROM (
        SELECT game_id, team_id, sum(minutes) AS team_minutes
        FROM nba_player_game
        GROUP BY game_id, team_id
    ) t
    GROUP BY game_id
) s
WHERE s.game_id = g.id;
