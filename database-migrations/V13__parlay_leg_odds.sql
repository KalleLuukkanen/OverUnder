-- The bookmaker's decimal odds of a single leg when it was added (optional), e.g. 1.85.
-- Kept to compare the estimates with the market later.
ALTER TABLE parlay_leg ADD COLUMN odds NUMERIC(8, 2);
