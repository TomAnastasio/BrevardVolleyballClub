// Copied from design/gacha/source/data/xe2.js (branch claude/gacha-avatars-design).
import { R, spr, reduced, TAU, glow, sparkle, fade, darken, lighten, at, hash, CX, OUT, makeGrid, outline, shadedRow, ellipse, addTheme, addSkin } from "../kit.js";

// Epic transformations, second half (XE21-XE40 in the combined gallery).
(() => {
// A tiny character-grid builder so shapes stay aligned: letters are palette keys, "." is see-through.
function B(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill("."));
  const api = {
    set(x, y, ch) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch; return api; },
    rect(x, y, rw, rh, ch) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) api.set(x + i, y + j, ch); return api; },
    ell(cx, cy, rx, ry, ch) {
      for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
        const d = 1 - ((y - cy) / ry) ** 2;
        if (d < 0) continue;
        const half = rx * Math.sqrt(d);
        for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) api.set(x, y, typeof ch === "function" ? ch(x, y) : ch);
      }
      return api;
    },
    pts(list, ch) { list.forEach(([x, y]) => api.set(x, y, ch)); return api; },
    str(x, y, s) { [...s].forEach((ch, i) => { if (ch !== ".") api.set(x + i, y, ch); }); return api; },
    lines(x, y, arr) { arr.forEach((s, j) => api.str(x, y + j, s)); return api; },
    // copy every non-empty pixel on the left half onto the right half
    mirror() { for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) if (g[y][x] !== ".") g[y][w - 1 - x] = g[y][x]; return api; },
    get(x, y) { return g[y] && g[y][x]; },
    rows() { return g.map((r) => r.join("")); },
  };
  return api;
}
const blinkAt = (t, every = 3.4, len = 0.16) => t % every > every - len;

// ---------- 1 Haunted Armor ----------
{
  const b = B(18, 28);
  b.rect(6, 1, 6, 7, "a").pts([[6, 1], [11, 1]], ".").rect(8, 0, 2, 1, "p").pts([[10, 0], [11, 0]], "p");
  b.rect(6, 2, 1, 6, "H").rect(11, 2, 1, 6, "A").rect(7, 4, 4, 1, "v").pts([[7, 6], [9, 6]], "k");
  b.rect(7, 8, 4, 1, "A");
  b.ell(4, 9.5, 2.5, 1.5, "a").ell(13, 9.5, 2.5, 1.5, "a").pts([[2, 9], [15, 9]], "H");
  b.rect(6, 9, 6, 7, "a").rect(8, 10, 2, 5, "H").rect(11, 9, 1, 7, "A").rect(6, 16, 6, 1, "A");
  b.rect(3, 11, 2, 5, "a").rect(13, 11, 2, 5, "a").rect(2, 16, 3, 2, "A").rect(13, 16, 3, 2, "A");
  b.rect(6, 17, 6, 2, "a").rect(8, 17, 2, 2, "k");
  b.rect(6, 19, 2, 7, "a").rect(10, 19, 2, 7, "a").pts([[6, 21], [7, 21], [10, 21], [11, 21]], "H");
  b.rect(5, 26, 3, 2, "A").rect(10, 26, 3, 2, "A");
  addSkin("epic", {
    name: "Haunted Armor",
    pitch: "An empty suit of knight's armor with nothing inside but a green light flickering behind the visor.",
    rows: b.rows(),
    pal: { a: "#8d84a8", A: "#5a5078", H: "#c9c2d9", v: "#7dff5a", k: "#0b0614", p: "#8f1426" },
    animPal: (t) => ({ v: Math.sin(t * 7) + Math.sin(t * 3.1) > 0.4 ? "#c8ffb0" : "#5ee84a" }),
  });
}

// ---------- 2 Gargoyle ----------
{
  const b = B(18, 22);
  b.lines(0, 2, [".....S", "...SSS", ".SSSSS", "SHSSSS", "SSHSSS", "SSSHSS", "SSSSHS", "S.SS.S", "..S..S"]).mirror();
  b.ell(8.5, 9, 4, 3.5, "s");
  b.rect(6, 1, 6, 5, "s").pts([[6, 0], [11, 0]], "H").pts([[6, 1], [11, 1]], "H");
  b.pts([[7, 3], [10, 3]], "e").rect(7, 4, 4, 2, "S").pts([[8, 5], [9, 5]], "H");
  b.ell(4.5, 13, 2, 2, "S").ell(12.5, 13, 2, 2, "S");
  b.rect(6, 12, 2, 3, "s").rect(10, 12, 2, 3, "s").pts([[6, 15], [7, 15], [10, 15], [11, 15]], "H");
  b.pts([[15, 12], [16, 13], [16, 14], [15, 15], [14, 15]], "S");
  b.rect(3, 16, 12, 6, "b").rect(3, 16, 12, 1, "B").pts([[6, 18], [7, 19], [6, 20], [12, 18], [11, 19]], "k");
  addSkin("epic", {
    name: "Gargoyle",
    pitch: "A crouched stone gargoyle with spread bat wings and horns, perched on its own chunk of cathedral wall.",
    rows: b.rows(),
    pal: { s: "#7d7591", S: "#5a5078", H: "#b8b0c8", e: "#ffd84a", k: "#1a1024", b: "#4b3f70", B: "#6b5f8d" },
    animPal: (t) => (blinkAt(t, 4) ? { e: "#7d7591" } : {}),
  });
}

