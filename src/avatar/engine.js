// The 16-Bit Pro: every player's pixel avatar, with gear layered on by zone
// (hair, shirt, sleeves, shorts, shins, socks, shoes), so one item fits
// every player. Ported from the design work on branch
// `claude/gacha-avatars-design` (design/gacha/source/engine.js and
// xcore.js), where the full item format is documented. The item art itself
// is in ./art.
//
// Units are body pixels: the avatar is 14 wide and 27 tall. Callers scale
// the canvas (ctx.scale) to draw it bigger.

export const AVATAR_WIDTH = 14;
export const AVATAR_HEIGHT = 27;

// ---------- drawing helpers (item art draws with these too) ----------
export function R(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function spr(c, rows, pal, x, y) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (col) R(c, x + i, y + j, 1, 1, col);
    }
  });
}

// ---------- the body ----------
// Zone letters: h/H hair, s/S skin, e eye, m mouth, k knee pad, n hand,
// t/T torso (T = right shade), u upper arm, l forearm,
// p/P hips+thighs (rows 15-17), q/Q shins (rows 18, 21, 22), w socks (rows 23-24), f/F shoes (rows 25-26).
// Head: hair rows 0-2, face rows 3-6, neck row 7. Head spans x 4-10, centre x 7.
const BODY = [".....hhhh.....", "....hhhhhH....", "....hhhhhHH...", "....hsssssH...", "....sesseS....", "....sssssS....", ".....smmS.....", "......sS......", "...ttttttttT..", "..uttttttttTu.", "..uutttttttTuu", "..uu.ttttTT.uu", "..ll.ttttTT.ll", "..ll.ttttTT.ll", "..nn.ttttTT.nn", ".....pppppP...", ".....pppPPP...", ".....pp..PP...", ".....qq..qQ...", ".....kk..kk...", ".....kk..kk...", ".....qq..qQ...", ".....qq..qQ...", ".....ww..ww...", ".....ww..ww...", "....fff..ffF..", "....FFF..FFF.."];
const SKIN = "#c9b49a";
const SKIN_D = "#a8927a";
// Avatar 2: the same body and zones (so every item fits both), with longer
// hair framing the face down to the neck (rows 0-7 only, never under a shirt)
// and a rosier mouth.
const BODY_2 = [".....hhhhh....", "....hhhhhhH...", "...hhhhhhhHH..", "...hhsssssHH..", "...hsesseSH...", "...hsssssSH...", "...hhsmmSHH...", "...hh.sS.HH...", ...BODY.slice(8)];
// The four skin colors (1 is lightest); 2 is the original, and the default.
export const SKIN_TONES = [
  { s: "#ecc9a8", S: "#cfa682" },
  { s: SKIN, S: SKIN_D },
  { s: "#a8744f", S: "#87583a" },
  { s: "#6b4431", S: "#4f3022" },
];
// What a player looks like before choosing: Avatar 1, skin color 2.
export const DEFAULT_LOOK = { avatar: 1, skin: 2 };
// Plain grey: what everyone wears before they own any gear.
const BASE = { h: "#6b6380", H: "#55506b", s: SKIN, S: SKIN_D, e: "#1a1024", m: "#8a5a5a", k: "#5a5078", n: SKIN, w: "#e8dff5", f: "#e8dff5", F: "#a49db0", q: SKIN, Q: SKIN_D, t: "#b9b2c9", T: "#9d96b0", u: SKIN, l: SKIN, p: "#7d7591", P: "#6b6380" };

// Draws the avatar with its feet centred on (x, bottom). `gear` is
// { head, shirt, pants, shoes, look } (any may be missing; see the item
// FORMAT in the design branch's engine.js) or { transformation } to draw a
// whole-body monster instead. `look` is { avatar: 1 | 2, skin: 1-4 }
// (DEFAULT_LOOK if missing). `t` (seconds) drives item animations.
export function drawAvatar(c, gear, x, bottom, t) {
  if (gear?.transformation) {
    drawTransformation(c, gear.transformation, x, bottom, t);
    return;
  }
  const { head, shirt, pants } = gear || {};
  // A ghost tail has no feet, so whatever shoes are equipped are ignored (owner's call, 2026-10-24).
  const shoes = pants?.ghost ? null : gear?.shoes;
  const lift = shoes?.lift ?? 0;
  const look = gear?.look ?? DEFAULT_LOOK;
  const rows = look.avatar === 2 ? BODY_2 : BODY;
  const tone = SKIN_TONES[look.skin - 1] ?? SKIN_TONES[DEFAULT_LOOK.skin - 1];
  // Skin is drawn in the original skin color everywhere (the body, bare
  // arms, and any item that shows skin), then swapped for the chosen one.
  const skin = (col) => (col === SKIN ? tone.s : col === SKIN_D ? tone.S : col);
  const left = Math.round(x - AVATAR_WIDTH / 2);
  const groundTop = bottom - BODY.length;
  const top = groundTop - lift;
  // pants and shirt also get groundTop (ignores shoe lift) for anything drawn on the floor
  for (const it of [pants, shirt]) if (it?.under) it.under(c, left, top, t, groundTop);
  if (shoes?.under) shoes.under(c, left, groundTop, t);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const z = row[i];
      if (z === ".") continue;
      let col = look.avatar === 2 && z === "m" ? "#b0566b" : BASE[z];
      if (pants?.ghost && "pPqQkwfF".includes(z)) continue;
      if (shirt && "tTul".includes(z)) col = z === "l" && shirt.sleeve !== "long" ? SKIN : (shirt.px(i, j, z, t) ?? (z === "u" || z === "l" ? SKIN : col));
      if (pants) {
        if (z === "p" || z === "P") col = pants.px(i, j, z, t);
        else if ("qQk".includes(z)) col = pants.long ? pants.px(i, j, z, t) : pants.shin ? (pants.shin(i, j, z, t) ?? col) : col;
        else if (z === "w" && pants.socks) col = pants.px(i, j, z, t);
      }
      if (shoes && (z === "f" || z === "F" || (z === "w" && shoes.high))) col = shoes.px(i, j, z, t);
      if (col) R(c, left + i, top + j, 1, 1, skin(col));
    }
  });
  for (const it of [pants, shirt]) if (it?.over) it.over(c, left, top, t, groundTop);
  if (shoes?.over) shoes.over(c, left, top, t);
  if (head) {
    const hTop = top - (head.float ? head.float(t) : 0);
    if (head.under) head.under(c, left, hTop, t);
    for (const { x: px, y: py, c: col } of head.build(t).m.values()) R(c, left + px, hTop + py, 1, 1, skin(col));
    if (head.over) head.over(c, left, hTop, t);
  }
}

// A transformation replaces the whole body: { rows, pal, float(t)?,
// animPal(t)?, under?, over? }, at most 18 wide x 28 tall, last row on the
// ground.
function drawTransformation(c, s, x, bottom, t) {
  const f = s.float ? s.float(t) : 0;
  const w = Math.max(...s.rows.map((r) => r.length));
  const rows = s.rows.map((r) => r.padEnd(w, "."));
  const left = Math.round(x - w / 2);
  const top = bottom - rows.length - f;
  if (s.under) s.under(c, left, top, t);
  spr(c, rows, s.animPal ? { ...s.pal, ...s.animPal(t) } : s.pal, left, top);
  if (s.over) s.over(c, left, top, t);
}
