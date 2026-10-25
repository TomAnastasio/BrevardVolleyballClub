import { useCallback, useEffect, useRef, useState } from "react";
import LootHeader from "./LootHeader.jsx";
import PixelCanvas from "../../avatar/PixelCanvas.jsx";
import { createCauldron, H, W } from "../../avatar/cauldron.js";
import { paintCloseUp, CLOSE_UP } from "../../avatar/stage.js";
import { loadItemArt } from "../../avatar/itemArt.js";
import { reduced } from "../../avatar/art/kit.js";
import { DEFAULT_LOOK } from "../../avatar/engine.js";
import { brew, equipItem, TIER_COLOR, TIER_LABEL, useMyLoot } from "../../avatar/loot.js";
import { useAuth } from "../../hooks/useAuth.js";

const ART_WAIT_MS = 8000;

// The Cauldron: spend 1 token on one pull. The database rolls the prize
// (brew()); this screen plays the animation and shows what came out.
export default function CauldronView({ onBack, onOpenLocker }) {
  const { user } = useAuth();
  const { tokens, loading, outfit } = useMyLoot(user?.id);
  // The prize is shown on your own avatar and skin color.
  const look = { avatar: outfit?.avatar ?? DEFAULT_LOOK.avatar, skin: outfit?.skin ?? DEFAULT_LOOK.skin };
  const canvasRef = useRef(null);
  const cauldron = useRef(null);
  cauldron.current ??= createCauldron();
  // idle -> brewing -> revealed (prize shown), or back to idle on an error
  const [phase, setPhase] = useState("idle");
  const [prize, setPrize] = useState(null); // { key, slot, tier, name, item }
  const [message, setMessage] = useState("");
  const [worn, setWorn] = useState(false);
  // The balance brew() returned, until the token count catches up.
  const [balance, setBalance] = useState(null);
  const shownTokens = balance ?? tokens;

  useEffect(() => {
    loadItemArt().catch(() => {}); // start fetching the art before the first brew needs it (a brew retries if this fails)
    const ctx = canvasRef.current.getContext("2d");
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = cauldron.current;
      c.step(ctx, dt);
      if (c.revealed) setPhase((p) => (p === "brewing" ? "revealed" : p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function startBrew() {
    if (phase === "brewing") return;
    setMessage("");
    setWorn(false);
    setPrize(null);
    setPhase("brewing");
    const c = cauldron.current;
    c.start();
    // On a crawling connection the picture may never arrive; after a few
    // seconds, reveal the prize plain rather than brew forever.
    const art = Promise.race([
      loadItemArt(),
      new Promise((resolve) => setTimeout(() => resolve(null), ART_WAIT_MS)),
    ]).catch((err) => {
      console.error("Failed to load item art:", err);
      return null;
    });
    let result;
    try {
      result = await brew();
    } catch (err) {
      console.error("Brew failed:", err);
      c.reset();
      setPhase("idle");
      setMessage(err?.message || "Couldn't brew. Try again.");
      return;
    }
    // The token is spent and the item is yours from here on, so always show
    // it, even if its picture couldn't load (it's drawn plain, with its name
    // and tier on the card).
    setBalance(result.balance);
    const item = (await art)?.get(result.key)?.item ?? null;
    setPrize({ ...result, item, look, noArt: !item });
    c.setPrize(result.tier, result.slot === "transformation" ? { transformation: item, look } : { [result.slot]: item, look }, reduced);
  }

  async function wearIt() {
    try {
      await equipItem(prize.key);
      setWorn(true);
    } catch (err) {
      console.error("Failed to wear new item:", err);
      setMessage("Couldn't put it on. Try again from the Locker.");
    }
  }

  const noTokens = !loading && shownTokens === 0;

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <LootHeader backLabel="Locker" onBack={onBack} tokens={shownTokens} />
      <div className="flex flex-col gap-3 px-3 pb-6">
        <h1 className="m-0 text-2xl font-bold">The Cauldron</h1>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label={phase === "revealed" && prize ? `The cauldron brewed ${prize.name}` : "A bubbling cauldron"}
          className="block w-full rounded-2xl border border-white/10"
          style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
        />

        <div aria-live="polite" className="flex flex-col gap-3">
          {phase === "revealed" && prize && <PrizeCard prize={prize} />}
          {message && (
            <p role="alert" className="m-0 text-sm font-semibold text-red-400">
              {message}
            </p>
          )}
        </div>

        {phase === "revealed" && prize && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={wearIt}
              disabled={worn}
              className="rounded-xl border border-white/20 px-3 py-3 font-bold disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {worn ? "✓ Wearing it" : "Wear it"}
            </button>
            <button
              type="button"
              onClick={onOpenLocker}
              className="rounded-xl border border-white/20 px-3 py-3 font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Locker
            </button>
          </div>
        )}

        {phase !== "brewing" && (
          <button
            type="button"
            onClick={startBrew}
            disabled={noTokens || loading}
            className="rounded-xl bg-accent px-4 py-3 font-bold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {phase === "revealed" ? "Brew again · 1 token" : "Brew · 1 token"}
          </button>
        )}
        {noTokens && (
          <p className="m-0 text-sm text-muted">
            You're out of tokens. Ranked games earn them: 1 per game, 2 for a win, up to 10 a day.
          </p>
        )}
        <p className="m-0 text-xs text-muted">
          Every brew is something you don't own yet. Odds: Common 76%, Rare 20%, Epic 3.8%, Legendary 0.2%.
        </p>
      </div>
    </main>
  );
}

// What came out: a close-up of the item, its tier and its name.
function PrizeCard({ prize }) {
  const size = CLOSE_UP[prize.slot];
  const paint = useCallback((ctx, t) => paintCloseUp(ctx, prize.slot, prize.item, t, prize.look), [prize]);
  const color = TIER_COLOR[prize.tier];
  return (
    <div className="animate-pop-in flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${color}99`, background: `${color}14` }}>
      <PixelCanvas width={size.w} height={size.h} paint={paint} className="w-20 flex-none rounded-lg" style={{ aspectRatio: "1 / 1", objectFit: "contain", background: "#140a26" }} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-black uppercase tracking-wide" style={{ color }}>
          {TIER_LABEL[prize.tier]}
        </span>
        <span className="font-bold">{prize.name}</span>
        <span className="text-xs text-muted">
          {prize.noArt ? "New in your Locker (its picture didn't load; reload the app to see it)" : "New in your Locker"}
        </span>
      </div>
    </div>
  );
}
