export type League = {
    slug: string;         // the league's url, '/nba'
    name: string;
    available: boolean;   // false = shown greyed with 'Soon', can't be picked
};

// every league by sport, in the order the league menu shows them
export const SPORTS: { sport: string, emoji: string, leagues: League[] }[] = [
    {
        sport: "Basketball",
        emoji: "🏀",
        leagues: [
            { slug: "nba", name: "NBA", available: true },
            { slug: "euroleague", name: "EuroLeague", available: false },
        ],
    },
    {
        sport: "Football",
        emoji: "⚽",
        leagues: [
            { slug: "premier-league", name: "Premier League", available: false },
            { slug: "laliga", name: "LaLiga", available: false },
            { slug: "bundesliga", name: "Bundesliga", available: false },
            { slug: "serie-a", name: "Serie A", available: false },
            { slug: "ligue-1", name: "Ligue 1", available: false },
            { slug: "ucl", name: "UCL", available: false },
        ],
    },
    {
        sport: "Hockey",
        emoji: "🏒",
        leagues: [
            { slug: "nhl", name: "NHL", available: false },
            { slug: "liiga", name: "Liiga", available: false },
        ],
    },
];

export const LEAGUES = SPORTS.flatMap((s) => s.leagues.map((l) => ({ ...l, sport: s.sport, emoji: s.emoji })));

// the league with this slug if it can be used, otherwise undefined
export const availableLeague = (slug: string | null | undefined) =>
    LEAGUES.find((l) => l.slug === slug && l.available);

export const FALLBACK_LEAGUE = "nba";
