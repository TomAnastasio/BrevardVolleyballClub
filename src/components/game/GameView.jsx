import TeamPanel from "./TeamPanel.jsx";
import WinBanner from "./WinBanner.jsx";

export default function GameView({ scoreboard, onSaveGame, effectiveWidth, effectiveHeight }) {
  const { state, usesRoster, aWins, bWins, winnerName, showBanner, changeScore, setName, dismissBanner } = scoreboard;

  const namesA = usesRoster ? null : [state.nameA1, state.nameA2];
  const namesB = usesRoster ? null : [state.nameB1, state.nameB2];
  const fallbacks = usesRoster ? null : ["Player 1", "Player 2"];
  const fallbacksB = usesRoster ? null : ["Player 1", "Player 2"];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-row">
        <TeamPanel
          winner={aWins}
          score={state.a}
          names={namesA}
          fallbacks={fallbacks}
          roster={usesRoster ? state.teamAPlayers : null}
          side="A"
          color={state.colorA}
          onInc={() => changeScore("a", 1)}
          onDec={() => changeScore("a", -1)}
          onNameCommit={(slot, next) => setName("a", slot, next)}
          effectiveWidth={effectiveWidth}
          effectiveHeight={effectiveHeight}
        />

        <div
          aria-hidden="true"
          className="flex flex-none items-center justify-center px-1 text-sm font-bold tracking-wide text-muted"
        >
          <span>BVC</span>
        </div>

        <TeamPanel
          winner={bWins}
          score={state.b}
          names={namesB}
          fallbacks={fallbacksB}
          roster={usesRoster ? state.teamBPlayers : null}
          side="B"
          color={state.colorB}
          onInc={() => changeScore("b", 1)}
          onDec={() => changeScore("b", -1)}
          onNameCommit={(slot, next) => setName("b", slot, next)}
          effectiveWidth={effectiveWidth}
          effectiveHeight={effectiveHeight}
        />
      </div>

      {showBanner && (
        <WinBanner
          winnerName={winnerName}
          onSaveGame={onSaveGame}
          onKeepPlaying={dismissBanner}
          className="mx-3 mt-2 phone-landscape:mx-2 phone-landscape:mt-1"
        />
      )}
    </div>
  );
}
