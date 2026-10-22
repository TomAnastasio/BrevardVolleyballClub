import { useState } from "react";
import SplashScreen from "./components/SplashScreen.jsx";
import LandingView from "./components/LandingView.jsx";
import PlayTodayView from "./components/PlayTodayView.jsx";
import LeaderboardView from "./components/LeaderboardView.jsx";
import PlayerProfileView from "./components/PlayerProfileView.jsx";
import GameTrackingShell from "./components/game/GameTrackingShell.jsx";
import WelcomeView from "./components/WelcomeView.jsx";
import AdminPanelView from "./components/admin/AdminPanelView.jsx";
import VersionBadge from "./components/VersionBadge.jsx";
import { AuthProvider } from "./hooks/AuthContext.jsx";
import { hasPendingGameTracking } from "./lib/pendingGameTracking.js";

export default function App({ joinRequested, justJoined }) {
  // A sign-up QR scan skips the splash so the visitor goes straight to Google.
  const [appReady, setAppReady] = useState(joinRequested);
  // The Google OAuth sign-in redirect reloads the page from scratch, which
  // would otherwise always reset to "landing". Jump straight back into game
  // tracking so a signed-in user lands right back where they asked to sign
  // in from, instead of having to re-navigate from the top.
  const [view, setView] = useState(() => {
    if (joinRequested || justJoined) return "welcome";
    return hasPendingGameTracking() ? "game" : "landing";
  });
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <AuthProvider>
      {!joinRequested && <SplashScreen onReveal={() => setAppReady(true)} />}
      {appReady && (
        <div className="flex min-h-dvh flex-col bg-background text-foreground [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif]">
          <VersionBadge />
          {view === "landing" && (
            <LandingView
              onPlayToday={() => setView("play")}
              onGameTracking={() => setView("game")}
              onLeaderboard={() => setView("leaderboard")}
              onAdminPanel={() => setView("admin")}
            />
          )}
          {view === "welcome" && (
            <WelcomeView
              joinRequested={joinRequested}
              onRankings={() => setView("leaderboard")}
              onHome={() => setView("landing")}
            />
          )}
          {view === "play" && <PlayTodayView onBack={() => setView("landing")} />}
          {view === "leaderboard" && (
            <LeaderboardView
              onBack={() => setView("landing")}
              onSelectPlayer={(player) => {
                setSelectedPlayer(player);
                setView("profile");
              }}
            />
          )}
          {view === "profile" && selectedPlayer && (
            <PlayerProfileView player={selectedPlayer} onBack={() => setView("leaderboard")} />
          )}
          {view === "game" && <GameTrackingShell onBack={() => setView("landing")} />}
          {view === "admin" && <AdminPanelView onBack={() => setView("landing")} />}
        </div>
      )}
    </AuthProvider>
  );
}
