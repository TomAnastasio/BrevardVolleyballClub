import MenuCard from "./MenuCard.jsx";

export default function GameModeMenu({ onSelectMode, isSupabaseConfigured }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        <MenuCard
          icon="🏆"
          label="Ranked"
          subtitle={
            isSupabaseConfigured
              ? "Counts toward your rating (coming soon)"
              : "Coming soon — sign-in isn't set up yet"
          }
          onClick={() => onSelectMode("ranked")}
          disabled={!isSupabaseConfigured}
        />
        <MenuCard icon="🎲" label="Casual" subtitle="Just for fun, doesn't affect your rating" onClick={() => onSelectMode("casual")} />
      </div>
    </div>
  );
}
