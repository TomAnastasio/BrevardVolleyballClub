import { Button, Card } from "@heroui/react";
import TeamPanel from "./TeamPanel.jsx";

export default function GameView({ scoreboard, onSaveGame }) {
  const { state, aWins, bWins, winnerName, showBanner, changeScore, setName, dismissBanner } = scoreboard;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-row">
        <TeamPanel
          winner={aWins}
          score={state.a}
          names={[state.nameA1, state.nameA2]}
          fallbacks={["Player 1", "Player 2"]}
          side="A"
          color={state.colorA}
          onInc={() => changeScore("a", 1)}
          onDec={() => changeScore("a", -1)}
          onNameCommit={(slot, next) => setName("a", slot, next)}
        />

        <div
          aria-hidden="true"
          className="flex flex-none items-center justify-center px-1 text-sm font-bold text-muted [writing-mode:vertical-rl]"
        >
          <span>VS</span>
        </div>

        <TeamPanel
          winner={bWins}
          score={state.b}
          names={[state.nameB1, state.nameB2]}
          fallbacks={["Player 1", "Player 2"]}
          side="B"
          color={state.colorB}
          onInc={() => changeScore("b", 1)}
          onDec={() => changeScore("b", -1)}
          onNameCommit={(slot, next) => setName("b", slot, next)}
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
