// MOCKUP ONLY (not for commit): three ways to show the pixel avatar on a profile.
import { useEffect, useRef } from "react";
import { drawAvatar, glow, R, RIVAL_GEAR, SAMPLE_GEAR } from "./_avatarMockEngine.js";

export const avatarMockVariant = new URLSearchParams(window.location.search).get("avatarMock");

function useCanvasLoop(draw) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current.getContext("2d");
    let raf;
    const start = performance.now();
    const loop = (now) => { draw(c, Math.max(0, (now - start) / 1000)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);
  return ref;
}

const EQUIPPED = [
  { slot: "Hat", name: "Witch's Hat", tier: "Common", color: "#c9c2d9" },
  { slot: "Shirt", name: "Skeleton Tee", tier: "Common", color: "#c9c2d9" },
  { slot: "Pants", name: "Witch Stockings", tier: "Common", color: "#c9c2d9" },
  { slot: "Shoes", name: "Slime Kicks", tier: "Common", color: "#c9c2d9" },
];

const drawStage = (c, t) => {
  R(c, 0, 0, 48, 40, "#140a26");
  glow(c, 24, 14, 22, "#7a4ad9", 0.28);
  // spotlight floor
  R(c, 0, 36, 48, 4, "#1c1030");
  c.save(); c.globalAlpha = 0.5; c.fillStyle = "#4b3f70"; c.beginPath(); c.ellipse(24, 36.5, 10, 1.6, 0, 0, Math.PI * 2); c.fill(); c.restore();
  drawAvatar(c, SAMPLE_GEAR, 24, 36, t);
};

// A: a compact stage card right under the name and stats: avatar left, what they're wearing right
const drawStageNarrow = (c, t) => {
  R(c, 0, 0, 30, 38, "#140a26");
  glow(c, 15, 14, 16, "#7a4ad9", 0.3);
  R(c, 0, 34, 30, 4, "#1c1030");
  c.save(); c.globalAlpha = 0.5; c.fillStyle = "#4b3f70"; c.beginPath(); c.ellipse(15, 34.5, 9, 1.5, 0, 0, Math.PI * 2); c.fill(); c.restore();
  drawAvatar(c, SAMPLE_GEAR, 15, 34, t);
};
export function AvatarStageCard({ isOwnProfile, name }) {
  const ref = useCanvasLoop(drawStageNarrow);
  return (
    <section aria-label={`${name}'s avatar`} className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <canvas ref={ref} width={30} height={38} className="w-full rounded-xl" style={{ imageRendering: "pixelated", aspectRatio: "30 / 38" }} />
      <div className="flex min-w-0 flex-col justify-between gap-2">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {EQUIPPED.map((it) => (
            <li key={it.slot} className="flex min-w-0 items-center gap-2 text-sm">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: it.color }} aria-hidden="true" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">{it.slot}</span>
                <span className="truncate font-bold">{it.name}</span>
              </span>
            </li>
          ))}
        </ul>
        {isOwnProfile && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted [font-variant-numeric:tabular-nums]">7 tokens to brew</span>
            <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground">Change outfit</button>
          </div>
        )}
      </div>
    </section>
  );
}

// B: a little court strip, you vs your rival
export function AvatarRallyStrip({ name, rivalName, isOwnProfile }) {
  const ref = useCanvasLoop((c, t) => {
    R(c, 0, 0, 120, 40, "#140a26");
    glow(c, 60, 20, 40, "#4b3f70", 0.35);
    R(c, 0, 36, 120, 4, "#1c1030"); R(c, 0, 36, 120, 1, "#3a2a5c");
    R(c, 59, 20, 1, 16, "#6b5f8d"); R(c, 55, 20, 9, 1, "#a99bc9");
    drawAvatar(c, SAMPLE_GEAR, 30, 36, t);
    c.save(); c.translate(120, 0); c.scale(-1, 1); drawAvatar(c, RIVAL_GEAR, 30, 36, t + 1.3); c.restore();
    const p = (t * 0.7) % 2, f = p < 1 ? p : 2 - p;
    R(c, 38 + 43 * f, 4 + (1 - Math.sin(f * Math.PI)) * 12, 2, 2, "#ffcf3a");
  });
  return (
    <section aria-label={`${name} versus their rival ${rivalName}`} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Rivalry</h3>
        {isOwnProfile && <button type="button" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">Change outfit</button>}
      </div>
      <canvas ref={ref} width={120} height={40} className="w-full rounded-xl" style={{ imageRendering: "pixelated" }} />
      <div className="flex justify-between text-xs font-bold">
        <span>{name}</span>
        <span className="text-muted">vs</span>
        <span className="underline decoration-dotted">{rivalName}</span>
      </div>
    </section>
  );
}

// C: the avatar becomes the profile picture; the real photo is a small inset
export function AvatarPortrait({ photoSrc, isOwnProfile }) {
  const ref = useCanvasLoop((c, t) => {
    R(c, 0, 0, 22, 34, "#140a26");
    glow(c, 11, 14, 14, "#7a4ad9", 0.3);
    R(c, 0, 32, 22, 2, "#1c1030");
    drawAvatar(c, SAMPLE_GEAR, 11, 32, t);
  });
  return (
    <span className="relative flex-none">
      <canvas ref={ref} width={22} height={34} className="block rounded-xl border border-white/10" style={{ imageRendering: "pixelated", width: 76, height: 117 }} />
      {photoSrc && <img src={photoSrc} alt="" className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full border-2 border-[#140a26] object-cover" />}
      {isOwnProfile && <span className="absolute -top-1.5 -left-1.5 rounded-full bg-accent px-1.5 text-[0.65rem] font-bold text-accent-foreground">Edit</span>}
    </span>
  );
}
