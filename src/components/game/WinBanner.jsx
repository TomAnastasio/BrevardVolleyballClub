import { Button, Card } from "@heroui/react";

// `large`: big full-width buttons for the upright scoreboard, easy to hit
// with sandy fingers. The landscape board keeps its compact row.
export default function WinBanner({ winnerName, onSaveGame, onKeepPlaying, large = false, className = "" }) {
  const size = large ? "lg" : "sm";
  const buttonLayout = large ? "h-12 w-full text-base font-extrabold" : "";
  return (
    <Card
      role="alert"
      className={`animate-banner-in flex flex-col items-center gap-2 bg-success p-4 text-center text-success-foreground shadow-lg phone-landscape:flex-row phone-landscape:flex-wrap phone-landscape:gap-2 phone-landscape:p-2 ${className}`}
    >
      <p className={`m-0 font-extrabold phone-landscape:text-sm ${large ? "text-lg" : ""}`}>{winnerName} wins!</p>
      <div className={large ? "flex w-full gap-2" : "flex flex-wrap justify-center gap-2"}>
        <Button
          variant="secondary"
          size={size}
          onPress={onSaveGame}
          className={`rounded-full bg-success-foreground text-success ${buttonLayout} ${large ? "flex-1" : ""}`}
        >
          Save Game
        </Button>
        <Button
          variant="outline"
          size={size}
          onPress={onKeepPlaying}
          className={`rounded-full border-2 border-success-foreground text-success-foreground ${buttonLayout} ${large ? "flex-1" : ""}`}
        >
          Keep Playing
        </Button>
      </div>
    </Card>
  );
}
