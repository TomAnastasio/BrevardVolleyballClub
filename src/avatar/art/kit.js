// Everything the item art draws with. The art files in data/ are the
// design branch's drawing code (design/gacha/source/data/*.js on
// `claude/gacha-avatars-design`), copied as-is apart from an import line,
// so they read like that code: short helper names, body pixel coordinates.
import { R, spr } from "../engine.js";

export { R, spr };

export const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const TAU = Math.PI * 2;

export function glow(c, cx, cy, r, col, a) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, col);
  g.addColorStop(1, "transparent");
  c.save();
  c.globalAlpha = Math.max(0, a);
  c.fillStyle = g;
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.restore();
}
export function sparkle(c, x, y, col, big) {
  R(c, x, y - (big ? 2 : 1), 1, big ? 5 : 3, col);
  R(c, x - (big ? 2 : 1), y, big ? 5 : 3, 1, col);
}
export function fade(c, alpha, fn) {
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  fn();
  c.restore();
}
export const darken = (hex, f = 0.72) => {
  const n = parseInt(hex.slice(1), 16);
  const v = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.round(x * f));
  return "#" + v.map((x) => Math.min(255, x).toString(16).padStart(2, "0")).join("");
};
export const lighten = (hex, f = 0.3) => {
  const n = parseInt(hex.slice(1), 16);
  const v = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.round(x + (255 - x) * f));
  return "#" + v.map((x) => x.toString(16).padStart(2, "0")).join("");
};
export const at = (list, x, y) => list.some(([a, b]) => a === x && b === y);
// deterministic 0..1 noise from integers, for stable speckles
export const hash = (a, b = 0, c2 = 0) => {
  let h = (a * 374761393 + b * 668265263 + c2 * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ---------- head grid builder: fill shapes, then auto-outline ----------
export const CX = 7; // head centre column
export const OUT = "#0b0614";
export function makeGrid() {
  const m = new Map();
  return {
    m,
    set(x, y, c) { m.set(`${Math.round(x)},${Math.round(y)}`, { x: Math.round(x), y: Math.round(y), c }); },
    row(x0, x1, y, c) { for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, c); },
    has(x, y) { return m.has(`${x},${y}`); },
    get(x, y) { return m.get(`${x},${y}`); },
    del(x, y) { m.delete(`${x},${y}`); },
  };
}
// outlines the sides and top of everything in the grid (not underneath: it sits on the head)
export function outline(g, col = OUT) {
  const add = [];
  for (const { x, y } of g.m.values())
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]])
      if (!g.has(x + dx, y + dy)) add.push([x + dx, y + dy]);
  for (const [x, y] of add) g.set(x, y, col);
}
// shaded row: highlight on the left edge, shadow on the right two pixels
export function shadedRow(g, x0, x1, y, P) {
  x0 = Math.round(x0); x1 = Math.round(x1);
  for (let x = x0; x <= x1; x++) g.set(x, y, x === x0 ? P.hi : x >= x1 - 1 && x1 - x0 > 2 ? P.sh : P.base);
}
// filled ellipse into a grid (cx, cy centre; rx, ry radii), colored by fn(x, y, x0, x1)
export function ellipse(g, cx, cy, rx, ry, colorFn) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const d = 1 - ((y - cy) / ry) ** 2;
    if (d <= 0) continue;
    const half = Math.sqrt(d) * rx;
    const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    for (let x = x0; x <= x1; x++) g.set(x, y, colorFn(x, y, x0, x1));
  }
}

// ---------- where the art files put their items ----------
// THEMES[slot] is a list of themes in the order the review pages showed them
// (that order is what the catalog keys were numbered from, so keep it).
// Theme: { name, common: { colors, make(color) }, rare/epic/legendary: { name, item } }.
export const THEMES = { head: [], shirt: [], pants: [], shoes: [] };
export function addTheme(slot, theme) { THEMES[slot].push(theme); }
// Transformations by tier, in page 14's order: { name, rows, pal, ... }.
export const SKINS2 = { epic: [], legendary: [] };
export function addSkin(tier, s) { SKINS2[tier].push(s); }
