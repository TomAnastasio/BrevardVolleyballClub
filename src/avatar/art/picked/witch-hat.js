// Ported from design/gacha/pages/03-witch-hat-tiers.html (branch claude/gacha-avatars-design).
import { R, spr, glow, sparkle, CX, OUT, makeGrid, outline, shadedRow } from "../kit.js";

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- Classic Cone, parameterised ----------
// Geometry is fixed (the hat the owner picked); options change colors, patterns and effects.
function coneSpan(k, tipWiggle = 0) {
  const half = Math.max(0, 3 - k * 0.34);
  const lean = Math.round((k * k) / 32 + (tipWiggle * k * k) / 81);
  return [Math.round(CX - half + lean), Math.round(CX + half + lean)];
}
function classic(o, t) {
  const g = makeGrid();
  const P = o.pal;
  g.row(CX - 6, CX + 6, 2, o.brim || P.sh);
  shadedRow(g, CX - 5, CX + 5, 1, o.brimPal || P);
  g.row(CX - 3, CX + 3, 0, o.band); g.row(CX - 3, CX + 3, -1, o.bandTop || o.band);
  const wig = o.wiggle ? o.wiggle(t) : 0;
  for (let k = 0; k < 10; k++) {
    const [x0, x1] = coneSpan(k, wig), y = -2 - k;
    for (let x = x0; x <= x1; x++) {
      let col = x === x0 ? P.hi : x >= x1 - 1 && x1 - x0 > 2 ? P.sh : P.base;
      if (o.cone) col = o.cone(x, y, k, col, t, x0, x1) || col;
      g.set(x, y, col);
    }
  }
  const tipX = CX + 4 + Math.round(wig * 1.2);
  g.set(tipX, -12, o.tip || P.base);
  outline(g, o.outline ? o.outline(t) : OUT);
  if (o.buckle) {
    g.row(CX - 1, CX + 1, -1, o.buckle); g.row(CX - 1, CX + 1, 0, o.buckle);
    g.set(CX, 0, o.buckleHole || "#3a2a00"); g.set(CX, -1, o.buckleHole || "#3a2a00");
  }
  if (o.after) o.after(g, t, tipX);
  return g;
}
// the page passed the tip's x to `over` as a 5th argument; the engine doesn't, so work it out here
function hat(o) {
  const tipX = (t) => CX + 4 + Math.round((o.wiggle ? o.wiggle(t) : 0) * 1.2);
  const item = { build: (t) => classic(o, t) };
  if (o.under) item.under = o.under;
  if (o.over) item.over = (c, left, top, t) => o.over(c, left, top, t, tipX(t));
  return item;
}

const COLORS = [
  { name: "Midnight", base: "#2a2433", sh: "#1a1622", hi: "#4a4060", pair: "#ff7a1a" },
  { name: "Witch purple", base: "#3b2a5c", sh: "#271b3f", hi: "#5d4688", pair: "#5ee84a" },
  { name: "Swamp green", base: "#2f6b3a", sh: "#1f4a28", hi: "#4a9a52", pair: "#6b3fa8" },
  { name: "Pumpkin", base: "#c4550a", sh: "#8f3c06", hi: "#ff7a1a", pair: "#1a1622" },
  { name: "Moonlit blue", base: "#2a4a8f", sh: "#1c3366", hi: "#4a72c4", pair: "#ffe14d" },
  { name: "Blood red", base: "#8f1426", sh: "#5c0c18", hi: "#c42a3e", pair: "#1a1622" },
];
const PURPLE = COLORS[1];

// C3 Ringed: two light rings painted around the cone and a dark band.
const ringed = (col) => ({ pal: col, band: col.sh, bandTop: col.sh, cone: (x, y, k) => (k === 2 || k === 5 ? col.hi : null) });

// R3 Candy Corn
const candyCorn = {
  pal: { base: "#ff7a1a", sh: "#c4550a", hi: "#ffa45a" }, band: "#1a1622", bandTop: "#1a1622", brim: "#1a1622", brimPal: { base: "#2a2433", sh: "#1a1622", hi: "#4a4060" },
  tip: "#fff6e0",
  cone: (x, y, k, col, t, x0, x1) => {
    const edge = x === x0 ? 0 : x >= x1 - 1 && x1 - x0 > 2 ? 2 : 1;
    if (k <= 2) return ["#fff07a", "#ffd84a", "#d9a800"][edge];
    if (k >= 7) return ["#ffffff", "#fff6e0", "#d9cfb8"][edge];
    return null;
  },
};

// E2 Jack-o'-Lantern Band
const jackBand = {
  pal: PURPLE, band: "#ff7a1a", bandTop: "#ff7a1a",
  after: (g, t) => {
    const lit = Math.sin(t * 11) + Math.sin(t * 6.7) > -0.5 ? "#fff3a0" : "#ffd84a";
    g.set(CX - 2, -1, lit); g.set(CX + 2, -1, lit);
    g.row(CX - 1, CX + 1, 0, lit); g.set(CX, -1, "#c4550a");
  },
  under: (c, left, top, t) => glow(c, left + CX, top, 8, "#ff7a1a", 0.35 + 0.1 * Math.sin(t * 9)),
  over: (c, left, top, t) => {
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.6 + k / 4) % 1;
      c.save(); c.globalAlpha = 1 - ph;
      R(c, left + CX - 3 + k * 2 + Math.round(Math.sin(t * 3 + k)), top - 2 - ph * 9, 1, 1, k % 2 ? "#ffd84a" : "#ff7a1a");
      c.restore();
    }
  },
};