// ---------- 3 Cyclops Blob ----------
{
  const b = B(18, 20);
  b.ell(8.5, 11, 8.5, 9.5, (x, y) => (x <= 3 && y < 12 ? "H" : x >= 14 ? "G" : "g"));
  for (let y = 18; y < 20; y++) for (let x = 0; x < 18; x++) if (b.get(x, y) !== "." && x % 4 === 1) b.set(x, y, ".");
  b.pts([[2, 19], [7, 19], [13, 19]], "G");
  b.pts([[3, 5], [4, 4], [5, 4]], "H");
  b.ell(8.5, 9, 4, 3.5, "w").ell(8.5, 9, 2, 2, "i").rect(8, 8, 2, 2, "k").set(10, 8, "w");
  b.rect(4, 15, 10, 1, "m").pts([[5, 15], [8, 15], [11, 15]], "t").pts([[6, 16], [10, 16]], "m");
  addSkin("epic", {
    name: "Cyclops Blob",
    pitch: "A huge wobbly slime the full width of the space with one giant eye and a toothy grin, dripping where it touches the floor.",
    rows: b.rows(),
    pal: { g: "#5ee84a", G: "#3fb02f", H: "#b7ff9e", w: "#ffffff", i: "#6b3fa8", k: "#1a1024", m: "#1f4a28", t: "#f3efe6" },
    animPal: (t) => (blinkAt(t, 3.2, 0.2) ? { w: "#5ee84a", i: "#5ee84a", k: "#3fb02f" } : {}),
  });
}

// ---------- 4 Great Horned Owl ----------
{
  const b = B(18, 24);
  b.ell(8.5, 12, 6, 9.5, "o");
  b.pts([[4, 1], [4, 2], [5, 2], [5, 3]], "O").pts([[13, 1], [13, 2], [12, 2], [12, 3]], "O");
  b.rect(3, 9, 1, 11, "O").rect(14, 9, 1, 11, "O").rect(4, 12, 1, 7, "O").rect(13, 12, 1, 7, "O");
  b.ell(6, 7, 2.5, 2.5, "l").ell(11, 7, 2.5, 2.5, "l");
  b.ell(6, 7, 1.5, 1.5, "e").ell(11, 7, 1.5, 1.5, "e").pts([[6, 7], [11, 7]], "k");
  b.pts([[8, 9], [9, 9], [8, 10], [9, 10], [8, 11]], "b");
  b.ell(8.5, 15.5, 3.5, 4.5, "l");
  for (let y = 13; y <= 19; y += 2) for (let x = 6; x <= 11; x += 2) b.set(x + (y % 4 === 1 ? 1 : 0), y, "L");
  b.pts([[6, 21], [7, 21], [10, 21], [11, 21]], "b");
  b.rect(0, 22, 18, 2, "w").pts([[3, 22], [14, 23], [9, 23]], "W");
  addSkin("epic", {
    name: "Great Horned Owl",
    pitch: "A giant horned owl perched on a branch, with ear tufts, a striped chest and huge orange eyes that slowly blink.",
    rows: b.rows(),
    pal: { o: "#6b4a28", O: "#4a3018", l: "#c9a96e", L: "#8a6a3e", e: "#ff9a1a", k: "#1a1024", b: "#d9a441", w: "#3a2614", W: "#5a3a20" },
    animPal: (t) => (blinkAt(t, 3.6, 0.3) ? { e: "#4a3018", k: "#4a3018" } : {}),
  });
}

