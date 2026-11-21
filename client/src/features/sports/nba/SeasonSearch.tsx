import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { getSeasons } from "../../../api/nba/nbaGamesApi";
import { getAll } from "../../../api/nba/nbaTeamsApi";
import { getOne as getPlayer, getPlayersCareer } from "../../../api/nba/nbaPlayersApi";
import type { NbaPlayer, NbaTeam } from "../../../types/nba";
import PlayerSearch from "./PlayerSearch";
import TeamSeasonGames from "./TeamSeasonGames";
import PlayerSeasonGames from "./PlayerSeasonGames";
import SignInPrompt from "../../../components/SignInPrompt";
import { authClient } from "../../../utils/auth";
import { isLockedSeason, previousSeason } from "../../../utils/nbaGame";

type Mode = "team" | "player";

const selectClass = "px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 cursor-pointer focus:outline-none focus:border-sky-500";

// search a past season: a team's every game, or a player's stat line of every game
// results show as soon as both the season and the team / player are chosen
// the choices are kept in the url (?by=player&season=2003-04&player=2544), so signing in
// (which returns to the same url), refreshing or sharing the link keeps the search
function SeasonSearch() {

    const [searchParams, setSearchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>(searchParams.get("by") === "player" ? "player" : "team");
    // the url's search is restored once the seasons and the player are loaded, only then the url follows the form
    const [restored, setRestored] = useState(false);
    // the url as the page opened, read once
    const [initialParams] = useState(() => new URLSearchParams(searchParams));

    // seasons before the previous one need an account, they stay in the list with a lock
    const { data: session } = authClient.useSession();
    const signedIn = !!session;

    // every season with played games, latest first
    const [seasons, setSeasons] = useState<string[]>([]);
    const [season, setSeason] = useState("");

    // team mode: teams of the chosen season, with their names back then
    const [teams, setTeams] = useState<NbaTeam[]>([]);
    const [teamId, setTeamId] = useState<number | null>(() => Number(searchParams.get("team")) || null);

    // player mode: the chosen player and the seasons they played
    const [player, setPlayer] = useState<NbaPlayer | null>(null);
    const [playerSeasons, setPlayerSeasons] = useState<string[] | null>(null);

    // seasons and the search in the url: its season if there is one, and its player
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const urlSeason = initialParams.get("season");
            const urlPlayer = Number(initialParams.get("player"));
            try {
                const [result, restoredPlayer] = await Promise.all([
                    getSeasons(),
                    urlPlayer ? getPlayer(urlPlayer).catch(() => null) : null,
                ]);
                if (!cancelled) {
                    setSeasons(result);
                    setSeason(urlSeason && result.includes(urlSeason) ? urlSeason : result[0] ?? "");
                    setPlayer(restoredPlayer);
                }
            } catch {
                if (!cancelled) setSeasons([]);
            } finally {
                if (!cancelled) setRestored(true);
            }
        };
        load();
        return () => { cancelled = true };
    }, [initialParams]);

    // the form's choices into the url, other params (the page's view) stay
    useEffect(() => {
        if (!restored) return;
        setSearchParams((params) => {
            const next = new URLSearchParams(params);
            const set = (key: string, value: string | null) => value ? next.set(key, value) : next.delete(key);
            set("by", mode === "player" ? "player" : null);
            set("season", season || null);
            set("team", mode === "team" && teamId ? String(teamId) : null);
            set("player", mode === "player" && player ? String(player.id) : null);
            return next;
        }, { replace: true });
    }, [restored, mode, season, teamId, player, setSearchParams]);

    // the season's teams, a chosen team stays chosen if it played that season too
    useEffect(() => {
        if (!season) return;
        let cancelled = false;
        const load = async () => {
            try {
                const result = await getAll(season);
                if (!cancelled) {
                    setTeams(result);
                    setTeamId((current) => result.some((t) => t.id === current) ? current : null);
                }
            } catch {
                if (!cancelled) setTeams([]);
            }
        };
        load();
        return () => { cancelled = true };
    }, [season]);

    // a chosen player limits the seasons to the ones they played in
    useEffect(() => {
        if (!player) {
            setPlayerSeasons(null);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const career = await getPlayersCareer(player.id);
                const played = new Set([...career.regular.seasons, ...career.playoffs.seasons].map((s) => s.season));
                if (!cancelled) setPlayerSeasons(seasons.filter((s) => played.has(s)));
            } catch {
                if (!cancelled) setPlayerSeasons(seasons);
            }
        };
        load();
        return () => { cancelled = true };
    }, [player, seasons]);

    const seasonOptions = mode === "player" && playerSeasons ? playerSeasons : seasons;

    // the chosen season isn't one the player played: jump to their latest season
    useEffect(() => {
        if (seasonOptions.length > 0 && !seasonOptions.includes(season)) {
            setSeason(seasonOptions[0]);
        }
    }, [seasonOptions, season]);

    if (seasons.length === 0) return <p className="text-zinc-500">No seasons available</p>;

    const oldest = seasons[seasons.length - 1];
    const locked = isLockedSeason(season, signedIn);
    const playerHasNoSeasons = mode === "player" && playerSeasons !== null && playerSeasons.length === 0;

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-500">
                Every game of a team or a player from any season since {oldest}.
                {!signedIn && ` Seasons before ${previousSeason()} need a free account.`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg" role="group" aria-label="Search by">
                    {(["team", "player"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            className={`px-3 py-1 rounded-md cursor-pointer capitalize ${mode === m ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
                            type="button"
                            aria-pressed={mode === m}
                            onClick={() => setMode(m)}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <select
                    className={selectClass}
                    value={season}
                    aria-label="Season"
                    onChange={(e) => setSeason(e.target.value)}
                >
                    {seasonOptions.map((s) => (
                        <option key={s} value={s}>{s}{isLockedSeason(s, signedIn) ? " 🔒" : ""}</option>
                    ))}
                </select>
                {mode === "team" ?
                    <select
                        className={selectClass}
                        value={teamId ?? ""}
                        aria-label="Team"
                        onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Choose team</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select> :
                    player ?
                        <span className="flex items-center gap-1 pl-3 pr-1 py-1 bg-zinc-950 border border-zinc-700 rounded-lg">
                            <Link className="hover:text-sky-400 hover:underline" to={`/nba/player/${player.id}`}>{player.name}</Link>
                            <button
                                className="p-1 rounded-md cursor-pointer text-zinc-500 hover:bg-zinc-800 hover:text-white"
                                type="button"
                                aria-label="Clear player"
                                onClick={() => setPlayer(null)}
                            >
                                <X size={16} />
                            </button>
                        </span> :
                        <PlayerSearch onSelect={setPlayer} placeholder="Choose player..." className="w-full sm:w-72" />
                }
            </div>
            {locked && (mode === "team" ? teamId !== null : player !== null) &&
                <SignInPrompt
                    title={`${season} is a past season`}
                    text={`Create a free account to search every season since ${oldest}. ${previousSeason()} and the current season are open to everyone.`}
                />
            }
            {!locked && mode === "team" && teamId !== null && season &&
                <TeamSeasonGames team_id={teamId} season={season} />
            }
            {!locked && mode === "player" && player && playerSeasons !== null && (
                playerHasNoSeasons ?
                    <p className="text-zinc-500">No games of {player.name} in the seasons available</p> :
                    season && <PlayerSeasonGames player_id={player.id} season={season} />
            )}
        </div>
    )
}

export default SeasonSearch;
