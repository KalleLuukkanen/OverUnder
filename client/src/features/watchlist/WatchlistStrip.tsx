import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { NbaWatchGame, NbaWatchlist } from "../../types/nba";
import { gameDateTime } from "../../utils/nbaGame";

// one watched player or team: name to its page, its next game to the game page
function WatchItem({ to, name, team, game }: { to: string, name: string, team?: string | null, game: NbaWatchGame | null }) {
    return (
        <li className="flex items-baseline gap-2 px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-sm">
            <Link className="font-medium text-zinc-100 hover:text-sky-400 hover:underline" to={to}>{name}</Link>
            {team && <span className="text-xs text-zinc-500">{team}</span>}
            {game ?
                <Link className="text-zinc-400 hover:text-sky-400" to={`/nba/game/${game.id}`}>
                    {game.is_home ? "vs" : "@"} {game.opponent} · {gameDateTime(game)}
                </Link> :
                <span className="text-zinc-500">no game scheduled</span>
            }
        </li>
    )
}

// the member's watched players and teams with their next games, shown above the upcoming games
function WatchlistStrip({ watchlist }: { watchlist: NbaWatchlist }) {

    const empty = watchlist.players.length === 0 && watchlist.teams.length === 0;

    return (
        <div className="flex flex-col gap-2 pb-4 border-b border-zinc-800">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                <Star size={16} className="text-amber-300" fill="currentColor" /> Your watchlist
            </span>
            {empty ?
                <p className="text-sm text-zinc-500">Press Watch on a player's or team's page to follow their next games here.</p> :
                <ul className="flex flex-wrap gap-2">
                    {watchlist.players.map((p) => (
                        <WatchItem key={`p${p.id}`} to={`/nba/player/${p.id}`} name={p.name} team={p.team} game={p.next_game} />
                    ))}
                    {watchlist.teams.map((t) => (
                        <WatchItem key={`t${t.id}`} to={`/nba/team/${t.id}`} name={t.name} game={t.next_game} />
                    ))}
                </ul>
            }
        </div>
    )
}

export default WatchlistStrip;
