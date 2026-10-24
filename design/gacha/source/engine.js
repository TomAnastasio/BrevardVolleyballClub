// =====================================================================
// BVC cosmetics engine: one 16-Bit Pro body, gear layered by zone.
// Data files call addTheme(slot, theme). See FORMAT below.
// =====================================================================
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- drawing helpers ----------
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function spr(c, rows, pal, x, y) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (col) R(c, x + i, y + j, 1, 1, col); }
  });
}
function glow(c, cx, cy, r, col, a) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, col); g.addColorStop(1, "transparent");
  c.save(); c.globalAlpha = Math.max(0, a); c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
}
function sparkle(c, x, y, col, big) {
  R(c, x, y - (big ? 2 : 1), 1, big ? 5 : 3, col);
  R(c, x - (big ? 2 : 1), y, big ? 5 : 3, 1, col);
}
function fade(c, alpha, fn) { c.save(); c.globalAlpha = Math.max(0, Math.min(1, alpha)); fn(); c.restore(); }
const darken = (hex, f = 0.72) => {
  const n = parseInt(hex.slice(1), 16);
  const v = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.round(x * f));
  return "#" + v.map((x) => Math.min(255, x).toString(16).padStart(2, "0")).join("");
};
const lighten = (hex, f = 0.3) => {
  const n = parseInt(hex.slice(1), 16);
  const v = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.round(x + (255 - x) * f));
  return "#" + v.map((x) => x.toString(16).padStart(2, "0")).join("");
};
const at = (list, x, y) => list.some(([a, b]) => a === x && b === y);
// deterministic 0..1 noise from integers, for stable speckles
const hash = (a, b = 0, c2 = 0) => { let h = (a * 374761393 + b * 668265263 + c2 * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ---------- head grid builder: fill shapes, then auto-outline ----------
const CX = 7; // head centre column
const OUT = "#0b0614";
function makeGrid() {
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
function outline(g, col = OUT) {
  const add = [];
  for (const { x, y } of g.m.values())
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]])
      if (!g.has(x + dx, y + dy)) add.push([x + dx, y + dy]);
  for (const [x, y] of add) g.set(x, y, col);
}
// shaded row: highlight on the left edge, shadow on the right two pixels
function shadedRow(g, x0, x1, y, P) {
  x0 = Math.round(x0); x1 = Math.round(x1);
  for (let x = x0; x <= x1; x++) g.set(x, y, x === x0 ? P.hi : x >= x1 - 1 && x1 - x0 > 2 ? P.sh : P.base);
}
// filled ellipse into a grid (cx, cy centre; rx, ry radii), colored by fn(x, y, x0, x1) or a palette
function ellipse(g, cx, cy, rx, ry, colorFn) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const d = 1 - ((y - cy) / ry) ** 2;
    if (d <= 0) continue;
    const half = Math.sqrt(d) * rx;
    const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    for (let x = x0; x <= x1; x++) g.set(x, y, colorFn(x, y, x0, x1));
  }
}

// ---------- the 16-Bit Pro ----------
// Zone letters: h/H hair, s/S skin, e eye, m mouth, k knee pad, n hand,
// t/T torso (T = right shade), u upper arm, l forearm,
// p/P hips+thighs (rows 15-17), q/Q shins (rows 18, 21, 22), w socks (rows 23-24), f/F shoes (rows 25-26).
// Head: hair rows 0-2, face rows 3-6 (eyes at x 5 and 8, row 4), neck row 7. Head spans x 4-10, centre x 7.
// Torso rows 8-14 (x 3-11 at the shoulders, x 5-10 lower), arms x 2-3 and 12-13.
// Legs: left x 5-6, right x 9-10. Shoes: left x 4-6, right x 9-11, toes point outward (x 4 and x 11).
const BODY = [".....hhhh.....", "....hhhhhH....", "....hhhhhHH...", "....hsssssH...", "....sesseS....", "....sssssS....", ".....smmS.....", "......sS......", "...ttttttttT..", "..uttttttttTu.", "..uutttttttTuu", "..uu.ttttTT.uu", "..ll.ttttTT.ll", "..ll.ttttTT.ll", "..nn.ttttTT.nn", ".....pppppP...", ".....pppPPP...", ".....pp..PP...", ".....qq..qQ...", ".....kk..kk...", ".....kk..kk...", ".....qq..qQ...", ".....qq..qQ...", ".....ww..ww...", ".....ww..ww...", "....fff..ffF..", "....FFF..FFF.."];
const SKIN = "#c9b49a", SKIN_D = "#a8927a";
const BASE = { h: "#6b6380", H: "#55506b", s: SKIN, S: SKIN_D, e: "#1a1024", m: "#8a5a5a", k: "#5a5078", n: SKIN, w: "#e8dff5", f: "#e8dff5", F: "#a49db0", q: SKIN, Q: SKIN_D, t: "#b9b2c9", T: "#9d96b0", u: SKIN, l: SKIN, p: "#7d7591", P: "#6b6380" };

