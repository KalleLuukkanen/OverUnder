-- Reports of the estimate backtest (server/scripts/backtestEstimate.ts): how well the estimated chances
-- matched what happened in past games. The accuracy page shows the newest one.
CREATE TABLE estimate_backtest (
    id         SERIAL PRIMARY KEY,
    model      TEXT        NOT NULL,              -- estimator's name, e.g. 'blend-v1'
    report     JSONB       NOT NULL,              -- seasons, line rule and the scores per bet type
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