// ---------- 5 Haunted Doll ----------
{
  const b = B(18, 27);
  b.ell(8.5, 5, 6, 5, "h").rect(2, 5, 2, 9, "h").rect(14, 5, 2, 9, "h").pts([[2, 14], [15, 14], [3, 14], [14, 14]], "H");
  b.ell(8.5, 6.5, 4.5, 5, "p").rect(5, 2, 8, 2, "h");
  b.pts([[13, 0], [14, 0], [12, 1], [13, 1], [14, 1], [15, 1], [14, 2]], "d");
  b.rect(6, 6, 2, 2, "e").rect(10, 6, 2, 2, "e").pts([[6, 6], [10, 6]], "w");
  b.pts([[5, 9], [12, 9]], "r").pts([[8, 10], [9, 10]], "D");
  b.pts([[11, 3], [10, 4], [11, 5], [12, 6], [12, 7], [11, 8]], "c");
  b.rect(8, 12, 2, 1, "p");
  for (let y = 13; y <= 23; y++) { const half = 2.5 + (y - 13) * 0.5; b.rect(Math.round(8.5 - half), y, Math.round(half * 2), 1, y === 13 || y === 23 ? "f" : (y % 3 === 0 ? "D" : "d")); }
  b.ell(4.5, 14, 1.5, 1, "f").ell(12.5, 14, 1.5, 1, "f").pts([[3, 16], [14, 16]], "p");
  b.pts([[7, 24], [10, 24]], "P").rect(6, 25, 2, 2, "s").rect(10, 25, 2, 2, "s");
  addSkin("epic", {
    name: "Haunted Doll",
    pitch: "A cracked porcelain doll in a frilly red dress with black ringlets, glassy eyes and a little bow. One eye blinks. The other never does.",
    rows: b.rows(),
    pal: { p: "#f3e9e0", P: "#d9cfc8", c: "#5a4a4a", h: "#231d33", H: "#3a3150", e: "#1a1024", w: "#ffffff", r: "#ff8fb8", D: "#5c0c18", d: "#8f1426", f: "#f3efe6", s: "#1a1024" },
    animPal: (t) => (blinkAt(t, 3, 0.25) ? { w: "#f3e9e0" } : {}),
    over(c, left, top, t) { if (blinkAt(t, 3, 0.25)) { R(c, left + 6, top + 6, 2, 1, "#f3e9e0"); } },
  });
}

// ---------- 6 Imp ----------
{
  const b = B(18, 24);
  b.lines(0, 3, ["......", ".....W", "...WWW", ".WWwWW", "WWwWWW", "wWWWWW", "WwWWw.", "W.W..."]).mirror();
  b.ell(8.5, 9, 3, 2.5, "r").pts([[6, 6], [5, 5], [11, 6], [12, 5]], "h");
  b.pts([[7, 8], [10, 8]], "e").rect(7, 10, 4, 1, "k").set(8, 11, "h");
  b.ell(8.5, 14, 2.5, 3, "r").rect(8, 13, 2, 3, "R");
  b.rect(7, 17, 1, 2, "r").rect(10, 17, 1, 2, "r").pts([[6, 19], [7, 19], [10, 19], [11, 19]], "R");
  b.pts([[11, 16], [12, 17], [13, 18], [14, 18], [15, 17], [15, 16], [16, 17], [14, 16]], "R");
  b.pts([[5, 12], [4, 13], [3, 13]], "r").pts([[12, 12], [13, 13]], "r");
  b.rect(15, 2, 1, 22, "F").pts([[14, 0], [14, 1], [15, 0], [15, 1], [16, 0], [16, 1], [14, 2], [16, 2]], "f").set(14, 13, "r");
  addSkin("epic", {
    name: "Imp",
    pitch: "A little red devil hovering on wide leathery wings, with horns, a pointed tail and a pitchfork twice its size.",
    rows: b.rows(),
    pal: { r: "#c42a3e", R: "#8f1426", W: "#5c0c18", w: "#8f1426", e: "#ffd84a", k: "#1a1024", h: "#f3e9d2", f: "#c9c2d9", F: "#5a3a20" },
    float: (t) => (reduced ? 2 : 2 + Math.round((Math.sin(t * 2.5) + 1) * 1.2)),
  });
}

// ---------- 7 Banshee ----------
{
  const b = B(18, 27);
  b.ell(8.5, 6, 6, 5.5, "h").rect(2, 6, 3, 10, "h").rect(13, 6, 3, 10, "h").pts([[1, 10], [1, 12], [16, 10], [16, 13], [2, 16], [15, 16], [1, 14], [16, 15]], "H");
  b.ell(8.5, 5.5, 2.5, 3, "s").pts([[7, 4], [10, 4]], "e").ell(8.5, 7, 1, 1.5, "k");
  for (let y = 9; y <= 26; y++) {
    const half = 2.5 + (y - 9) * 0.32;
    for (let x = Math.round(8.5 - half); x <= Math.round(8.5 + half); x++) {
      if (y >= 23 && (x + y) % 3 === 0) continue;
      b.set(x, y, x >= 8.5 + half - 1 ? "G" : "g");
    }
  }
  b.rect(3, 11, 3, 1, "G").rect(12, 11, 3, 1, "G").pts([[2, 10], [15, 10]], "s");
  b.rect(6, 9, 6, 1, "H");
  addSkin("epic", {
    name: "Banshee",
    pitch: "A wailing spirit with a mouth frozen in a scream, a cloud of white hair and a tattered gown that fades into nothing, floating over the floor.",
    rows: b.rows(),
    pal: { g: "#b9c8e8", G: "#8a9ac0", h: "#e8eef8", H: "#c0cce0", s: "#d8e0f0", k: "#1a1024", e: "#3ac6d6" },
    float: (t) => (reduced ? 1 : 1 + Math.round((Math.sin(t * 1.6) + 1) * 1.5)),
  });
}

