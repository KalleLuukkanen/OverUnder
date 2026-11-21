import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import { LeagueProvider } from "./context/LeagueContext";

export default function Layout() {
    // the league is read from the url, so the provider sits inside the router
    return (
        <LeagueProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
                    <Outlet />
                </main>
            </div>
        </LeagueProvider>
    )
}
