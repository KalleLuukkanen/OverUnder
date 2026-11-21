import postgres from "postgres";

const sql = postgres();

// the newest backtest report (scripts/backtestEstimate.ts), null if it hasn't been run
const getLatestBacktest = async () => {
    const result = await sql`
        SELECT report, created_at
        FROM estimate_backtest
        ORDER BY created_at DESC
        LIMIT 1;
    `;
    if (result.length === 0) return null;
    return { ...result[0].report, created_at: result[0].created_at as Date };
};

export {
    getLatestBacktest,
};
