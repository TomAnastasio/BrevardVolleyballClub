import { AlertDialog, Button } from "@heroui/react";

const cardClass =
  "flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-200";
const interactiveClass =
  "cursor-pointer active:scale-[0.98] hover:border-accent/40 hover:bg-white/[0.08] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2";

function MenuCardContent({ icon, label, subtitle, showChevron }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-2xl"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[1.05rem] font-bold leading-tight">{label}</span>
        <span className="text-sm text-muted">{subtitle}</span>
      </span>
      {showChevron && (
        <span aria-hidden="true" className="flex-none text-xl text-muted">
          ›
        </span>
      )}
    </>
  );
}

function MenuCard({ icon, label, subtitle, onClick, disabled }) {
  if (disabled) {
    return (
      <div aria-disabled="true" className={`${cardClass} cursor-not-allowed opacity-40`}>
        <MenuCardContent icon={icon} label={label} subtitle={subtitle} showChevron={false} />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${cardClass} ${interactiveClass}`}>
      <MenuCardContent icon={icon} label={label} subtitle={subtitle} showChevron />
    </button>
  );
}

export default function GameMenu({ hasActiveGame, onNewGame, onEraseAndStartNew, onResumeGame, onPastGames }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        {hasActiveGame ? (
          <AlertDialog>
            <AlertDialog.Trigger className={`${cardClass} ${interactiveClass}`} aria-label="New Game">
              <MenuCardContent
                icon="🆕"
                label="New Game"
                subtitle="Set up teams and start scoring"
                showChevron
              />
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
