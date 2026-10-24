// ---------- Transformations gallery ----------
/* FORMAT for a transformation (call addSkin(tier, skin), tier "epic" or "legendary"):
   { name, pitch,
     rows: [...] pixel map, at most 18 wide x 28 tall ("." = see-through); the last row sits on the ground,
     pal: { letter: color },
     float(t) -> pixels to hover (optional), animPal(t) -> palette overrides per frame (optional),
     under(c, left, top, t), over(c, left, top, t)  (optional; left/top = the map's top-left on the canvas) }
   The 18x28 box is the whole space: x 0..17, y 0..27 measured from the map's top-left when the map is 28 tall.
   Epic: a great silhouette plus at most one small animation. Legendary: glow, particles and motion. */
const SKINS2 = { epic: [], legendary: [] };
function addSkin(tier, s) { SKINS2[tier].push(s); }

function drawSkin2(c, s, cx, ground, t, still = false) {
  const tt = still ? 0 : t;
  const bob = reduced || still ? 0 : Math.round((Math.sin(t * 3) + 1) / 2);
  const f = s.float ? s.float(tt) : 0;
  const w = Math.max(...s.rows.map((r) => r.length));
  const rows = s.rows.map((r) => r.padEnd(w, "."));
  const left = Math.round(cx - w / 2), top = ground - rows.length - bob - f;
  if (s.under) s.under(c, left, top, tt);
  spr(c, rows, s.animPal ? { ...s.pal, ...s.animPal(tt) } : s.pal, left, top);
  if (s.over) s.over(c, left, top, tt);
}