/* FORMAT — what an item is, per slot. Every hook is optional unless noted.
   All x/y are body pixel coordinates (0..13, 0..26); left/top are canvas offsets of the body.
   head:  { build(t) -> grid (required; draw with makeGrid/outline/ellipse; may cover face rows 0-7),
            under(c,left,top,t), over(c,left,top,t), float(t) -> extra pixels up (int) }
   shirt: { sleeve: "short"|"long", px(x,y,zone,t) -> color (required; zones t T u l; null = skin),
            under, over }
   pants: { long: bool (covers shins/knees), socks: bool (also colors w), ghost: bool (hide legs+shoes),
            px(x,y,zone,t) -> color (required; zones p P, plus q Q k if long, w if socks; null = see-through),
            shin(x,y,zone,t) (shorts only: color the bare shins), under, over }
   pants and shirt under/over also get a 5th argument, groundTop: the body's top if it were
   standing on the floor (ignores shoe lift), for anything that belongs on the floor.
   shoes: { high: bool (also colors socks w), lift: int (hover/platform px), px(x,y,zone,t) -> color (required; zones f F, w if high; null = hidden),
            under(c,left,groundTop,t) (groundTop ignores lift), over }
   theme: { name, pitch,
            common: { pitch, colors: [ {name, ...your fields} x6 ], make(color) -> item },
            rare: { name, pitch, item }, epic: { name, pitch, item }, legendary: { name, pitch, item } }
*/
const THEMES = { head: [], shirt: [], pants: [], shoes: [] };
function addTheme(slot, theme) { THEMES[slot].push(theme); }

function drawAvatar(c, gear, x, bottom, t, still = false) {
  const { head, shirt, pants } = gear;
  // A ghost tail has no feet, so whatever shoes are equipped are ignored (owner's call, 2026-10-24).
  const shoes = pants && pants.ghost ? null : gear.shoes;
  const bob = reduced || still ? 0 : Math.round((Math.sin(t * 3) + 1) / 2);
  const lift = shoes && shoes.lift ? shoes.lift : 0;
  const left = Math.round(x - 7), groundTop = bottom - BODY.length - bob, top = groundTop - lift;
  for (const it of [pants, shirt]) if (it && it.under) it.under(c, left, top, t, groundTop);
  if (shoes && shoes.under) shoes.under(c, left, groundTop, t);
  BODY.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const z = row[i];
      if (z === ".") continue;
      let col = BASE[z];
      if (pants && pants.ghost && "pPqQkwfF".includes(z)) continue;
      if (shirt && "tTul".includes(z)) col = z === "l" && shirt.sleeve !== "long" ? SKIN : shirt.px(i, j, z, t) ?? (z === "u" || z === "l" ? SKIN : col);
      if (pants) {
        if (z === "p" || z === "P") col = pants.px(i, j, z, t);
        else if ("qQk".includes(z)) col = pants.long ? pants.px(i, j, z, t) : pants.shin ? pants.shin(i, j, z, t) ?? col : col;
        else if (z === "w" && pants.socks) col = pants.px(i, j, z, t);
      }
      if (shoes && (z === "f" || z === "F" || (z === "w" && shoes.high))) col = shoes.px(i, j, z, t);
      if (col) R(c, left + i, top + j, 1, 1, col);
    }
  });
  for (const it of [pants, shirt]) if (it && it.over) it.over(c, left, top, t, groundTop);
  if (shoes && shoes.over) shoes.over(c, left, top, t);
  if (head) {
    const hTop = top - (head.float ? head.float(t) : 0);
    if (head.under) head.under(c, left, hTop, t);
    for (const { x: px, y: py, c: col } of head.build(t).m.values()) R(c, left + px, hTop + py, 1, 1, col);
    if (head.over) head.over(c, left, hTop, t);
  }
}
