-- Player bio from the dataset's Players.csv, NULL when the dataset doesn't have it.
ALTER TABLE nba_player
    ADD COLUMN birth_date    DATE,
    ADD COLUMN country       TEXT,
    ADD COLUMN school        TEXT,              -- college, high school or club, e.g. 'Georgia'
    ADD COLUMN height_inches SMALLINT,
    ADD COLUMN weight_lbs    SMALLINT,
    ADD COLUMN jersey        TEXT,
    ADD COLUMN position      TEXT,              -- 'G', 'F', 'C', 'G-F' or 'F-C'
    ADD COLUMN draft_year    SMALLINT,
    ADD COLUMN draft_round   SMALLINT,          -- NULL with a draft_year = undrafted
    ADD COLUMN draft_number  SMALLINT,
    ADD COLUMN from_year     SMALLINT;          -- first NBA season start year
