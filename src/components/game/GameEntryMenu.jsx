import MenuCard from "./MenuCard.jsx";

export default function GameEntryMenu({ onSelectEntry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        <MenuCard
          icon="📺"
          label="Live Scoreboard"
          subtitle="Keep score point by point as you play"
          onClick={() => onSelectEntry("live")}
        />
        <MenuCard
          icon="✍️"
          label="Enter Final Score"
          subtitle="The game just finished — add the result"
          onClick={() => onSelectEntry("final")}
        />
      </div>
    </div>
  );
}
