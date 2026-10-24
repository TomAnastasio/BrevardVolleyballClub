// Ported from design/gacha/pages/05-pumpkin-helmet-tiers.html (branch claude/gacha-avatars-design).
import { R, spr, glow, reduced, TAU, CX, OUT, makeGrid, outline } from "../kit.js";

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- Pumpkin Helmet, parameterised ----------
// Same round pumpkin every time; options change colors, the carved face and effects.
const mirror = (pts) => pts.flatMap(([x, y]) => [[CX - x, y], [CX + x, y]]);
const FACES = {
  toothy: { eyes: mirror([[3, 1], [2, 1], [2, 2]]).concat([[CX, 3]]), mouth: [[-3, 5], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5], [3, 5], [-2, 4], [0, 4], [2, 4], [-3, 6], [-1, 6], [1, 6], [3, 6]].map(([x, y]) => [CX + x, y]) },
  grumpy: { eyes: mirror([[3, 1], [3, 2], [2, 2]]), mouth: [[-2, 5], [-1, 4], [0, 4], [1, 4], [2, 5], [-3, 6], [3, 6]].map(([x, y]) => [CX + x, y]) },
};
// o.float lifts only the pumpkin (not its under/over effects), so it stays inside build
// rather than becoming the engine's head.float, which would move the effects too.
function classic(o, t) {
  const g = makeGrid();
  const P = o.pal;
  const lift = o.float ? o.float(t) : 0;
  const cy = 2.5, rx = 5.6, ry = 5.4;
  for (let y = -3; y <= 8; y++) {
    const d = 1 - ((y - cy) / ry) ** 2;
    if (d <= 0) continue;
    const half = Math.sqrt(d) * rx;
    const x0 = Math.round(CX - half), x1 = Math.round(CX + half);
    for (let x = x0; x <= x1; x++) {
      let col = x === x0 ? P.hi : x >= x1 - 1 ? P.sh : x === CX - 2 || x === CX + 2 ? P.rib : P.base;
      if (o.px) col = o.px(x, y, col, t) || col;
      g.set(x, y + lift, col);
    }
  }
  if (!o.noStem) { g.set(CX, -4 + lift, o.stem || "#4a7a28"); g.set(CX + 1, -5 + lift, o.stem || "#4a7a28"); g.set(CX - 1, -3 + lift, o.stemSh || "#3a6020"); }
  outline(g, o.outline ? o.outline(t) : OUT);
  if (o.face) {
    const f = FACES[o.face];
    const glowCol = o.glow ? o.glow(t) : "#ffd84a";
    f.eyes.forEach(([x, y]) => g.set(x, y + lift, o.eyeCol ? o.eyeCol(t) : glowCol));
    (o.mouth ? o.mouth(t) : f.mouth).forEach(([x, y]) => g.set(x, y + lift, glowCol));
  }
  if (o.after) o.after(g, t, lift);
  return g;
}
function helmet(o) {
  const item = { build: (t) => classic(o, t) };
  if (o.under) item.under = o.under;
  if (o.over) item.over = o.over;
  return item;
}

const COLORS = [
  { name: "Orange", base: "#ff7a1a", hi: "#ffa45a", sh: "#c4550a", rib: "#e0661a" },
  { name: "Ghost white", base: "#e8e0d0", hi: "#fff8ec", sh: "#b8ac98", rib: "#d0c6b2" },
  { name: "Gourd green", base: "#5a8a3a", hi: "#7aac52", sh: "#3d6526", rib: "#4d7a30" },
  { name: "Blue heirloom", base: "#7a98aa", hi: "#9cb8c8", sh: "#56717f", rib: "#6a8696" },
  { name: "Cinderella red", base: "#c4402a", hi: "#e0644a", sh: "#8f2a1a", rib: "#ab3622" },
  { name: "Rotten", base: "#8a845a", hi: "#a8a272", sh: "#65603e", rib: "#7a744c" },
];
const ORANGE = COLORS[0];

// C1 Classic Carve and C3 Grumpy Carve
const classicCarve = (col) => ({ pal: col, face: "toothy", glow: () => "#ffd84a" });
const grumpyCarve = (col) => ({ pal: col, face: "grumpy", glow: () => "#ffd84a" });

// R2 Pumpkin King
const pumpkinKing = {
  pal: ORANGE, face: "toothy", glow: () => "#ffd84a", noStem: true,
  after: (g) => {
    g.row(CX - 3, CX + 3, -4, "#ffc53a"); g.row(CX - 3, CX + 3, -5, "#e8a820");
    [CX - 3, CX, CX + 3].forEach((x) => g.set(x, -6, "#ffc53a"));
    g.set(CX, -7, "#fff1b0");
    g.set(CX, -5, "#ff3b4d"); g.set(CX - 2, -5, "#4fb2ff"); g.set(CX + 2, -5, "#4fb2ff");
  },
};

