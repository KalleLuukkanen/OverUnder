// decimal odds from what the user typed ('1,85' works too), null if empty or not valid odds (1.01-10000)
export const parseOdds = (text: string | null | undefined) => {
    if (!text || text.trim() === "") return null;
    const odds = Number(text.trim().replace(",", "."));
    return Number.isFinite(odds) && odds >= 1.01 && odds <= 10000 ? Math.round(odds * 100) / 100 : null;
};

// the odds from the url as the form's text, '' if missing or invalid
export const readOdds = (params: URLSearchParams) => {
    const odds = parseOdds(params.get("odds"));
    return odds === null ? "" : String(odds);
};

// the chance the odds imply, 0-1 (includes the bookmaker's margin)
export const impliedChance = (odds: number) => 1 / odds;

// expected return per 1 unit staked when the bet hits with chance (0-1): +0.12 = +12%
export const expectedValue = (chance: number, odds: number) => chance * odds - 1;

// the odds that would be fair for the chance (0-1), null for 0%
export const fairOdds = (chance: number) => chance > 0 ? 1 / chance : null;