// ---------- 8 Living Candle ----------
{
  const b = B(18, 26);
  b.rect(5, 7, 8, 16, "w").rect(11, 7, 2, 16, "W").pts([[5, 6], [6, 6], [9, 6], [10, 6], [12, 6]], "w");
  b.rect(5, 8, 1, 5, "d").rect(12, 9, 1, 7, "d").pts([[5, 13], [12, 16]], "d").pts([[7, 7], [8, 8]], "d");
  b.pts([[7, 11], [10, 11]], "k").pts([[6, 10], [11, 10]], "k").pts([[8, 14], [9, 14]], "k");
  b.pts([[4, 15], [3, 14], [13, 15], [14, 14]], "W");
  b.rect(8, 4, 1, 2, "i");
  b.pts([[8, 0], [7, 1], [8, 1], [9, 1], [7, 2], [8, 2], [9, 2], [8, 3]], "f").pts([[8, 2], [8, 1]], "y");
  b.rect(2, 23, 14, 2, "b").rect(3, 25, 12, 1, "B").pts([[15, 22], [16, 23], [15, 24], [16, 22]], "b");
  addSkin("epic", {
    name: "Living Candle",
    pitch: "A tall, gloomy candle with a worried face and stubby wax arms, melting down its own sides in a brass dish while its flame flickers.",
    rows: b.rows(),
    pal: { w: "#f3e9d2", W: "#d9cfb2", d: "#fffaf0", k: "#1a1024", f: "#ff7a1a", y: "#fff3a0", i: "#3a2a1a", b: "#c9a24a", B: "#8a6a2a" },
    animPal: (t) => (Math.sin(t * 11) + Math.sin(t * 6.3) > 0 ? { f: "#ffd84a", y: "#ffffff" } : { f: "#ff7a1a", y: "#fff3a0" }),
  });
}

// ---------- 9 Jack-in-the-Box ----------
{
  const b = B(18, 28);
  b.rect(0, 9, 2, 9, "L").rect(2, 18, 14, 10, "x").rect(2, 18, 14, 1, "L").rect(15, 18, 1, 10, "X");
  b.pts([[5, 21], [11, 23], [7, 25], [13, 20]], "y").pts([[4, 21], [6, 21], [5, 20], [5, 22]], "y");
  b.pts([[16, 22], [17, 22], [17, 21]], "k");
  for (let y = 11; y <= 17; y++) b.set(y % 2 ? 7 : 10, y, "s").set(y % 2 ? 8 : 9, y, "S");
  addSkin("epic", {
    name: "Jack-in-the-Box",
    pitch: "A creepy clown on a spring bursting out of a starry toy box, with a jester hat, a ruffled collar and a grin far too wide. It bobs on its spring.",
    rows: b.rows(),
    pal: { x: "#52308a", X: "#3d2470", L: "#6b3fa8", y: "#ffd84a", k: "#1a1024", s: "#c9c2d9", S: "#8d84a8" },
    over(c, left, top, t) {
      const dy = reduced ? 0 : Math.round(Math.sin(t * 4) * 1.4);
      spr(c, [
        "..pp........gg..",
        ".yppp......gggy.",
        "...ppppppgggg...",
        "....ppppgggg....",
        "....wwwwwwww....",
        "...wwkwwwwkwww..",
        "...wkkkwwkkkww..",
        "...wwwwrrwwwww..",
        "...rwwwrrwwwwr..",
        "....rtrtrtrtr...",
        ".....rrrrrrr....",
        ".fffffffffffffff",
        "..ffffffffffff..",
      ], { p: "#6b3fa8", g: "#3fb02f", y: "#ffd84a", w: "#f3efe6", k: "#1a1024", r: "#c42a3e", t: "#ffffff", f: "#e8e0f0" }, left + 1, top - 1 + dy);
    },
  });
}

// ---------- 10 Raven Flock ----------
{
  const b = B(18, 28);
  b.ell(8.5, 3.5, 3, 3, "k").ell(8.5, 13, 5.5, 8, "k").ell(8.5, 22.5, 4, 5, "k");
  for (let y = 0; y < 28; y++) for (let x = 0; x < 18; x++) if (b.get(x, y) === "k" && (x * 2 + y) % 5 === 0) b.set(x, y, "K");
  // raven heads sticking out of the flock: [x, y, facing]
  [[6, 1, -1], [11, 2, 1], [3, 8, -1], [14, 9, 1], [2, 14, -1], [15, 15, 1], [4, 19, -1], [13, 20, 1], [5, 25, -1], [12, 26, 1], [8, 11, 1], [9, 17, -1]].forEach(([x, y, d]) => {
    b.set(x, y, "k").set(x + d, y, "k").set(x + d * 2, y, "b").set(x + d, y - 1, "k").set(x, y - 1, "e");
  });
  addSkin("epic", {
    name: "Raven Flock",
    pitch: "No body at all: a tall huddle of black ravens stacked into the shape of a player, red eyes everywhere. One keeps fluttering.",
    rows: b.rows(),
    pal: { k: "#231d33", K: "#4a4060", b: "#a49db0", e: "#ff3b4d" },
    over(c, left, top, t) {
      if (reduced) return;
      const up = Math.floor(t * 8) % 2;
      // a raven on top of the flock keeps flapping
      R(c, left + 8, top - 1, 2, 1, "#231d33");
      R(c, left + (up ? 6 : 7), top - 2 - up, 1, 1, "#4a4060"); R(c, left + (up ? 11 : 10), top - 2 - up, 1, 1, "#4a4060");
      R(c, left + 7, top - 1 - up, 1, 1, "#231d33"); R(c, left + 10, top - 1 - up, 1, 1, "#231d33");
    },
  });
}

