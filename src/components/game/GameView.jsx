import { Button, Card } from "@heroui/react";
import TeamPanel from "./TeamPanel.jsx";

export default function GameView({ scoreboard, onSaveGame, effectiveWidth, effectiveHeight }) {
  const { state, isIndoor, aWins, bWins, winnerName, showBanner, changeScore, setName, dismissBanner } = scoreboard;

  const namesA = isIndoor ? [state.nameA] : [state.nameA1, state.nameA2];
  const namesB = isIndoor ? [state.nameB] : [state.nameB1, state.nameB2];
  const fallbacks = isIndoor ? ["Team A"] : ["Player 1", "Player 2"];
  const fallbacksB = isIndoor ? ["Team B"] : ["Player 1", "Player 2"];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-row">
        <TeamPanel
          winner={aWins}
          score={state.a}
          names={namesA}
          fallbacks={fallbacks}
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
        <Card
          role="alert"
          className="mx-3 mt-2 flex flex-col items-center gap-2 bg-success p-4 text-center text-success-foreground shadow-lg phone-landscape:mx-2 phone-landscape:mt-1 phone-landscape:flex-row phone-landscape:flex-wrap phone-landscape:gap-2 phone-landscape:p-2"
        >
          <p className="m-0 font-extrabold phone-landscape:text-sm">{winnerName} wins!</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onPress={onSaveGame}
              className="rounded-full bg-success-foreground text-success"
            >
              Save Game
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={dismissBanner}
              className="rounded-full border-2 border-success-foreground text-success-foreground"
            >
              Keep Playing
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
