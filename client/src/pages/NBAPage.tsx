import NBAInfo from "../features/sports/nba/NBAInfo";
import NBASeasonPastGames from "../features/sports/nba/NBASeasonPastGames";
import PlayerSearch from "../features/sports/nba/PlayerSearch";
import { useState } from "react";

function NBAPage() {

    const [showingUpcoming, setShowingUpcoming] = useState(false);
    const [showingPast, setShowingPast] = useState(true);

    return (
        <div className="flex flex-col space-y-2">
            <span className="text-4xl font-bold mx-auto">NBA</span>
            <div>
                <button className="text-2xl cursor-pointer" onClick={() => setShowingUpcoming(!showingUpcoming)}>Upcoming games:</button>
                {showingUpcoming && <NBAInfo />}
            </div>
            <div>
                <button className="text-2xl cursor-pointer" onClick={() => setShowingPast(!showingPast)}>Past games:</button>
                {showingPast && <NBASeasonPastGames />}
            </div>
            <div className="flex flex-col space-y-2 mt-4">
                <span className="text-2xl mr-4">Search for player:</span>
                <PlayerSearch />
            </div>
        </div>
    )
}

export default NBAPage;