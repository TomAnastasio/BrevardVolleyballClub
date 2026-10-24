// Backdrops the avatar is shown on (the profile card, the Locker and its
// item tiles), as drawn on the design branch's locker page (page 15).
import { drawAvatar } from "./engine.js";
import { R, TAU, fade, glow, reduced } from "./art/kit.js";

// The gentle 1px idle bob of a standing avatar.
const bob = (t) => (reduced ? 0 : Math.round((Math.sin(t * 3) + 1) / 2));

// The avatar standing on a little lit stage. `gear` as drawAvatar takes it.
export function paintStage(ctx, w, h, ground, gear, t) {
  R(ctx, 0, 0, w, h, "#140a26");
  glow(ctx, w / 2, ground - 16, Math.max(w, h) * 0.5, gear?.transformation ? "#6b3fa8" : "#7a4ad9", 0.32);
  R(ctx, 0, ground, w, h - ground, "#1c1030");
  R(ctx, 0, ground, w, 1, "#3a2a5c");
  fade(ctx, 0.5, () => {
    ctx.fillStyle = "#4b3f70";
    ctx.beginPath();
    ctx.ellipse(w / 2, ground + 0.5, 10, 1.6, 0, 0, TAU);
    ctx.fill();
  });
  drawAvatar(ctx, gear, w / 2, ground - bob(t), t);
}

// Item tiles: a close-up framed on the part of the body each slot dresses.
export const CLOSE_UP = {
  head: { w: 24, h: 30, bottom: 43, x: 12 },
  shirt: { w: 20, h: 18, bottom: 22, x: 10 },
  pants: { w: 20, h: 16, bottom: 15, x: 10 },
  shoes: { w: 16, h: 10, bottom: 9, x: 8, light: true },
  transformation: { w: 30, h: 38 },
};

// `look` is the player's { avatar, skin } (see drawAvatar).
export function paintCloseUp(ctx, slot, item, t, look) {
  if (slot === "transformation") {
    R(ctx, 0, 0, 30, 38, "#140a26");
    glow(ctx, 15, 20, 19, "#4b3f70", 0.4);
    R(ctx, 0, 35, 30, 3, "#1c1030");
    R(ctx, 0, 35, 30, 1, "#3a2a5c");
    drawAvatar(ctx, item ? { transformation: item } : null, 15, 35 - bob(t), t);
    return;
  }
  const cl = CLOSE_UP[slot];
  R(ctx, 0, 0, cl.w, cl.h, cl.light ? "#3a2d5c" : "#140a26");
  glow(ctx, cl.w / 2, cl.h / 2, cl.w * 0.6, cl.light ? "#6b5f8d" : "#4b3f70", 0.45);
  if (cl.light) R(ctx, 0, cl.h - 1, cl.w, 1, "#6b5f8d");
  drawAvatar(ctx, { [slot]: item, look }, cl.x, cl.bottom - bob(t), t);
}
