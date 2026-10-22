// "👑 Queen of Paradise · Pool play" on a game card; tapping it opens the
// tournament. `relative z-10` keeps it tappable above an admin card's
// full-card Edit button (see HistoryView).
export default function TournamentGameTag({ tag, onOpen }) {
  if (!tag) return null;
  const text = `${tag.name} · ${tag.label}`;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(tag.tournamentId)}
      aria-label={`Open tournament: ${text}`}
      className="relative z-10 flex max-w-full items-center gap-1 self-start rounded-md text-left text-xs font-bold text-accent focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <span aria-hidden="true">👑</span>
      <span className="min-w-0 truncate underline decoration-accent/40 underline-offset-2">{text}</span>
    </button>
  );
}