// ---------- 11 Goblin ----------
{
  const b = B(18, 22);
  b.ell(8.5, 6, 4, 3.5, "g");
  b.pts([[0, 3], [1, 3], [1, 4], [2, 4], [3, 4], [2, 5], [3, 5], [4, 5], [3, 6], [4, 6]], "g").pts([[1, 4], [2, 5], [3, 6]], "G");
  b.pts([[17, 3], [16, 3], [16, 4], [15, 4], [14, 4], [15, 5], [14, 5], [13, 5], [14, 6], [13, 6]], "g").pts([[16, 4], [15, 5], [14, 6]], "G");
  b.pts([[6, 5], [11, 5]], "e").pts([[7, 5], [10, 5]], "k").rect(6, 4, 2, 1, "G").rect(10, 4, 2, 1, "G");
  b.rect(8, 6, 2, 3, "G").rect(6, 9, 6, 1, "k").pts([[6, 9], [9, 9], [11, 9]], "t");
  b.ell(8.5, 14, 4, 4.5, "c").rect(5, 14, 8, 1, "C").pts([[7, 16], [10, 12]], "C");
  b.rect(3, 11, 2, 7, "g").rect(13, 11, 2, 7, "g").pts([[2, 18], [3, 18], [4, 18], [13, 18], [14, 18], [15, 18]], "G");
  b.rect(6, 19, 2, 1, "g").rect(10, 19, 2, 1, "g").rect(4, 20, 4, 2, "G").rect(10, 20, 4, 2, "G");
  b.pts([[15, 15], [16, 16], [16, 17], [15, 18]], "l");
  addSkin("epic", {
    name: "Goblin",
    pitch: "A short, hunched goblin with enormous ears that stretch the full width of the space, a big nose, a crooked grin and a burlap sack for clothes.",
    rows: b.rows(),
    pal: { g: "#7aa04a", G: "#557a32", e: "#ffd84a", k: "#1a1024", t: "#f3e9d2", c: "#8a6a3e", C: "#5a3a20", l: "#c9a24a" },
    animPal: (t) => (blinkAt(t, 2.8) ? { e: "#557a32", k: "#557a32" } : {}),
  });
}

// ---------- 12 Flytrap Monster ----------
{
  const b = B(18, 28);
  b.rect(3, 20, 12, 2, "p").rect(4, 22, 10, 6, "p").rect(13, 20, 1, 8, "P").rect(3, 20, 12, 1, "s");
  b.rect(8, 11, 2, 9, "g").set(9, 13, "G").set(8, 16, "G");
  b.lines(1, 12, ["..gg....", ".gggg...", "ggGgg...", ".gggg..."]).lines(11, 14, ["...gg...", "..gggg..", ".ggGgg..", "..gggg.."]);
  b.pts([[7, 15], [6, 14], [10, 17], [11, 16]], "g");
  addSkin("epic", {
    name: "Flytrap Monster",
    pitch: "A giant carnivorous plant in a clay pot, its spiky jaws snapping open and shut above a pair of leaves.",
    rows: b.rows(),
    pal: { p: "#c4550a", P: "#8f3c06", s: "#3a2614", g: "#4a9a52", G: "#2f6b3a" },
    over(c, left, top, t) {
      const shut = !reduced && Math.floor(t * 1.5) % 3 === 2;
      const pal = { g: "#4a9a52", G: "#2f6b3a", r: "#c42a3e", t: "#e8f5d0" };
      const open = [
        ".t.t.t.t.t.t.",
        "ggggggggggggg",
        ".gggggggggggg",
        "..rrrrrrrrrr.",
        "..r........r.",
        "..rrrrrrrrrr.",
        ".gggggggggggg",
        "ggggggggggggg",
        ".t.t.t.t.t.t.",
      ];
      const closed = [
        ".............",
        ".............",
        ".gggggggggggg",
        "ggggggggggggg",
        "t.t.t.t.t.t.t",
        "ggggggggggggg",
        ".gggggggggggg",
        ".............",
        ".............",
      ];
      spr(c, shut ? closed : open, pal, left + 2, top + 2);
    },
  });
}

