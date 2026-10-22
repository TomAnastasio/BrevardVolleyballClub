import EditGameScreen from "./EditGameScreen.jsx";

// Admin Edit Game as its own page, opened from a game's details screen
// (Past Games or a profile), with the same header as the rest of the app.
export default function EditGamePage({ gameId, onBack, onSaved, onDeleted }) {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to game"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Back
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">Edit Game</h2>
      </header>
      <EditGameScreen gameId={gameId} onSaved={onSaved} onDeleted={onDeleted} />
    </main>
  );
}
