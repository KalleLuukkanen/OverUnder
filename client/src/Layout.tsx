import { Outlet } from "react-router-dom";
import Header from "./components/Header";

export default function Layout() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}
