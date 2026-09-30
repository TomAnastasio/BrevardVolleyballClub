import { AlertDialog, Button, Card, buttonVariants } from "@heroui/react";
import TeamPanel from "./TeamPanel.jsx";

export default function GameView({ scoreboard, onSaveGame }) {
  const { state, aWins, bWins, winnerName, showBanner, changeScore, setName, resetGame, dismissBanner } = scoreboard;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-row">
        <TeamPanel
          winner={aWins}
          score={state.a}
          name={state.nameA}
          fallback="Team A"
          onInc={() => changeScore("a", 1)}
          onDec={() => changeScore("a", -1)}
          onNameCommit={(next) => setName("a", next)}
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
          name={state.nameB}
          fallback="Team B"
          onInc={() => changeScore("b", 1)}
          onDec={() => changeScore("b", -1)}
          onNameCommit={(next) => setName("b", next)}
        />
      </div>

      {showBanner && (
        <Card
          role="alert"
          className="mx-3 mt-2 flex flex-col items-center gap-2 bg-success p-4 text-center text-success-foreground shadow-lg"
        >
          <p className="m-0 font-extrabold">{winnerName} wins!</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onPress={onSaveGame}
              className="rounded-full bg-success-foreground text-success"
            >
              Save &amp; New Game
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

      <div className="flex flex-none justify-center p-2">
        <AlertDialog>
          <AlertDialog.Trigger
            className={buttonVariants({ variant: "secondary" }) + " min-w-32 min-h-12"}
            aria-label="Start a new game, resets both scores to zero"
          >
            New Game
          </AlertDialog.Trigger>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.Header>
                  <AlertDialog.Heading>Start a new game?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>This resets both scores to 0.</AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button variant="outline" slot="close">
                    Cancel
                  </Button>
                  <Button variant="danger" slot="close" onPress={resetGame}>
                    Start New Game
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </div>
  );
}
