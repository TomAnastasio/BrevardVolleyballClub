import { PARTNER_MIN_GAMES } from "../hooks/usePlayerGames.js";
import { stagger } from "../lib/motion.js";

function StatRow({ label, stat, versus, index, onOpenPlayer }) {
  const { player, games, wins, losses } = stat;
  const photo = player.avatarUrl ? (
    <img src={player.avatarUrl} alt="" aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 object-cover" />
  ) : (
    <span aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 bg-white/5" />
  );
  const record = `${games} ${games === 1 ? "game" : "games"} · ${wins}W – ${losses}L${versus ? " vs them" : " together"}`;
  return (
    <li className="animate-rise-in" style={stagger(index, 60)}>
      <button
        type="button"
        onClick={() => onOpenPlayer?.(player.id)}
        aria-label={`${label}: ${player.name}, ${record}. View profile`}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 text-left transition-transform duration-150 active:scale-[0.98] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        {photo}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{label}</span>
          <span className="truncate font-bold">{player.name}</span>
        </span>
        <span className="flex-none text-right text-xs text-muted [font-variant-numeric:tabular-nums]">
          <span className="block">{wins}W – {losses}L</span>
          <span className="block">
            {games} {games === 1 ? "game" : "games"}
          </span>
        </span>
      </button>
    </li>
  );
}

// Most frequent partner, best partner and toughest opponent (see
// partnerStats). Each opens that player's profile. Hidden entirely until
// there's at least a most frequent partner.
export default function PartnersAndRivals({ stats, onOpenPlayer }) {
  const { mostFrequentPartner, bestPartner, toughestOpponent } = stats;
  if (!mostFrequentPartner && !toughestOpponent) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Partners & rivals</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {mostFrequentPartner && <StatRow label="Most frequent partner" stat={mostFrequentPartner} index={0} onOpenPlayer={onOpenPlayer} />}
        {bestPartner && <StatRow label="Best partner" stat={bestPartner} index={1} onOpenPlayer={onOpenPlayer} />}
        {toughestOpponent && <StatRow label="Toughest opponent" stat={toughestOpponent} versus index={2} onOpenPlayer={onOpenPlayer} />}
      </ul>
      {!bestPartner && (
        <p className="m-0 text-xs text-muted">Best partner shows up after {PARTNER_MIN_GAMES} games with the same partner.</p>
      )}
      {!toughestOpponent && (
        <p className="m-0 text-xs text-muted">
          Toughest opponent shows up after {PARTNER_MIN_GAMES} games against someone, with at least one loss.
        </p>
      )}
    </section>
  );
}