// E2 Chomper
const chomping = (t) => { const ph = t % 3; return ph < 0.9 && Math.floor(ph * 6.6) % 2 === 0; };
const chomper = {
  pal: ORANGE, face: "toothy", glow: () => "#ffd84a",
  mouth: (t) => {
    if (!chomping(t)) return FACES.toothy.mouth;
    const m = [];
    for (let x = CX - 3; x <= CX + 3; x++) for (let y = 4; y <= 6; y++) m.push([x, y]);
    return m;
  },
  after: (g, t) => {
    if (chomping(t)) {
      [CX - 2, CX, CX + 2].forEach((x) => g.set(x, 4, "#f3efe6"));
      [CX - 1, CX + 1].forEach((x) => g.set(x, 6, "#f3efe6"));
      g.set(CX - 3, 2, "#ff7a1a"); g.set(CX + 3, 2, "#ff7a1a");
    }
  },
};

// L1 Headless Horseman
const horseman = {
  pal: { base: "#d9541a", hi: "#ff7a1a", sh: "#8f2a0a", rib: "#b8420e" }, face: "toothy", noStem: true,
  glow: (t) => (Math.floor(t * 12) % 3 ? "#ffffff" : "#fff3a0"),
  outline: (t) => (Math.floor(t * 8) % 3 === 0 ? "#8f2a0a" : "#0b0614"),
  under: (c, left, top, t) => glow(c, left + CX, top, 20, "#ff7a1a", 0.35 + 0.12 * Math.sin(t * 11)),
  over: (c, left, top, t) => {
    const COLS = ["#ffffff", "#fff3a0", "#ffd84a", "#ff7a1a", "#c4300a"];
    for (let s = -3; s <= 3; s++) {
      const h = 8 - Math.abs(s) * 1.6;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 2.2 + k / 3 + (s + 3) * 0.21) % 1;
        c.save(); c.globalAlpha = 1 - ph * 0.6;
        R(c, left + CX + s + Math.round(Math.sin(t * 9 + s + k) * ph), top - 3 - ph * h, 1, 1, COLS[Math.min(4, Math.floor(ph * 5))]);
        c.restore();
      }
    }
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.4 + k / 3) % 1;
      c.save(); c.globalAlpha = 1 - ph;
      R(c, left + CX - 6 + k * 6 + Math.round(Math.sin(t * 2 + k) * 2), top + 2 - ph * 16, 1, 1, "#ffd84a");
      c.restore();
    }
  },
};

// L2 Possessed
const possessed = {
  pal: { base: "#2e1a40", hi: "#4a2a66", sh: "#1a0f26", rib: "#3a2052" }, face: "grumpy", stem: "#1a0f26", stemSh: "#0b0614",
  float: (t) => (reduced ? -1 : -1 - Math.round((Math.sin(t * 2) + 1) / 2)),
  glow: () => "#5ee84a",
  eyeCol: (t) => (Math.sin(t * 4) > 0 ? "#b7ff9e" : "#5ee84a"),
  outline: (t) => (Math.sin(t * 3) > 0 ? "#6b3fa8" : "#3a1f66"),
  under: (c, left, top, t) => glow(c, left + CX, top + 2, 18, "#c46bff", 0.3 + 0.1 * Math.sin(t * 3)),
  over: (c, left, top, t) => {
    const RUNES = [["p.p", ".p.", "p.p"], ["ppp", "p..", "ppp"], [".p.", "ppp", ".p."], ["p..", "ppp", "..p"]];
    RUNES.forEach((r, k) => {
      const a = t * 0.9 + (k * TAU) / 4;
      const x = Math.round(left + CX + Math.cos(a) * 10) - 1, y = Math.round(top + 2 + Math.sin(a) * 4) - 1;
      if (Math.sin(a) < -0.2) return;
      spr(c, r, { p: Math.sin(t * 5 + k) > 0 ? "#e0b0ff" : "#c46bff" }, x, y);
    });
  },
};

export default {
  ...Object.fromEntries(COLORS.map((col) => [`head/pumpkin-helmet/common/classic-carve-${slug(col.name)}`, helmet(classicCarve(col))])),
  ...Object.fromEntries(COLORS.map((col) => [`head/pumpkin-helmet/common/grumpy-carve-${slug(col.name)}`, helmet(grumpyCarve(col))])),
  "head/pumpkin-helmet/rare/pumpkin-king": helmet(pumpkinKing),
  "head/pumpkin-helmet/epic/chomper": helmet(chomper),
  "head/pumpkin-helmet/legendary/headless-horseman": helmet(horseman),
  "head/pumpkin-helmet/legendary/possessed": helmet(possessed),
};
