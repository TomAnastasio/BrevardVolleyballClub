// The Cauldron that opens every pull (page 01, box C, on the design branch):
// a token drops into a bubbling pot, the brew climbs through the tier
// colors while it rumbles, then a geyser carries the prize up.
//
// createCauldron() keeps the animation's state; call step(ctx, dt) every
// frame on a W x H canvas.
import { drawAvatar } from "./engine.js";
import { R, TAU, glow, sparkle, spr } from "./art/kit.js";
import { TIER_COLOR, TIERS } from "./loot.js";

export const W = 160;
export const H = 120;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = (t) => 1 - (1 - t) ** 3;

const DARK = { common: "#7d7591", rare: "#1d5fa8", epic: "#6b2aa3", legendary: "#b36a00" };
const RAR = TIERS.map((k) => ({ c: TIER_COLOR[k], d: DARK[k] }));

const COIN = [".yyyy.", "yYYyyy", "yYyyyy", "yyyyyy", "yyyyyd", ".dddd."];
const COIN_PAL = { y: "#ffc53a", Y: "#fff1b0", d: "#b36a00" };

function sprC(c, rows, pal, cx, cy) {
  const w = Math.max(...rows.map((r) => r.length));
  spr(c, rows, pal, Math.round(cx - w / 2), Math.round(cy - rows.length / 2));
}
function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function rays(c, cx, cy, col, t, n, len, a) {
  c.save();
  c.globalAlpha = a;
  c.fillStyle = col;
  for (let k = 0; k < n; k++) {
    const ang = t * 0.6 + (k * TAU) / n;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(ang - 0.12) * len, cy + Math.sin(ang - 0.12) * len);
    c.lineTo(cx + Math.cos(ang + 0.12) * len, cy + Math.sin(ang + 0.12) * len);
    c.fill();
  }
  c.restore();
}

// When the geyser bursts, by tier (rarer brews rumble longer).
const burstAt = (r) => 0.75 + 1.2 + 0.35 * r;
export const revealAt = (r) => burstAt(r) + 0.5;
// Story time holds here until the database has answered with the prize.
const WAIT_AT = 0.9;

function liquidColor(t, r) {
  if (t < 1.0) return "#5ee84a";
  const step = (burstAt(r) - 1.15) / (r + 1);
  return RAR[Math.min(r, Math.floor((t - 1.0) / step))].c;
}

function drawPot(c, cx, jx, liq, t, bubbleBoost) {
  for (let k = 0; k < 9; k++) {
    const fl = Math.sin(t * 17 + k * 2.1) * 2;
    R(c, cx - 18 + k * 4, 104 - fl - (k % 3) * 2, 3, 8 + fl, k % 2 ? "#ff7a1a" : "#ffd84a");
  }
  R(c, cx - 22 + jx, 102, 4, 8, "#1b1625");
  R(c, cx + 18 + jx, 102, 4, 8, "#1b1625");
  c.save();
  c.beginPath();
  c.rect(0, 77, W, 40);
  c.clip();
  disc(c, cx + jx, 86, 24, "#241d33");
  disc(c, cx + jx - 6, 82, 14, "#2f2742");
  c.restore();
  R(c, cx - 22 + jx, 76, 44, 4, liq);
  R(c, cx - 26 + jx, 73, 52, 4, "#3a3150");
  R(c, cx - 24 + jx, 73, 20, 1, "#5a5078");
  const nb = 5 + bubbleBoost;
  for (let k = 0; k < nb; k++) {
    const ph = (t * (1.1 + bubbleBoost * 0.15) + k * 0.37) % 1;
    const x = cx - 18 + ((k * 23) % 36) + jx;
    const y = 74 - ph * (5 + bubbleBoost * 2);
    if (ph < 0.85) R(c, x, y, 2, 2, liq);
    else R(c, x - 1, y, 4, 1, liq);
  }
}

// The prize: the 16-Bit Pro wearing it (or the monster itself), in a glow
// that gets grander with the tier.
function drawPrize(c, r, prize, cx, cy, t) {
  const col = RAR[r].c;
  glow(c, cx, cy, 34 + r * 6, col, 0.25 + r * 0.08);
  if (r >= 2) rays(c, cx, cy, col, t, r === 3 ? 12 : 8, r === 3 ? 90 : 60, r === 3 ? 0.2 : 0.14);
  if (r === 2)
    for (let k = 0; k < 6; k++) {
      const ph = (t * 0.7 + k / 6) % 1;
      c.save();
      c.globalAlpha = 1 - ph;
      R(c, cx - 14 + k * 6 + Math.sin(t * 3 + k) * 2, cy + 10 - ph * 34, 1, 1, k % 2 ? "#ff7a1a" : "#c46bff");
      c.restore();
    }
  const bob = Math.round(Math.sin(t * 3) * 1.5);
  drawAvatar(c, prize, cx, cy + 14 + bob, t);
  if (r === 3)
    for (let k = 0; k < 7; k++) {
      const a = t * 1.6 + (k * TAU) / 7;
      const tw = Math.sin(t * 6 + k * 2) > 0.2;
      sparkle(c, Math.round(cx + Math.cos(a) * 26), Math.round(cy + bob + Math.sin(a) * 12), tw ? "#fff6d0" : "#ffc53a", tw);
    }
}