// E3 Bat Perch
const batPerch = {
  pal: PURPLE, band: "#5ee84a", bandTop: "#3fb02f", buckle: "#ffd84a", buckleHole: "#7a5a00",
  over: (c, left, top, t, tipX) => {
    const ph = t % 3.5, flap = ph > 2.6 ? Math.floor(ph * 10) % 2 : -1;
    const x = left + tipX - 3, y = top - 16;
    const frames = { "-1": [".......", "..k.k..", ".kkkkk.", "..kyk..", "..k.k.."], 0: ["k.....k", "kk.k.kk", ".kkkkk.", "..kyk..", "..k.k.."], 1: ["..k.k..", ".kkkkk.", "kkkykkk", "k.....k", "......."] };
    glow(c, x + 3, y + 2, 7, "#b9a0ff", 0.25); spr(c, frames[flap], { k: "#5a4486", y: "#ffd84a" }, x, y - (flap === 1 ? 1 : 0));
    if (flap === -1) { R(c, x + 2, y + 2, 1, 1, "#ff3b4d"); R(c, x + 4, y + 2, 1, 1, "#ff3b4d"); }
  },
};

// L2 Ghostfire
const ghostfire = {
  pal: { base: "#16302c", sh: "#0c1f1c", hi: "#24504a" }, band: "#5ee84a", bandTop: "#b7ff9e", brim: "#0c1f1c",
  outline: (t) => (Math.floor(t * 8) % 3 === 0 ? "#2f8a3a" : "#0b0614"),
  under: (c, left, top, t) => glow(c, left + CX + 1, top - 4, 18, "#5ee84a", 0.3 + 0.1 * Math.sin(t * 13)),
  over: (c, left, top, t, tipX) => {
    const COLS = ["#ffffff", "#c8ffb0", "#5ee84a", "#2f8a3a"];
    const sources = [[tipX, -12, 9], [CX + 3, -8, 4], [CX - 6, 2, 4], [CX + 6, 2, 4], [CX - 3, 1, 3], [CX + 3, 1, 3]];
    sources.forEach(([sx, sy, h], si) => {
      for (let k = 0; k < 4; k++) {
        const ph = (t * 1.6 + k / 4 + si * 0.17) % 1;
        c.save(); c.globalAlpha = 1 - ph * 0.8;
        const x = left + sx + Math.round(Math.sin(t * 7 + k * 2 + si) * (ph * 2));
        R(c, x, top + sy - 1 - ph * h, 1, 1, COLS[Math.min(3, Math.floor(ph * 4))]);
        if (ph < 0.4 && si === 0) R(c, x + 1, top + sy - ph * h, 1, 1, "#c8ffb0");
        c.restore();
      }
    });
  },
};

// L3 Living Hat
const livingHat = {
  pal: { base: "#5a3a28", sh: "#3d2618", hi: "#7a5236" }, band: "#2a1a10", bandTop: "#3d2618", brim: "#3d2618", brimPal: { base: "#5a3a28", sh: "#3d2618", hi: "#7a5236" },
  wiggle: (t) => Math.sin(t * 1.4) * 1.3,
  after: (g, t) => {
    const blink = t % 4 > 3.8;
    const look = Math.round(Math.sin(t * 0.9) * 0.6);
    const eye = blink ? "#3d2618" : "#ffd84a";
    g.set(CX - 1 + look, -5, eye); g.set(CX + 2 + look, -5, eye);
    if (!blink) { g.set(CX - 1 + look, -4, "#c9a000"); g.set(CX + 2 + look, -4, "#c9a000"); }
    g.set(CX - 1, -6, "#1a0f08"); g.set(CX + 3, -6, "#1a0f08");
    const open = Math.floor(t * 6) % 3 === 0 && t % 4 < 2;
    g.row(CX - 2, CX + 3, -2, "#1a0f08");
    if (open) g.row(CX - 1, CX + 2, -3, "#1a0f08");
    g.set(CX - 1, -2, "#f3efe6"); g.set(CX + 1, -2, "#f3efe6"); g.set(CX + 3, -2, "#f3efe6");
  },
  under: (c, left, top, t) => glow(c, left + CX + 1, top - 4, 14, "#ffd84a", 0.18 + 0.06 * Math.sin(t * 3)),
};

export default {
  ...Object.fromEntries(COLORS.map((col) => [`head/witch-hat/common/ringed-${slug(col.name)}`, hat(ringed(col))])),
  "head/witch-hat/rare/candy-corn": hat(candyCorn),
  "head/witch-hat/epic/jack-o-lantern-band": hat(jackBand),
  "head/witch-hat/epic/bat-perch": hat(batPerch),
  "head/witch-hat/legendary/ghostfire": hat(ghostfire),
  "head/witch-hat/legendary/living-hat": hat(livingHat),
};
