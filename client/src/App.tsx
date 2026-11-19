import { Routes, Route } from "react-router-dom";
import AuthPage from "./features/auth/AuthPage";
import MainPage from "./pages/MainPage";
import RequireAuth from "./features/auth/RequireAuth";
import Layout from "./Layout";
import NotFoundPage from "./pages/NotFoundPage";
import NBAPage from "./pages/NBAPage";
import NBAGame from "./pages/NBAGame";
import NBAPlayer from "./pages/NBAPlayer";
import NBATeam from "./pages/NBATeam";
import PropCheckerPage from "./pages/PropCheckerPage";
import ParlaysPage from "./pages/ParlaysPage";

//protected routes inside RequireAuth
export default function App() {
  return (
    <Routes>
      <Route
        element={<Layout />}
      >
        <Route
          path="/"
          element={<MainPage />}
        />
        <Route
          path="/props"
          element={<PropCheckerPage />}
        />
        <Route path="/nba">
          <Route index element={<NBAPage />} />
          <Route path="game/:gameId" element={<NBAGame />} />
          <Route path="player/:playerId" element={<NBAPlayer />} />
          <Route path="team/:teamId" element={<NBATeam />} />
        </Route>
        {/* the page shows a sign in prompt itself when signed out */}
        <Route
          path="/parlays"
          element={<ParlaysPage />}
        />
        <Route
          path="/auth"
          element={<AuthPage />}
        />
        <Route
          element={<RequireAuth />}
        >
        </Route>
        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>
    </Routes>
  );
}