export function createCauldron() {
  const S = {
    running: false, // a brew is under way (or showing its prize)
    t: 0, // story time of this brew
    clock: 0, // always ticks: bubbles and flames
    r: 0, // the prize's tier index, once known
    prize: null, // gear for drawAvatar, once known
    parts: [],
    flags: new Set(),
    flash: 0,
    quake: 0,
  };
  const once = (key, fn) => {
    if (!S.flags.has(key)) {
      S.flags.add(key);
      fn();
    }
  };
  function emit(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const ang = o.ang !== undefined ? o.ang + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * TAU;
      const sp = (o.sp ?? 40) * (0.4 + Math.random() * 0.9);
      S.parts.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        g: o.g ?? 90, life: (o.life ?? 1) * (0.6 + Math.random() * 0.7), age: 0,
        col: o.cols[(Math.random() * o.cols.length) | 0], s: o.s ?? 1,
      });
    }
  }

  function draw(c) {
    const cx = 80;
    const { t, clock, r } = S;
    R(c, 0, 0, W, H, "#0e0a1a");
    R(c, 0, 0, W, 6, "#1a1228");
    for (let k = 0; k < 7; k++) R(c, 8 + k * 22, 6, 1, 6 + (k % 3) * 4, "#2a2040");
    R(c, 0, 110, W, 10, "#160f22");
    if (!S.running) {
      drawPot(c, cx, 0, "#5ee84a", clock, 0);
      glow(c, cx, 76, 30, "#5ee84a", 0.12);
      return;
    }
    const tb = burstAt(r);
    if (t < tb) {
      const liq = liquidColor(t, r);
      const rumble = seg(t, 0.8, tb);
      const jx = Math.round((Math.random() - 0.5) * rumble * (1 + r) * 1.4);
      glow(c, cx, 76, 34 + rumble * 10, liq, 0.12 + rumble * 0.25);
      drawPot(c, cx, jx, liq, clock, Math.round(rumble * (4 + r * 2)));
      if (t < 0.75) sprC(c, COIN, COIN_PAL, cx, lerp(-6, 74, (t / 0.75) ** 2));
      if (t > 0.75) once("splash", () => emit(cx, 74, 12, { cols: ["#5ee84a", "#b7ff9e"], ang: -Math.PI / 2, spread: 1.4, sp: 60, g: 160, life: 0.7 }));
      if (rumble > 0.3 && Math.random() < 0.25) emit(cx + (Math.random() - 0.5) * 30, 74, 1, { cols: [liq], ang: -Math.PI / 2, spread: 0.5, sp: 40, g: 120, life: 0.6 });
      return;
    }
    once("burst", () => {
      S.flash = [0.25, 0.45, 0.75, 0.95][r];
      S.quake = [0, 1, 2.5, 4.5][r];
      emit(cx, 60, 18 + r * 14, { cols: [RAR[r].c, "#ffffff", RAR[r].d], sp: 70 + r * 20, g: 60, life: 1.1 + r * 0.2 });
      emit(cx, 70, 30, { cols: [RAR[r].c, RAR[r].d, "#ffffff"], ang: -Math.PI / 2, spread: 1.6, sp: 110, g: 170, life: 1.3, s: 2 });
    });
    const bt = t - tb;
    const hgt = eo(seg(bt, 0, 0.3)) * 74 * (1 - eo(seg(bt, 0.9, 1.5)));
    const liq = RAR[r].c;
    for (let y = 0; y < hgt; y++) {
      const yy = 76 - y;
      const wob = Math.round(Math.sin(yy * 0.35 + bt * 18) * 1.5);
      const wdt = 12 + Math.round(Math.sin(yy * 0.2 + bt * 9) * 2);
      R(c, cx - wdt / 2 + wob, yy, wdt, 1, liq);
      R(c, cx - 2 + wob, yy, 4, 1, "#ffffff");
    }
    drawPot(c, cx, 0, liq, clock, 2);
    const iy = Math.min(lerp(76, 40, eo(seg(bt, 0, 0.45))), 76 - hgt - 6 + 14 * seg(bt, 0.9, 1.5));
    drawPrize(c, r, S.prize, cx, Math.max(40, Math.min(iy, 60)), bt);
  }

  return {
    get running() {
      return S.running;
    },
    // Starts a brew: the token drops in straight away, before the prize is known.
    start() {
      Object.assign(S, { running: true, t: 0, r: 0, prize: null, parts: [], flash: 0, quake: 0 });
      S.flags.clear();
    },
    // The database's answer: tier ("rare") and drawAvatar gear for the prize.
    // skipTo jumps straight to the reveal (reduced motion).
    setPrize(tier, gear, skipTo = false) {
      S.r = Math.max(0, TIERS.indexOf(tier));
      S.prize = gear;
      if (skipTo) {
        S.t = burstAt(S.r) + 1.5;
        S.flags.add("splash").add("burst");
      }
    },
    // Back to the idle, bubbling pot (e.g. the brew failed).
    reset() {
      S.running = false;
      S.parts = [];
    },
    // Seconds into the current brew, and whether the prize is up.
    get revealed() {
      return S.running && S.prize !== null && S.t >= revealAt(S.r);
    },
    step(c, dt) {
      S.clock += dt;
      if (S.running && (S.prize || S.t + dt < WAIT_AT)) S.t += dt;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
      if (S.quake > 0.05) {
        c.translate(Math.round((Math.random() - 0.5) * S.quake * 2), Math.round((Math.random() - 0.5) * S.quake * 2));
        S.quake *= Math.pow(0.02, dt);
      }
      draw(c);
      for (const p of S.parts) {
        p.age += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age > p.life) continue;
        c.save();
        c.globalAlpha = Math.min(1, (1 - p.age / p.life) * 1.5);
        R(c, p.x, p.y, p.s, p.s, p.col);
        c.restore();
      }
      S.parts = S.parts.filter((p) => p.age <= p.life);
      if (S.flash > 0.01) {
        c.save();
        c.globalAlpha = S.flash;
        c.fillStyle = "#fff";
        c.fillRect(-8, -8, W + 16, H + 16);
        c.restore();
        S.flash *= Math.pow(0.004, dt);
      }
    },
  };
}
