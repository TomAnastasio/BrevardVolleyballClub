import { useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import GameMenu from "./GameMenu.jsx";
import NewGameForm from "./NewGameForm.jsx";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  new: { title: "New Game", subtitle: null },
  active: { title: "Beach Volleyball Scoreboard", subtitle: null },
  history: { title: "Past Games", subtitle: null },
};

export default function GameTrackingShell({ onBack }) {
  const scoreboard = useScoreboardState();
  const { history, addGame } = useGameHistory();
  const [screen, setScreen] = useState("menu");

  function handleStartGame(payload) {
    scoreboard.startGame(payload);
    setScreen("active");
  }

  function handleEraseAndStartNew() {
    scoreboard.clearActiveGame();
    setScreen("new");
  }

  function handleSaveGame() {
    addGame({
      nameA: scoreboard.teamAName,
      nameB: scoreboard.teamBName,
      a: scoreboard.state.a,
      b: scoreboard.state.b,
    });
    scoreboard.clearActiveGame();
    if (navigator.vibrate) navigator.vibrate(20);
    setScreen("menu");
  }

  const meta = SCREEN_META[screen];
  const isMenu = screen === "menu";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex items-center gap-2 px-2 pb-1 phone-landscape:pb-0"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={() => (isMenu ? onBack() : setScreen("menu"))}
          aria-label={isMenu ? "Back to main menu" : "Back to game tracking menu"}
          className="rounded-lg px-2 py-2 font-bold phone-landscape:px-1.5 phone-landscape:py-1 phone-landscape:text-sm focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {isMenu ? "Menu" : "Back"}
        </button>
        <div className="flex-1 pr-12 text-center phone-landscape:pr-9">
          <h1 className="m-0 text-[clamp(1rem,4vw,1.4rem)] font-bold phone-landscape:text-sm">{meta.title}</h1>
          {meta.subtitle && (
            <p className="m-0 mt-0.5 text-sm text-muted phone-landscape:hidden">{meta.subtitle}</p>
          )}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {screen === "menu" && (
          <GameMenu
            hasActiveGame={scoreboard.hasActiveGame}
            onNewGame={() => setScreen("new")}
            onEraseAndStartNew={handleEraseAndStartNew}
            onResumeGame={() => setScreen("active")}
            onPastGames={() => setScreen("history")}
          />
        )}
        {screen === "new" && <NewGameForm onStart={handleStartGame} />}
        {screen === "active" && scoreboard.state && <GameView scoreboard={scoreboard} onSaveGame={handleSaveGame} />}
        {screen === "history" && <HistoryView history={history} />}
      </main>
    </div>
  );
}