// ---------- 13 Haunted Grandfather Clock ----------
{
  const b = B(18, 28);
  b.ell(8.5, 3, 5, 3, "w").rect(3, 3, 12, 22, "w").rect(13, 3, 2, 22, "W").rect(3, 3, 1, 22, "H");
  b.ell(8.5, 7, 3.5, 3.5, "f").pts([[8, 4], [9, 4], [5, 7], [12, 7], [8, 10], [9, 10]], "k");
  b.pts([[7, 7], [10, 7]], "e").rect(7, 9, 4, 1, "k");
  b.rect(5, 12, 8, 11, "g").rect(5, 12, 8, 1, "W").rect(5, 22, 8, 1, "W");
  b.rect(2, 25, 14, 1, "W").pts([[3, 26], [4, 27], [5, 26], [12, 26], [13, 27], [14, 26]], "W");
  b.pts([[8, 0], [9, 0]], "H");
  addSkin("epic", {
    name: "Haunted Grandfather Clock",
    pitch: "A tall old grandfather clock whose face is an actual face, red eyes and a grimace, with clawed wooden feet and a pendulum swinging behind the glass.",
    rows: b.rows(),
    pal: { w: "#6b3a24", W: "#4a2414", H: "#8a5236", f: "#f3e9d2", k: "#1a1024", e: "#ff3b4d", g: "#1a1530" },
    over(c, left, top, t) {
      const sw = reduced ? 0 : Math.sin(t * 2.6) * 2.2;
      for (let k = 0; k < 7; k++) R(c, left + 8.5 + sw * (k / 7), top + 13 + k, 1, 1, "#c9a24a");
      R(c, left + 7.5 + sw, top + 19, 3, 3, "#ffc53a");
      R(c, left + 8 + sw, top + 20, 1, 1, "#fff1b0");
    },
  });
}

// ---------- 14 Creature in a Jar ----------
{
  const b = B(18, 28);
  b.rect(4, 0, 10, 3, "m").rect(4, 2, 10, 1, "M").rect(3, 3, 12, 1, "g");
  b.ell(8.5, 15, 7, 11.5, "l").rect(2, 4, 1, 22, "g").rect(15, 4, 1, 22, "G").rect(3, 27, 12, 1, "G");
  b.rect(3, 4, 12, 2, "L");
  b.ell(8.5, 12, 3.5, 3, "c").ell(8.5, 12, 1.5, 1.5, "w").set(8, 12, "k").set(9, 11, "e");
  b.pts([[6, 10], [7, 9], [10, 9], [11, 10]], "C");
  for (const [x, dir] of [[6, -1], [8, 0], [10, 1], [11, 1], [7, 0]]) for (let k = 0; k < 9; k++) b.set(x + Math.round(Math.sin(k * 0.8 + x) * 1.2) + (dir * k) / 4, 15 + k, k % 3 === 2 ? "C" : "c");
  b.pts([[3, 8], [3, 9], [3, 10]], "w");
  addSkin("epic", {
    name: "Creature in a Jar",
    pitch: "A specimen jar of murky green brine with a pickled one-eyed thing floating inside, tentacles drifting. Bubbles rise past it.",
    rows: b.rows(),
    pal: { m: "#8d84a8", M: "#5a5078", g: "#b8feff", G: "#7ab8c8", l: "#2f6b3a", L: "#4a9a52", c: "#c9a0b0", C: "#9a7080", w: "#ffffff", e: "#ffd84a", k: "#1a1024" },
    over(c, left, top, t) {
      for (const [x, sp] of [[5, 0], [12, 0.4], [10, 0.75]]) {
        const ph = (t * 0.5 + sp) % 1;
        R(c, left + x, top + 25 - Math.round(ph * 20), 1, 1, "#b7ff9e");
      }
    },
  });
}

// ---------- 15 Wendigo ----------
{
  const b = B(18, 28);
  b.pts([[7, 6], [6, 5], [5, 4], [4, 3], [3, 2], [2, 1], [1, 0], [4, 1], [5, 0], [3, 4], [2, 4], [1, 3], [0, 3]], "a").pts([[2, 2], [5, 2], [6, 3]], "A").mirror();
  b.rect(6, 6, 6, 4, "s").rect(7, 10, 4, 2, "s").rect(11, 6, 1, 4, "S").pts([[7, 7], [10, 7]], "e").pts([[8, 11], [9, 11]], "S").pts([[8, 9], [9, 9]], "k");
  b.rect(6, 12, 6, 8, "b").rect(11, 12, 1, 8, "B");
  for (let y = 13; y <= 17; y += 2) b.rect(7, y, 4, 1, "r");
  b.rect(4, 12, 2, 1, "b").rect(12, 12, 2, 1, "b").rect(3, 13, 1, 10, "b").rect(14, 13, 1, 10, "b").pts([[2, 23], [3, 23], [4, 23], [13, 23], [14, 23], [15, 23]], "s");
  b.pts([[7, 20], [7, 21], [6, 22], [6, 23], [7, 24], [7, 25], [10, 20], [10, 21], [11, 22], [11, 23], [10, 24], [10, 25]], "b").rect(5, 26, 3, 2, "B").rect(10, 26, 3, 2, "B");
  addSkin("epic", {
    name: "Wendigo",
    pitch: "A gaunt, too-tall creature with a deer skull for a head, antlers spanning the whole width, ribs showing and arms hanging past its knees.",
    rows: b.rows(),
    pal: { s: "#e8e0c8", S: "#b9ae94", a: "#8a7a5a", A: "#6b5e44", b: "#2a2433", B: "#1a1622", e: "#ff3b4d", k: "#1a1024", r: "#4a4060" },
    animPal: (t) => ({ e: Math.sin(t * 5) > 0.3 ? "#ff6b7a" : "#c42a3e" }),
  });
}

