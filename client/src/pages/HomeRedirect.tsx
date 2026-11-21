import { Navigate } from "react-router-dom";
import { useLeague } from "../context/LeagueContext";

// the home page is the default league's page ('/' -> '/nba')
function HomeRedirect() {
    const { defaultLeague } = useLeague();
    return <Navigate to={`/${defaultLeague}`} replace />;
}

export default HomeRedirect;
