import { Button, Card } from "@heroui/react";

export default function WinBanner({ winnerName, onSaveGame, onKeepPlaying, className = "" }) {
  return (
    <Card
      role="alert"
      className={`flex flex-col items-center gap-2 bg-success p-4 text-center text-success-foreground shadow-lg phone-landscape:flex-row phone-landscape:flex-wrap phone-landscape:gap-2 phone-landscape:p-2 ${className}`}
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
          onPress={onKeepPlaying}
          className="rounded-full border-2 border-success-foreground text-success-foreground"
        >
          Keep Playing
        </Button>
      </div>
    </Card>
  );
}
