import { useState } from "react";
import SplashScreen from "./components/SplashScreen.jsx";
import LandingView from "./components/LandingView.jsx";
import PlayTodayView from "./components/PlayTodayView.jsx";
import GameTrackingShell from "./components/game/GameTrackingShell.jsx";
import { hasPendingRankedGame } from "./lib/pendingRankedGame.js";

export default function App() {
  const [appReady, setAppReady] = useState(false);
  // The Google OAuth sign-in redirect reloads the page from scratch, which
  // would otherwise always reset to "landing". Jump straight back into game
  // tracking so a signed-in user lands on their in-progress ranked game
  // instead of having to re-navigate from the top.
  const [view, setView] = useState(() => (hasPendingRankedGame() ? "game" : "landing"));

  return (
    <>
      <SplashScreen onReveal={() => setAppReady(true)} />
      {appReady && (
        <div className="flex min-h-dvh flex-col bg-background text-foreground [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif]">
          {view === "landing" && (
            <LandingView onPlayToday={() => setView("play")} onGameTracking={() => setView("game")} />
          )}
          {view === "play" && <PlayTodayView onBack={() => setView("landing")} />}
          {view === "game" && <GameTrackingShell onBack={() => setView("landing")} />}
        </div>
      )}
    </>
  );
}
