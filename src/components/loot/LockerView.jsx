import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingMeteor from "../LoadingMeteor.jsx";
import LootHeader from "./LootHeader.jsx";
import PixelCanvas from "../../avatar/PixelCanvas.jsx";
import { CLOSE_UP, paintCloseUp, paintStage } from "../../avatar/stage.js";
import { gearFor, useItemArt } from "../../avatar/itemArt.js";
import { equipItem, markItemsSeen, outfitAfter, setLook, TIER_COLOR, TIER_LABEL, TIERS, unequip, useMyLoot } from "../../avatar/loot.js";
import { DEFAULT_LOOK, SKIN_TONES } from "../../avatar/engine.js";
import { useAuth } from "../../hooks/useAuth.js";

const TABS = [
  { slot: "head", label: "Head" },
  { slot: "shirt", label: "Shirt" },
  { slot: "pants", label: "Pants" },
  { slot: "shoes", label: "Shoes" },
  { slot: "transformation", label: "Monsters" },
];

// The Locker (option A, "mirror and drawers", from the design work): your
// avatar big on top, one tab per slot, and a tile for everything you own in
// that slot. Tapping a tile wears it and saves straight away.
export default function LockerView({ onBack, onOpenCauldron }) {
  const { user } = useAuth();
  const { tokens, items, outfit, loading, error, setOutfit } = useMyLoot(user?.id);
  const art = useItemArt();
  const [tab, setTab] = useState(null);
  const [saveError, setSaveError] = useState("");
  const queue = useRef(Promise.resolve());

  // Open on the tab of the newest NEW item, if there is one.
  const shownTab = tab ?? items.find((i) => i.isNew)?.slot ?? "head";

  // NEW badges stay up while you're here, and clear once you leave.
  const hasNew = items.some((i) => i.isNew);
  const hadNew = useRef(false);
  if (hasNew) hadNew.current = true;
  useEffect(
    () => () => {
      if (hadNew.current) markItemsSeen().catch((err) => console.error("Failed to clear NEW badges:", err));
    },
    [],
  );

  const gear = useMemo(() => gearFor(outfit ?? {}, art), [outfit, art]);
  const paint = useCallback((ctx, t) => paintStage(ctx, 56, 38, 34, gear, t), [gear]);

  const avatar = outfit?.avatar ?? DEFAULT_LOOK.avatar;
  const skin = outfit?.skin ?? DEFAULT_LOOK.skin;
  const look = useMemo(() => ({ avatar, skin }), [avatar, skin]);

  // The picture changes at once; saves run one after another so the last
  // tap wins.
  function save(next, request) {
    const before = outfit;
    setSaveError("");
    setOutfit(next);
    queue.current = queue.current.then(request).catch((err) => {
      console.error("Failed to change outfit:", err);
      setOutfit(before);
      setSaveError("Couldn't save that change. Try again.");
    });
  }
  // Wear something (key) or take the slot off (null).
  const wear = (slot, key) => save(outfitAfter(outfit, slot, key), () => (key ? equipItem(key) : unequip(slot)));
  const changeLook = (change) => {
    const next = { ...look, ...change };
    save({ ...outfit, ...next }, () => setLook(next.avatar, next.skin));
  };

  const monster = outfit?.transformation ? items.find((i) => i.key === outfit.transformation) : null;
  const inTab = items
    .filter((i) => i.slot === shownTab)
    .sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier));
  const isMonsters = shownTab === "transformation";

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <LootHeader backLabel="Profile" onBack={onBack} tokens={tokens} />
      <div className="flex flex-col gap-3 px-3 pb-6">
        <h1 className="m-0 text-2xl font-bold">Locker</h1>

        {loading || !art ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <LoadingMeteor />
            <p className="m-0 text-center text-muted">Opening your locker…</p>
          </div>
        ) : error ? (
          <p className="p-6 text-center text-muted">{error}</p>
        ) : (
          <>
            <PixelCanvas width={56} height={38} paint={paint} label="Your avatar" className="w-full rounded-2xl border border-white/10" />

            <LookPicker look={look} onChange={changeLook} />

            {monster && (
              <div
                className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${TIER_COLOR[monster.tier]}66`, background: `${TIER_COLOR[monster.tier]}14` }}
              >
                <span className="min-w-0">
                  Transformed: <b>{monster.name}</b>
                </span>
                <button
                  type="button"
                  onClick={() => wear("transformation", null)}
                  className="flex-none rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Back to my outfit
                </button>
              </div>
            )}

            {saveError && (
              <p role="alert" className="m-0 text-sm font-semibold text-red-400">
                {saveError}
              </p>
            )}

            <div role="tablist" aria-label="Item slots" className="grid grid-cols-5 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {TABS.map((t) => {
                const selected = t.slot === shownTab;
                const fresh = items.some((i) => i.slot === t.slot && i.isNew);
                return (
                  <button
                    key={t.slot}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTab(t.slot)}
                    className={`relative min-w-0 rounded-lg px-0.5 py-2 text-xs font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      selected ? "bg-white/10 text-foreground" : "text-muted"
                    }`}
                  >
                    {t.label}
                    {fresh && <span aria-label="new items" className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-baseline justify-between">
              <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-muted">{TABS.find((t) => t.slot === shownTab).label}</h2>
              <span className="text-xs text-muted [font-variant-numeric:tabular-nums]">{inTab.length} owned</span>
            </div>

            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
              <Tile
                slot={shownTab}
                name={isMonsters ? "No monster" : "Plain"}
                look={look}
                isOn={!outfit?.[shownTab]}
                onPick={() => wear(shownTab, null)}
              />
              {inTab.map((it) => (
                <Tile
                  key={it.key}
                  slot={shownTab}
                  item={it}
                  art={art.get(it.key)?.item}
                  name={it.name}
                  look={look}
                  isOn={outfit?.[shownTab] === it.key}
                  onPick={() => wear(shownTab, it.key)}
                />
              ))}
            </ul>

            {isMonsters && <p className="m-0 text-xs text-muted">A monster covers your whole outfit. Your clothes stay saved underneath.</p>}
            {inTab.length === 0 && (
              <p className="m-0 text-sm text-muted">
                {isMonsters ? "No monsters yet. They're rare: Epic and Legendary only." : "Nothing here yet. Brew in the Cauldron to find something."}
              </p>
            )}

            <button
              type="button"
              onClick={onOpenCauldron}
              className="mt-1 rounded-xl bg-accent px-4 py-3 font-bold text-accent-foreground transition-transform active:scale-[0.98] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Brew in the Cauldron · 1 token
            </button>
          </>
        )}
      </div>
    </main>
  );
}

// Avatar 1 or 2 and the skin color: free for everyone, from the start.
function LookPicker({ look, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
      <div role="radiogroup" aria-label="Avatar" className="flex gap-2">
        {[1, 2].map((avatar) => (
          <AvatarChoice key={avatar} avatar={avatar} skin={look.skin} selected={look.avatar === avatar} onPick={() => onChange({ avatar })} />
        ))}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span id="skin-color-label" className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">
          Skin color
        </span>
        <div role="radiogroup" aria-labelledby="skin-color-label" className="flex gap-2">
          {SKIN_TONES.map((tone, i) => {
            const selected = look.skin === i + 1;
            return (
              <button
                key={tone.s}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Skin color ${i + 1}`}
                onClick={() => onChange({ skin: i + 1 })}
                className={`h-8 w-8 rounded-full border-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "border-accent ring-2 ring-accent" : "border-white/20"}`}
                style={{ background: `linear-gradient(135deg, ${tone.s} 55%, ${tone.S} 55%)` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AvatarChoice({ avatar, skin, selected, onPick }) {
  const paint = useCallback((ctx, t) => paintCloseUp(ctx, "head", null, t, { avatar, skin }), [avatar, skin]);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={`flex w-16 flex-col items-center gap-1 rounded-lg border p-1 text-[0.65rem] font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected ? "border-accent ring-2 ring-accent" : "border-white/10"
      }`}
    >
      <PixelCanvas width={24} height={30} paint={paint} fps={15} className="w-full rounded" />
      Avatar {avatar}
    </button>
  );
}

function Tile({ slot, item, art, name, look, isOn, onPick }) {
  const size = CLOSE_UP[slot];
  const paint = useCallback((ctx, t) => paintCloseUp(ctx, slot, art, t, look), [slot, art, look]);
  const tierColor = item ? TIER_COLOR[item.tier] : null;
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-pressed={isOn}
        onClick={onPick}
        className={`relative flex h-full w-full flex-col gap-1 rounded-xl border bg-white/5 p-1.5 text-left transition-transform active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent ${
          isOn ? "border-accent ring-2 ring-accent" : "border-white/10"
        }`}
        style={!isOn && item && item.tier !== "common" ? { borderColor: `${tierColor}80` } : undefined}
      >
        <PixelCanvas width={size.w} height={size.h} paint={paint} fps={15} className="aspect-square w-full rounded-lg object-contain" style={{ aspectRatio: "1 / 1", objectFit: "contain", background: "#140a26" }} />
        {item?.isNew && (
          <span className="absolute top-1 left-1 rounded bg-[#ffc53a] px-1 text-[0.6rem] font-black text-black">NEW</span>
        )}
        {isOn && (
          <span aria-hidden="true" className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-foreground">
            ✓
          </span>
        )}
        <span className="line-clamp-2 text-xs font-bold leading-tight">{name}</span>
        <span className="mt-auto text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: tierColor ?? "var(--muted, #9ca3af)" }}>
          {item ? TIER_LABEL[item.tier] : "Starter"}
        </span>
      </button>
    </li>
  );
}
