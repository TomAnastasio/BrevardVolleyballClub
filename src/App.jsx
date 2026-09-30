import { useState } from "react";
import SplashScreen from "./components/SplashScreen.jsx";
import LandingView from "./components/LandingView.jsx";
import PlayTodayView from "./components/PlayTodayView.jsx";
import GameTrackingShell from "./components/game/GameTrackingShell.jsx";

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [view, setView] = useState("landing");

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
