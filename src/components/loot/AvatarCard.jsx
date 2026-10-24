import { useCallback, useMemo } from "react";
import PixelCanvas from "../../avatar/PixelCanvas.jsx";
import { paintStage } from "../../avatar/stage.js";
import { gearFor, useItemArt } from "../../avatar/itemArt.js";
import { TIER_COLOR, useMyLoot, usePlayerOutfit } from "../../avatar/loot.js";

const ROWS = [
  { slot: "head", label: "Head" },
  { slot: "shirt", label: "Shirt" },
  { slot: "pants", label: "Pants" },
  { slot: "shoes", label: "Shoes" },
];

// A player's pixel avatar on their profile (option A from the design work):
// the avatar on a little stage on the left, what they're wearing on the
// right. Your own profile adds your tokens and a way into the Locker.
export default function AvatarCard({ playerId, name, isOwnProfile, onOpenLocker }) {
  return isOwnProfile ? <OwnCard playerId={playerId} name={name} onOpenLocker={onOpenLocker} /> : <OtherCard playerId={playerId} name={name} />;
}

function OtherCard({ playerId, name }) {
  const { outfit, names, loading } = usePlayerOutfit(playerId);
  if (loading) return <CardShell name={name} />;
  return <CardShell name={name} outfit={outfit} itemInfo={(key) => names.get(key)} />;
}

function OwnCard({ playerId, name, onOpenLocker }) {
  const { tokens, items, outfit, loading } = useMyLoot(playerId);
  const byKey = new Map(items.map((i) => [i.key, i]));
  return (
    <CardShell name={name} outfit={loading ? null : outfit} itemInfo={(key) => byKey.get(key)}>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-muted [font-variant-numeric:tabular-nums]">
          {tokens == null ? " " : tokens === 0 ? "No tokens yet" : `${tokens} ${tokens === 1 ? "token" : "tokens"} to brew`}
        </span>
        <button
          type="button"
          onClick={onOpenLocker}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground transition-transform active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Change outfit
        </button>
      </div>
    </CardShell>
  );
}

function CardShell({ name, outfit, itemInfo = () => null, children }) {
  const art = useItemArt();
  const gear = useMemo(() => gearFor(outfit, art), [outfit, art]);
  const paint = useCallback((ctx, t) => paintStage(ctx, 30, 38, 34, gear, t), [gear]);
  const monster = outfit?.transformation ? itemInfo(outfit.transformation) : null;
  const rows = monster ? [{ slot: "transformation", label: "Monster" }, ...ROWS] : ROWS;

  return (
    <section
      aria-label={`${name}'s avatar`}
      className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
    >
      <PixelCanvas width={30} height={38} paint={paint} className="w-full rounded-xl" />
      <div className="flex min-w-0 flex-col justify-between gap-2">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map(({ slot, label }) => {
            const info = outfit?.[slot] ? itemInfo(outfit[slot]) : null;
            const covered = monster && slot !== "transformation";
            return (
              <li key={slot} className={`flex min-w-0 items-center gap-2 text-sm ${covered ? "opacity-50" : ""}`}>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 flex-none rounded-full border border-white/30"
                  style={info ? { background: TIER_COLOR[info.tier], borderColor: TIER_COLOR[info.tier] } : undefined}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{label}</span>
                  <span className={`truncate font-bold ${info ? "" : "text-muted"}`}>{info ? info.name : "Plain"}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {children}
      </div>
    </section>
  );
}