// ---------- 16 Mothman ----------
{
  const b = B(18, 28);
  b.lines(0, 3, ["...www", "wwwwww", "wpwwww", "wwRrww", "wwrrww", "wwwwpw", ".wwwww", "..wwww", "....ww", "..WWWW", ".WWWWW", ".WpWWW", "..WWWW", "...WWW", "....WW"]).mirror();
  b.rect(7, 4, 4, 20, "b").rect(6, 9, 6, 3, "f");
  b.pts([[7, 0], [6, 1], [7, 2], [10, 0], [11, 1], [10, 2]], "f").pts([[7, 3], [10, 3]], "b");
  b.rect(7, 5, 2, 2, "r").rect(9, 5, 2, 2, "r");
  b.pts([[7, 24], [7, 25], [6, 26], [6, 27], [10, 24], [10, 25], [11, 26], [11, 27]], "b");
  addSkin("epic", {
    name: "Mothman",
    pitch: "A dark, lanky moth creature with feathery antennae, huge patterned wings that fill the whole space, and two big glowing red eyes.",
    rows: b.rows(),
    pal: { w: "#5a4a6a", W: "#3a2d4a", p: "#a49db0", R: "#8f1426", r: "#ff3b4d", b: "#1a1622", f: "#8a7a9a" },
    animPal: (t) => ({ r: Math.sin(t * 3) > 0 ? "#ff6b7a" : "#e0283c" }),
  });
}

// ---------- 17 Candy Corn Monster ----------
{
  const b = B(18, 25);
  for (let y = 0; y <= 19; y++) {
    const half = 1 + y * 0.36;
    const col = y < 5 ? "w" : y < 13 ? "o" : "y";
    for (let x = Math.round(8.5 - half); x <= Math.round(8.5 + half); x++) b.set(x, y, x >= 8.5 + half - 1 ? col.toUpperCase() : col);
  }
  b.ell(6.5, 9, 1.2, 1.5, "e").ell(10.5, 9, 1.2, 1.5, "e").pts([[6, 9], [11, 9]], "p");
  b.rect(6, 12, 6, 1, "k").pts([[7, 12], [10, 12]], "e").pts([[7, 13], [8, 13], [9, 13], [10, 13]], "k");
  b.pts([[3, 14], [2, 15], [1, 14], [14, 14], [15, 15], [16, 14]], "o");
  b.rect(6, 20, 1, 3, "Y").rect(11, 20, 1, 3, "Y").rect(4, 23, 3, 2, "O").rect(11, 23, 3, 2, "O");
  addSkin("epic", {
    name: "Candy Corn Monster",
    pitch: "A giant walking piece of candy corn, white tip, orange middle, yellow bottom, with googly eyes and a sugary grin on skinny legs.",
    rows: b.rows(),
    pal: { w: "#fff6e0", W: "#d9cfb8", o: "#ff7a1a", O: "#c4550a", y: "#ffd84a", Y: "#d9a800", e: "#ffffff", p: "#1a1024", k: "#1a1024" },
    animPal: (t) => (blinkAt(t, 3) ? { e: "#ff7a1a", p: "#ff7a1a" } : {}),
  });
}

// ---------- 18 Ghost Pirate ----------
{
  const b = B(18, 28);
  b.rect(2, 3, 14, 2, "h").ell(8.5, 2, 5, 2.5, "h").pts([[1, 2], [16, 2], [1, 3], [16, 3]], "h").rect(2, 4, 14, 1, "H");
  b.pts([[8, 1], [9, 1], [8, 2], [9, 2]], "s").pts([[8, 2]], "k");
  b.ell(8.5, 7.5, 3.5, 2.5, "g").rect(6, 6, 2, 2, "k").pts([[5, 6], [12, 5], [11, 5], [10, 5]], "k").set(10, 7, "e");
  b.ell(8.5, 10.5, 3, 1.5, "G").pts([[7, 11], [9, 12], [8, 11]], "q");
  for (let y = 12; y <= 21; y++) { const half = 3.5 + (y - 12) * 0.2; b.rect(Math.round(8.5 - half), y, Math.round(half * 2) + 1, 1, "c"); }
  b.rect(8, 12, 2, 9, "C").pts([[7, 14], [7, 17], [10, 14], [10, 17]], "y");
  b.rect(3, 13, 2, 5, "c").rect(13, 13, 2, 5, "c").pts([[3, 18], [4, 18]], "g").pts([[14, 18], [15, 19], [14, 20], [13, 19]], "s");
  for (let y = 22; y <= 27; y++) { const half = 4 - (y - 22) * 0.75; b.rect(Math.round(8.5 - half + (y - 22) * 0.5), y, Math.max(1, Math.round(half * 2)), 1, y % 2 ? "w" : "g"); }
  addSkin("epic", {
    name: "Ghost Pirate",
    pitch: "The spectral captain of a sunken ship: a skull-and-crossbones tricorn, an eyepatch, a seaweed beard, a hook, and a ghostly tail instead of legs.",
    rows: b.rows(),
    pal: { h: "#1a2a3a", H: "#2a3a4a", s: "#f3efe6", k: "#0a1a2a", g: "#7ab8c8", G: "#4a8a9a", q: "#3f6b3a", e: "#b8feff", c: "#2a4a5a", C: "#1a3a4a", y: "#ffd84a", w: "#b8feff" },
    float: (t) => (reduced ? 1 : 1 + Math.round((Math.sin(t * 1.8) + 1) * 1.2)),
  });
}

