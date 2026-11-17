-- Tip-off time as an exact moment (stored in UTC), clients show it in the viewer's local time.
-- NULL until the next sync fills it. game_date stays the US Eastern date for grouping by day.
ALTER TABLE nba_game
    ADD COLUMN start_time TIMESTAMPTZ;
