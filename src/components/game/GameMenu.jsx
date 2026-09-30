import { AlertDialog, Button } from "@heroui/react";
import MenuCard, { MenuCardContent, cardClass, interactiveClass } from "./MenuCard.jsx";

export default function GameMenu({ hasActiveGame, onNewGame, onEraseAndStartNew, onResumeGame, onPastGames }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        {hasActiveGame ? (
          <AlertDialog>
            <AlertDialog.Trigger className={`${cardClass} ${interactiveClass}`} aria-label="New Game">
              <MenuCardContent icon="🆕" label="New Game" subtitle="Set up teams and start scoring" showChevron />
            </AlertDialog.Trigger>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>Game already in progress</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    Starting a new game will erase the game currently in progress. What would you like to do?
                  </AlertDialog.Body>
                  <AlertDialog.Footer className="flex-col items-stretch gap-2">
                    <Button variant="outline" slot="close" className="w-full">
                      Cancel
                    </Button>
                    <Button variant="secondary" slot="close" onPress={onResumeGame} className="w-full">
                      Resume In-Progress Game
                    </Button>
                    <Button variant="danger" slot="close" onPress={onEraseAndStartNew} className="w-full">
                      Erase &amp; Start New Game
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        ) : (
          <MenuCard icon="🆕" label="New Game" subtitle="Set up teams and start scoring" onClick={onNewGame} />
        )}

        <MenuCard
          icon="⏳"
          label="In Progress"
          subtitle={hasActiveGame ? "Continue your current game" : "No game in progress"}
          onClick={onResumeGame}
          disabled={!hasActiveGame}
        />

        <MenuCard icon="🕘" label="Past Games" subtitle="Review completed matches" onClick={onPastGames} />
      </div>
    </div>
  );
}