// ---------- 19 Alien in a Saucer ----------
{
  const b = B(18, 26);
  b.ell(8.5, 9, 4.5, 6, "d").rect(4, 9, 10, 6, "d").set(5, 6, "D").set(5, 7, "D");
  b.ell(8.5, 8, 2.5, 3, "a").pts([[7, 8], [10, 8]], "k").pts([[7, 7], [10, 7]], "k").rect(7, 11, 4, 3, "A").pts([[6, 12], [11, 12]], "a");
  b.pts([[7, 4], [6, 3], [10, 4], [11, 3]], "A");
  b.ell(8.5, 16, 8.5, 2.5, "s").rect(0, 16, 18, 1, "H").rect(2, 18, 14, 1, "S").rect(5, 19, 8, 1, "S");
  b.pts([[2, 17], [6, 17], [11, 17], [15, 17]], "l").pts([[4, 17], [13, 17]], "m").pts([[8, 17], [9, 17]], "n");
  addSkin("epic", {
    name: "Alien in a Saucer",
    pitch: "A little green alien waving from inside the glass dome of a flying saucer as wide as the space, its rim lights chasing round and round.",
    rows: b.rows(),
    pal: { s: "#a49db0", S: "#6b6380", H: "#d8d0ec", d: "#9fd4ff", D: "#e0f4ff", a: "#7dff5a", A: "#4a9a32", k: "#1a1024", l: "#ffd84a", m: "#ff3b4d", n: "#4fb2ff" },
    float: () => 4,
    animPal: (t) => {
      const k = reduced ? 0 : Math.floor(t * 5) % 3;
      const C = ["#ffd84a", "#ff3b4d", "#4fb2ff"];
      return { l: C[k], m: C[(k + 1) % 3], n: C[(k + 2) % 3] };
    },
    under(c, left, top) { fade(c, 0.45, () => R(c, left + 4, top + 29, 10, 1, "#0b0614")); },
  });
}

// ---------- 20 Haunted Volleyball ----------
{
  const b = B(18, 18);
  b.ell(8.5, 8.5, 8.5, 8.5, (x, y) => (x + y > 22 ? "W" : "w"));
  b.pts([[3, 3], [4, 2], [5, 2], [2, 4], [2, 5]], "H");
  for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
    if (b.get(x, y) === ".") continue;
    const d1 = Math.hypot(x - 8.5, y + 7) - 12, d2 = Math.hypot(x + 7, y - 15) - 13, d3 = Math.hypot(x - 24, y - 15) - 13;
    if (Math.abs(d1) < 0.7) b.set(x, y, "b");
    if (Math.abs(d2) < 0.7) b.set(x, y, "y");
    if (Math.abs(d3) < 0.7) b.set(x, y, "g");
  }
  b.lines(4, 6, ["kk....kk", ".kkk.kk.", ".rr..rr.", ".rr..rr.", "........", "kkkkkkkk", "kwkwkwkk", ".kkkkkk."]);
  addSkin("epic", {
    name: "Haunted Volleyball",
    pitch: "A giant possessed volleyball with angry red eyes and a jagged grin, bouncing in place. The club's ball finally fights back.",
    rows: b.rows(),
    pal: { w: "#f3efe6", W: "#d9d2e6", H: "#ffffff", b: "#3d6fd1", y: "#ffcf3a", g: "#8d84a8", k: "#1a1024", r: "#ff3b4d" },
    float: (t) => (reduced ? 2 : Math.round(Math.abs(Math.sin(t * 3)) * 6)),
    under(c, left, top, t) {
      const f = reduced ? 2 : Math.round(Math.abs(Math.sin(t * 3)) * 6);
      const ground = top + 18 + f;
      fade(c, 0.5, () => R(c, left + 4 + f / 2, ground - 1, 10 - f, 1, "#0b0614"));
    },
  });
}
})();
