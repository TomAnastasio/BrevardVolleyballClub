// Draws the 100 Halloween stand-in profile pictures (10 archetypes x 10 goofy
// variants) as 24x24 pixel-art SVGs into this folder. The app only uses the
// SVG files; this script is kept so the art can be tweaked and redrawn:
//   node src/themes/halloween/avatars/generate.mjs
// Each picture is drawn from simple shapes, then a dark outline is added
// around everything that isn't background. The app shows them in a circle,
// so keep anything important inside the middle ~20px.
import { writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

const N = 24;
const OUT = "#0e0618";
const WHITE = "#f6f0ff";

function canvas() {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  const c = {
    g,
    px(x, y, col) { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = col; },
    sym(x, y, col) { c.px(x, y, col); c.px(N - 1 - x, y, col); },
    rect(x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) c.px(i, j, col); },
    symRect(x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) c.sym(i, j, col); },
    ell(cx, cy, rx, ry, col, test) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) g[y][x] = col;
      }
    },
    recolor(from, to, test) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === from && (!test || test(x, y))) g[y][x] = to;
    },
    has(x, y) { return x >= 0 && y >= 0 && x < N && y < N && g[y][x] !== null; },
    // pixel-map stamp: rows of chars, "." = skip, other chars looked up in pal
    stamp(x0, y0, rows, pal) {
      rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") c.px(x0 + i, y0 + j, pal[ch]); }));
    },
  };
  return c;
}

function outline(c) {
  const add = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (c.g[y][x] !== null) continue;
    if (c.has(x - 1, y) || c.has(x + 1, y) || c.has(x, y - 1) || c.has(x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) c.g[y][x] = OUT;
}

const STARS = [[3, 5], [20, 3], [5, 2], [18, 7], [2, 10]];
function sky(base, top = shade(base, -0.3), stars = STARS) {
  const set = new Set(stars.map(([x, y]) => `${x},${y}`));
  return (x, y) => (set.has(`${x},${y}`) ? WHITE : y < 3 ? top : base);
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function toSvg(c, bgFn) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">`;
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const col = c.g[y][x] ?? bgFn(x, y);
      let w = 1;
      while (x + w < N && (c.g[y][x + w] ?? bgFn(x + w, y)) === col) w++;
      s += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${col}"/>`;
      x += w;
    }
  }
  return s + "</svg>\n";
}

// ---------------------------------------------------------------- gags
// `a` is the face's anchors: top (first head row), eyeY, eyeX (left eye
// column; right eye mirrors it), noseY, mouthY, neckY, hw (head half-width).
const hatY = (a, h) => Math.max(0, a.top + 2 - h);
const G = {
  shades(c, a, lens = OUT, frame = OUT) {
    c.symRect(a.eyeX - 1, a.eyeY - 1, 4, 2, lens);
    c.rect(11, a.eyeY - 1, 2, 1, frame);
    c.sym(12 - a.hw, a.eyeY - 1, frame);
    c.sym(a.eyeX - 1, a.eyeY - 1, lens === OUT ? "#8a7aa8" : shade(lens, 0.6));
  },
  glasses3d(c, a) {
    c.rect(a.eyeX - 2, a.eyeY - 1, 4, 3, "#ff2a3a");
    c.rect(20 - a.eyeX, a.eyeY - 1, 4, 3, "#2ad0ff");
    c.rect(a.eyeX + 2, a.eyeY - 1, 18 - 2 * a.eyeX, 1, WHITE);
    c.sym(11 - a.hw, a.eyeY - 1, WHITE);
  },
  googly(c, a) {
    c.symRect(a.eyeX - 1, a.eyeY - 1, 3, 3, WHITE);
    c.px(a.eyeX - 1, a.eyeY + 1, OUT);
    c.px(N - a.eyeX, a.eyeY - 1, OUT);
  },
  crossEyed(c, a) {
    c.symRect(a.eyeX - 1, a.eyeY - 1, 3, 3, WHITE);
    c.sym(a.eyeX + 1, a.eyeY, OUT);
  },
  dizzy(c, a) {
    for (const x0 of [a.eyeX - 1, 22 - a.eyeX]) c.stamp(x0, a.eyeY - 1, ["wkw", "kwk", "wkw"], { w: WHITE, k: OUT });
  },
  heartEyes(c, a) {
    for (const x0 of [a.eyeX - 1, 22 - a.eyeX]) c.stamp(x0, a.eyeY - 1, ["r.r", "rrr", ".r."], { r: "#ff2a5a" });
  },
  sleepy(c, a) {
    c.symRect(a.eyeX - 1, a.eyeY - 1, 3, 3, a.skin);
    c.symRect(a.eyeX - 1, a.eyeY, 3, 1, OUT);
    c.stamp(17, 1, ["zzz", "..z", ".z.", "zzz"], { z: WHITE });
  },
  cyclops(c, a, iris = "#7dff5a") {
    c.symRect(a.eyeX - 1, a.eyeY - 1, 3, 3, a.skin);
    c.ell(12, a.eyeY + 0.5, 3, 2.5, WHITE);
    c.rect(11, a.eyeY - 1, 2, 3, iris);
    c.px(11, a.eyeY, OUT); c.px(12, a.eyeY, OUT);
  },
  tongue(c, a, x = 12) {
    c.rect(x - 1, a.mouthY + 1, 2, 2, "#ff6fa0");
    c.px(x - 1, a.mouthY + 2, "#e0407a");
  },
  bigTongue(c, a) {
    c.rect(10, a.mouthY + 1, 4, 3, "#ff6fa0");
    c.rect(11, a.mouthY + 2, 1, 2, "#e0407a");
  },
  mustache(c, a, col = "#3a2010") {
    c.stamp(7, a.mouthY - 1, ["m........m", "mmmm..mmmm", ".mmmmmmmm."], { m: col });
  },
  clownNose(c, a) { c.rect(11, a.noseY, 2, 2, "#ff2a3a"); c.px(11, a.noseY, "#ff9aa8"); },
  zincNose(c, a) { c.rect(11, a.noseY, 2, 2, WHITE); },
  blush(c, a, col = "#ff8fb0") { c.sym(a.eyeX - 2, a.eyeY + 2, col); c.sym(a.eyeX - 1, a.eyeY + 2, col); },
  lipstick(c, a) { c.rect(10, a.mouthY, 4, 1, "#ff2a5a"); c.rect(11, a.mouthY + 1, 2, 1, "#c41e3a"); },
  braces(c, a) { c.rect(9, a.mouthY, 6, 1, WHITE); c.px(10, a.mouthY, "#8a8aa0"); c.px(12, a.mouthY, "#8a8aa0"); c.px(14, a.mouthY, "#8a8aa0"); },
  goldTooth(c, a) { c.px(13, a.mouthY, "#ffd84a"); },
  gumBubble(c, a) { c.ell(12, a.mouthY + 2.5, 3, 3, "#ff8fd0"); c.px(11, a.mouthY + 1, "#ffd0ee"); },
  monocle(c, a) {
    const x = N - 1 - a.eyeX;
    c.stamp(x - 2, a.eyeY - 2, [".gg.", "g..g", "g..g", ".gg."].map((r) => r + "."), { g: "#ffd84a" });
    c.px(x + 1, a.eyeY + 2, "#ffd84a"); c.px(x + 2, a.eyeY + 3, "#ffd84a"); c.px(x + 2, a.eyeY + 4, "#ffd84a");
  },
  blackEye(c, a) {
        c.rect(N - a.eyeX - 2, a.eyeY - 1, 4, 3, "#6a3aa8"); c.px(N - a.eyeX - 1, a.eyeY, OUT);
    c.stamp(a.eyeX - 3, a.top + 2, ["b.b", ".b.", "b.b"], { b: "#ffd0a0" });
    c.rect(a.eyeX - 3, a.top + 3, 3, 1, "#e8c090"); c.px(a.eyeX - 2, a.top + 2, "#e8c090"); c.px(a.eyeX - 2, a.top + 4, "#e8c090");
  },
  earring(c, a, col = "#ffd84a") { c.px(12 + a.hw, a.eyeY + 4, col); c.px(12 + a.hw, a.eyeY + 5, col); },
  bowtie(c, a, col = "#ff2a5a") { c.stamp(9, a.neckY, ["bb..bb", "bbkkbb", "bb..bb"], { b: col, k: shade(col, -0.3) }); },
  bow(c, a, col = "#ff4fa0", x = 14, y = a.top - 1) { c.stamp(x, y, ["bb.bb", "bbbbb", "bb.bb"], { b: col }); c.px(x + 2, y + 1, shade(col, -0.3)); },
  flower(c, a, x = 15, y = a.top) { c.stamp(x, y, [".p.", "pyp", ".p."], { p: "#ff8fd0", y: "#ffd84a" }); },
  flowerCrown(c, a) {
    const cols = ["#ff8fd0", "#ffd84a", "#9b4dff", "#7dff5a", "#ff7a1a"];
    for (let i = 0; i < 5; i++) { const x = 6 + i * 3; c.rect(x, a.top + (i === 0 || i === 4 ? 1 : 0), 2, 2, cols[i]); }
  },
  headband(c, a, col = "#ff2a3a") { c.rect(12 - a.hw, a.top + 2, a.hw * 2, 2, col); c.rect(11, a.top + 2, 2, 2, WHITE); c.px(12 + a.hw - 1, a.top + 5, "#7ad0ff"); c.px(12 + a.hw - 1, a.top + 6, "#7ad0ff"); },
  bandana(c, a, col = "#c41e3a") { c.rect(12 - a.hw, a.top, a.hw * 2, 3, col); c.px(9, a.top + 1, WHITE); c.px(14, a.top + 1, WHITE); c.stamp(12 + a.hw, a.top + 1, ["bb", ".b"], { b: col }); },
  headphones(c, a, col = "#2ad0ff") {
    const y = Math.max(0, a.top - 1);
    c.rect(12 - a.hw, y, a.hw * 2, 1, col);
    c.symRect(11 - a.hw, y, 1, a.eyeY - y, col);
    c.symRect(10 - a.hw, a.eyeY, 3, 4, col);
    c.sym(10 - a.hw, a.eyeY, shade(col, 0.5));
  },
  // hats sit on `base` (a row on the head) centred at cx
  partyHat(c, a, col = "#ff4fa0", stripe = "#ffd84a", cx = 13, base = a.top + 1) {
    base = Math.max(base, 7);
    for (let i = 0; i < 6; i++) { const w = 1 + Math.floor(i * 0.9); c.rect(cx - Math.floor(w / 2) + Math.floor((5 - i) / 2), base - 5 + i, w, 1, i % 2 ? stripe : col); }
    c.rect(cx + 2, base - 7, 2, 2, "#7dff5a");
  },
  propeller(c, a) {
    c.ell(12, a.top + 2, a.hw - 0.5, 3, "#ff2a3a", (x, y) => y < a.top + 2);
    c.recolor("#ff2a3a", "#2a7aff", (x) => x % 4 < 2);
    const y = Math.max(0, a.top - 3);
    c.rect(12, y + 1, 1, a.top - y, "#a0a0b0");
    c.rect(8, y, 4, 1, "#ffd84a"); c.rect(13, y, 4, 1, "#7dff5a");
  },
  nightcap(c, a) {
    c.ell(12, a.top + 2, a.hw + 0.5, 3.5, "#5a7aff", (x, y) => y < a.top + 2);
    for (let i = 0; i < 4; i++) c.rect(15 + i, a.top - 2 + i - 1, 2, 2, i % 2 ? WHITE : "#5a7aff");
    c.rect(12 - a.hw, a.top + 1, a.hw * 2 + 1, 1, WHITE);
    c.rect(19, a.top + 2, 2, 2, WHITE);
  },
  topHat(c, a, col = "#241433", band = "#c41e3a") { const y = hatY(a, 6); c.rect(8, y, 8, 5, col); c.rect(8, y + 3, 8, 1, band); c.rect(6, y + 5, 12, 1, col); },
  chefHat(c, a) { const y = hatY(a, 6); c.ell(12, y + 2, 5, 2.5, WHITE); c.ell(9, y + 2.5, 2.5, 2.5, WHITE); c.ell(15, y + 2.5, 2.5, 2.5, WHITE); c.rect(8, y + 3, 8, 3, WHITE); c.rect(8, y + 5, 8, 1, "#d0c8e8"); },
  cowboyHat(c, a, col = "#a0642a") { const y = hatY(a, 5); c.rect(8, y, 8, 4, col); c.px(11, y, null); c.px(12, y, null); c.rect(8, y + 3, 8, 1, "#5a3418"); c.rect(3, y + 4, 18, 1, col); c.sym(3, y + 3, col); },
  viking(c, a) {
    c.ell(12, a.top + 2, a.hw + 0.5, 4, "#a0a0b8", (x, y) => y < a.top + 2);
    c.rect(12 - a.hw, a.top + 1, a.hw * 2 + 1, 1, "#ffd84a");
    c.stamp(12 - a.hw - 3, Math.max(0, a.top - 3), ["h..", "h..", "hh.", ".hh"], { h: WHITE });
    c.stamp(12 + a.hw + 1, Math.max(0, a.top - 3), ["..h", "..h", ".hh", "hh."], { h: WHITE });
  },
  crown(c, a, col = "#ffd84a") { c.stamp(8, hatY(a, 4), ["c..c..c", "cc.c.cc", "ccccccc", "crcbcrc"], { c: col, r: "#ff2a5a", b: "#2ad0ff" }); },
  witchHat(c, a, x = 7) { c.stamp(x, a.top - 6, ["...hh..", "..hhh..", "..hhh..", ".hhhhh.", ".bbbbb.", "hhhhhhhhh"], { h: "#2a1640", b: "#9b4dff" }); },
  tpRoll(c, a) { const y = hatY(a, 5); c.rect(9, y, 6, 4, WHITE); c.rect(9, y, 6, 1, "#d0c8e8"); c.rect(11, y, 2, 1, "#8a7aa8"); c.rect(15, y + 2, 1, 6, WHITE); },
  afro(c, a, col) { c.ell(12, a.top + 2, a.hw + 3.5, 5.5, col, (x, y) => y < a.top + 5 || x < 12 - a.hw || x > 11 + a.hw); },
  mohawk(c, a, col = "#ff2a8a") { for (let y = a.top - 4; y < a.top + 2; y++) c.rect(11, y, 2, 1, col); c.px(10, a.top - 1, col); c.px(13, a.top - 1, col); },
  longHair(c, a, col) { c.ell(12, a.top + 6, a.hw + 2, 9, col, (x) => x < 12 - a.hw + 1 || x > 11 + a.hw - 1); },
  bat(c, a, x = 9, y = Math.max(0, a.top - 2)) { c.stamp(x, y, ["w..b..w", "wwbbbww", ".wbbbw.", "...b..."], { w: "#6b5fa8", b: "#3a2d5c" }); c.px(x + 2, y + 1, "#ff2a3a"); c.px(x + 4, y + 1, "#ff2a3a"); },
  frog(c, a, x = 14, y = a.top - 4) { c.stamp(x, y, ["e.e.", "gggg", "gmmg", "g..g"], { e: WHITE, g: "#5ac83a", m: "#ff6fa0" }); },
  spider(c, a, x = 18) { c.rect(x, 0, 1, a.eyeY - 2, "#d0c8e8"); c.stamp(x - 2, a.eyeY - 2, ["l.s.l", ".sss.", "lsssl", ".r.r."], { l: "#1a1024", s: "#1a1024", r: "#ff2a3a" }); },
  worm(c, a) { c.stamp(15, a.top + 2, [".pp", "p.p", "p.."], { p: "#ff8fb0" }); c.px(16, a.top + 2, OUT); },
  cone(c, a) {
    for (let y = a.top - 1; y < a.neckY + 2; y++) {
      const half = Math.round(a.hw + 4 - (y - a.top + 1) * 0.35);
      for (let x = 12 - half; x < 12 + half; x++) if (!c.has(x, y)) c.px(x, y, (x + y) % 5 === 0 ? "#d0d8e8" : "#eef2fa");
    }
  },
  sparks(c) { c.stamp(1, 13, ["y.", ".y", "y."], { y: "#ffd84a" }); c.stamp(21, 13, [".y", "y.", ".y"], { y: "#ffd84a" }); },
  confetti(c) { [[3, 7, "#ff4fa0"], [20, 9, "#7dff5a"], [4, 15, "#ffd84a"], [19, 2, "#2ad0ff"], [2, 11, "#9b4dff"]].forEach(([x, y, col]) => c.px(x, y, col)); },
  volleyball(c, x = 18.5, y = 18.5) {
    c.ell(x, y, 3.5, 3.5, WHITE);
    c.ell(x, y, 3.5, 3.5, "#ffd84a", (i, j) => Math.hypot(i + 0.5 - (x - 4), j + 0.5 - (y - 4)) < 5.3);
    c.ell(x, y, 3.5, 3.5, "#2a5bd7", (i, j) => { const d = Math.hypot(i + 0.5 - (x - 4), j + 0.5 - (y - 4)); return d > 6.4 && d < 7.9; });
  },
  bandaid(c, a) { c.rect(14, a.noseY - 1, 4, 2, "#e8b090"); c.px(15, a.noseY - 1, "#c88a70"); c.px(16, a.noseY, "#c88a70"); },
  drool(c, a) { c.px(14, a.mouthY + 1, "#7ad0ff"); c.px(14, a.mouthY + 2, "#7ad0ff"); },
};

// ---------------------------------------------------------- archetypes
// Each base draws the plain character from a palette `p`, and returns the
// face anchors gags use (plus `skin`, for gags that paint over an eye).
const BASES = {
  vampire(c, p) {
    const skin = p.skin ?? "#e4def2", sh = shade(skin, -0.18), hair = p.hair ?? "#241433", cape = p.cape ?? "#1a1024", lining = p.lining ?? "#c41e3a";
    c.ell(12, 26, 11, 7, cape);
    for (let y = 13; y < 21; y++) for (let x = 2; x < 8; x++) if (x - 2 >= (20 - y) * 0.6 && x < 4 + (y - 13)) c.sym(x, y, lining);
    c.symRect(9, 19, 3, 5, p.shirt ?? "#f2eefa");
    c.symRect(11, 20, 1, 4, lining);
    c.rect(10, 16, 4, 3, sh);
    if (p.ears) { c.symRect(4, 8, 2, 2, skin); c.sym(3, 7, skin); }
    c.ell(12, 11, 6, 7, skin);
    if (!p.bald) {
      c.ell(12, 6.5, 6.6, 4, hair, (x, y) => y < 7 || x === 11 || x === 12 || ((x <= 6 || x >= 17) && y < 10));
      c.px(11, 7, hair); c.px(12, 7, hair); c.symRect(6, 9, 1, 2, hair);
    } else c.rect(9, 5, 6, 1, sh);
    c.sym(8, 9, OUT); c.sym(9, 10, OUT); c.sym(10, 10, OUT);
    c.sym(9, 11, p.eye ?? "#ff2a3a"); c.sym(10, 11, OUT);
    c.sym(11, 13, sh); c.sym(7, 13, sh);
    c.rect(9, 15, 6, 1, "#7a1022");
    if (p.buckTeeth) c.rect(11, 16, 2, 2, WHITE); else c.sym(9, 16, WHITE);
    return { skin, top: 3, eyeY: 11, eyeX: 9, noseY: 13, mouthY: 15, neckY: 17, hw: 6 };
  },
  witch(c, p) {
    const skin = p.skin ?? "#7ed957", sh = shade(skin, -0.25), hat = p.hat ?? "#2a1640", band = p.band ?? "#9b4dff";
    c.ell(12, 26, 10, 6, p.robe ?? "#4a2a6e");
    c.rect(10, 17, 4, 3, sh);
    c.ell(12, 13, 8, 7, p.hair ?? "#ff7a1a", (x, y) => y > 7 && y < 18);
    c.ell(12, 12.5, 5.5, 6, skin, (x, y) => y > 7);
    if (!p.noHat) {
      c.rect(2, 7, 20, 2, hat);
      c.ell(12, 7, 5, 6, hat, (x, y) => y < 7);
      for (let y = 0; y < 3; y++) c.rect(12 + y, y, 3, 1, hat);
      c.rect(7, 5, 10, 2, band);
      c.px(12, 5, p.buckle ?? "#ffd84a"); c.px(12, 6, p.buckle ?? "#ffd84a");
    }
    c.sym(9, 11, OUT); c.sym(9, 10, OUT); c.sym(10, 11, p.eye ?? "#ffd84a");
    c.rect(12, 12, 2, 2, sh); c.px(13, 14, sh); c.px(14, 14, sh);
    c.px(9, 14, shade(skin, -0.45));
    if (p.warts) { c.px(14, 12, shade(skin, -0.45)); c.px(8, 10, shade(skin, -0.45)); }
    c.rect(10, 16, 4, 1, shade(skin, -0.6)); c.px(14, 15, shade(skin, -0.6));
    return { skin, top: 8, eyeY: 11, eyeX: 9, noseY: 12, mouthY: 16, neckY: 18, hw: 5 };
  },
  zombie(c, p) {
    const skin = p.skin ?? "#9cbf7a", sh = shade(skin, -0.25), shirt = p.shirt ?? "#5a6a9a", hair = p.hair ?? "#5a3a1e";
    c.ell(12, 26, 10, 6, shirt);
    const rip = shade(shirt, -0.35);
    c.px(8, 21, rip); c.px(9, 22, rip); c.px(15, 21, rip); c.px(14, 22, rip); c.px(12, 20, rip);
    c.rect(10, 16, 4, 3, sh);
    c.ell(12, 11, 6, 7, skin);
    if (!p.bald) {
      c.ell(12, 6, 6.2, 3.2, hair, (x, y) => y < 7);
      c.px(7, 7, hair); c.px(9, 7, hair); c.px(15, 7, hair); c.px(16, 7, hair); c.px(10, 2, hair); c.px(14, 2, hair);
    }
    if (p.bigBrain) { c.ell(12, 5, 5, 3, "#ff8fb0", (x, y) => y < 7); c.recolor("#ff8fb0", "#e05a88", (x, y) => (x + y) % 3 === 0); }
    else if (!p.bald) { c.rect(13, 4, 3, 2, "#ff8fb0"); c.px(14, 4, "#e05a88"); }
    c.rect(8, 9, 3, 3, "#f2f0d8"); c.px(9, 10, OUT);
    c.rect(14, 10, 2, 2, "#f2f0d8"); c.px(14, 10, OUT);
    c.rect(8, 8, 3, 1, sh);
    const st = "#4a3a2a";
    c.rect(15, 12, 1, 4, st); c.px(14, 13, st); c.px(16, 13, st); c.px(14, 15, st); c.px(16, 15, st);
    c.rect(9, 15, 4, 1, "#3a2020"); c.px(10, 15, "#f2f0d8"); c.px(9, 14, "#3a2020");
    c.px(7, 12, sh); c.px(7, 13, sh);
    return { skin: skin, top: 3, eyeY: 10, eyeX: 9, noseY: 12, mouthY: 15, neckY: 17, hw: 6 };
  },
  ghost(c, p) {
    const w = p.sheet ?? "#f4f1ff", sh = p.sheetShade ?? shade(w, -0.22);
    c.ell(12, 10, 7, 8, w);
    c.rect(5, 10, 14, 10, w);
    for (let x = 5; x < 19; x++) c.px(x, 20, x % 4 < 2 ? w : null);
    c.rect(3, 13, 2, 3, w); c.rect(19, 12, 2, 3, w); c.px(2, 13, w); c.px(21, 12, w);
    if (p.dots) c.recolor(w, p.dots, (x, y) => (x * 3 + y * 5) % 7 === 0);
    if (p.stripes) c.recolor(w, p.stripes, (x, y) => y % 3 === 0);
    c.recolor(w, sh, (x, y) => (x >= 17 && y > 6) || y >= 19);
    if (p.kidEyes) {
      c.rect(8, 8, 2, 2, OUT); c.rect(14, 8, 2, 2, OUT);
      c.px(9, 8, "#ffd0a0"); c.px(15, 8, "#ffd0a0"); c.px(8, 9, "#5a3418"); c.px(14, 9, "#5a3418");
      c.rect(10, 20, 2, 2, "#ff2a3a"); c.rect(13, 20, 2, 2, "#ff2a3a"); c.px(10, 21, WHITE); c.px(13, 21, WHITE);
    } else {
      c.rect(8, 8, 2, 3, OUT); c.rect(14, 8, 2, 3, OUT);
      c.px(8, 8, "#6b5fa8"); c.px(14, 8, "#6b5fa8");
    }
    if (!p.noMouth) { c.rect(11, 13, 2, 3, OUT); c.px(12, 13, "#3a2d5c"); }
    c.sym(7, 12, p.cheek ?? "#ffb3cf");
    return { skin: w, top: 2, eyeY: 9, eyeX: 9, noseY: 11, mouthY: 14, neckY: 17, hw: 6 };
  },
  skeleton(c, p) {
    const bone = p.bone ?? "#ece6d6", sh = shade(bone, -0.22), hood = p.hood ?? "#3a2d5c";
    c.ell(12, 26, 11, 7, hood);
    if (!p.noHood) c.ell(12, 11, 9, 10, hood, (x, y) => y < 18);
    else { c.rect(11, 15, 2, 6, sh); c.rect(9, 19, 6, 1, bone); c.rect(8, 21, 8, 1, bone); }
    c.rect(11, 20, 2, 4, p.cord ?? "#6b5fa8");
    c.ell(12, 10, 6, 6, bone);
    c.rect(8, 14, 8, 3, bone);
    c.recolor(bone, sh, (x) => x >= 16 || x <= 6);
    c.ell(9.5, 10.5, 2, 2, OUT); c.ell(14.5, 10.5, 2, 2, OUT);
    c.px(9, 10, p.glow ?? "#ff7a1a"); c.px(14, 10, p.glow ?? "#ff7a1a");
    c.px(11, 13, OUT); c.px(12, 13, OUT);
    c.rect(9, 15, 6, 1, OUT);
    c.px(10, 16, OUT); c.px(12, 16, OUT); c.px(14, 16, OUT);
    if (p.gaps) { c.px(11, 16, OUT); c.px(13, 15, bone); }
    c.px(9, 14, sh);
    c.rect(10, 17, 4, 1, bone);
    return { skin: bone, top: 4, eyeY: 10, eyeX: 9, noseY: 13, mouthY: 15, neckY: 18, hw: 6 };
  },
  werewolf(c, p) {
    const fur = p.fur ?? "#8a5530", dark = p.dark ?? shade(fur, -0.35), snout = p.snout ?? "#d4a878";
    c.ell(12, 26, 11, 6, p.shirt ?? "#7a2a2a");
    c.ell(12, 15, 9, 6, dark);
    for (let x = 3; x < 21; x += 2) c.px(x, 20, dark);
    for (let y = 1; y < 7; y++) c.symRect(5 + Math.floor(y / 2), y, Math.min(y, 3), 1, fur);
    c.sym(7, 4, "#e8a0a0"); c.sym(7, 5, "#e8a0a0");
    c.ell(12, 11, 6.5, 6, fur);
    c.ell(12, 15, 3.5, 3, snout);
    c.rect(11, 12, 2, 2, "#2a1408");
    c.rect(10, 17, 4, 1, "#3a1010");
    c.px(10, 16, WHITE); c.px(13, 16, WHITE);
    c.sym(8, 9, OUT); c.sym(9, 9, OUT);
    c.sym(8, 10, p.eye ?? "#ffd84a"); c.sym(9, 10, OUT);
    c.sym(7, 13, dark); c.sym(6, 12, dark);
    return { skin: fur, top: 5, eyeY: 10, eyeX: 9, noseY: 12, mouthY: 17, neckY: 19, hw: 6 };
  },
  mummy(c, p) {
    const b = p.wrap ?? "#e8dcc0", s = shade(b, -0.22);
    c.ell(12, 26, 10, 6, b);
    c.rect(10, 16, 4, 3, b);
    c.ell(12, 11, 6, 7, b);
    c.recolor(b, s, (x, y) => (y * 2 + Math.floor(x / 4)) % 5 === 0);
    c.rect(7, 10, 10, 2, "#2a1a10");
    c.px(9, 10, p.glow ?? "#7dff5a"); c.px(9, 11, shade(p.glow ?? "#7dff5a", -0.3));
    c.px(15, 11, p.glow ?? "#7dff5a");
    c.rect(13, 10, 2, 1, b);
    if (p.flap) { c.px(18, 15, b); c.px(19, 16, b); c.px(20, 16, s); c.px(21, 17, b); }
    return { skin: b, top: 4, eyeY: 10, eyeX: 9, noseY: 12, mouthY: 14, neckY: 17, hw: 6 };
  },
  pumpkin(c, p) {
    const o = p.skin ?? "#ff7a1a", d = p.rib ?? shade(o, -0.2), glow = p.glow ?? "#ffd84a", hood = p.hood ?? "#1f1338";
    c.ell(12, 26, 11, 6, hood);
    c.ell(12, 12, 9, 7.5, o);
    c.recolor(o, d, (x) => x === 7 || x === 16 || x === 4 || x === 19);
    if (p.ribs2) c.recolor(o, p.ribs2, (x) => x === 10 || x === 13);
    c.rect(11, 2, 2, 3, p.stem ?? "#4a7a28"); c.px(13, 2, p.stem ?? "#4a7a28"); c.rect(13, 3, 2, 1, "#7ed957");
    if (p.eyes !== "none") { c.rect(7, 10, 4, 1, glow); c.rect(8, 9, 2, 1, glow); c.rect(13, 10, 4, 1, glow); c.rect(14, 9, 2, 1, glow); }
    c.px(11, 12, glow); c.px(12, 12, glow);
    if (p.mouth === "o") c.ell(12, 15.5, 2, 2, glow);
    else if (p.mouth === "smirk") { c.rect(9, 15, 7, 1, glow); c.rect(15, 14, 2, 1, glow); c.rect(10, 16, 4, 1, glow); }
    else {
      c.px(6, 13, glow); c.px(17, 13, glow);
      c.rect(6, 14, 12, 1, glow); c.px(9, 14, o); c.px(14, 14, o);
      c.rect(7, 15, 10, 1, glow); c.rect(8, 16, 8, 1, glow); c.rect(11, 16, 2, 1, o);
    }
    return { skin: o, top: 5, eyeY: 10, eyeX: 9, noseY: 12, mouthY: 15, neckY: 19, hw: 7 };
  },
  frankenstein(c, p) {
    const g = p.skin ?? "#6fbf6a", sh = shade(g, -0.25), hair = p.hair ?? "#1a1024";
    c.ell(12, 26, 11, 6, p.jacket ?? "#3a3a46");
    c.symRect(9, 20, 2, 4, shade(p.jacket ?? "#3a3a46", -0.35));
    c.rect(9, 16, 6, 4, sh);
    c.symRect(6, 17, 3, 2, "#a0a0b0"); c.sym(6, 17, "#d0d0e0");
    c.rect(6, 4, 12, 13, g);
    if (!p.noHair) { c.rect(6, 3, 12, 4, hair); c.px(8, 7, hair); c.px(11, 7, hair); c.px(15, 7, hair); }
    const st = shade(g, -0.6);
    c.rect(9, 8, 5, 1, st); c.px(10, 7, st); c.px(12, 9, st);
    c.rect(7, 10, 10, 1, sh);
    c.sym(9, 11, OUT); c.sym(8, 11, "#f2f0d8");
    c.rect(11, 12, 2, 2, sh);
    c.rect(9, 14, 6, 1, st);
    c.recolor(g, sh, (x) => x === 17);
    return { skin: g, top: 3, eyeY: 11, eyeX: 8, noseY: 12, mouthY: 14, neckY: 17, hw: 6 };
  },
  cat(c, p) {
    const f = p.fur ?? "#2a1f3d", eye = p.eye ?? "#7dff5a";
    c.ell(12, 26, 10, 6, f);
    c.rect(8, 19, 8, 1, p.collar ?? "#c41e3a"); c.px(12, 20, "#ffd84a");
    for (let y = 3; y < 9; y++) c.symRect(5, y, y - 2, 1, f);
    c.sym(6, 6, "#ff8fb0"); c.sym(6, 7, "#ff8fb0"); c.sym(7, 7, "#ff8fb0");
    c.ell(12, 12.5, 7, 6.5, f);
    if (p.patch) c.ell(8, 10, 3, 3, p.patch, (x, y) => c.g[y][x] === f);
    if (p.patch2) c.ell(16, 15, 3, 2.5, p.patch2, (x, y) => c.g[y][x] === f);
    if (p.stripes) c.recolor(f, p.stripes, (x, y) => y < 10 && x % 3 === 0);
    if (p.mask) c.ell(12, 12, 4, 3.5, p.mask, (x, y) => c.g[y][x] === f);
    c.symRect(8, 10, 3, 3, eye);
    c.sym(9, 10, OUT); c.sym(9, 11, OUT); c.sym(9, 12, OUT);
    c.sym(8, 10, shade(eye, 0.6));
    c.px(11, 14, "#ff8fb0"); c.px(12, 14, "#ff8fb0");
    const m = p.mouth ?? "#45376a";
    c.px(11, 15, m); c.px(12, 15, m); c.sym(10, 16, m);
    c.symRect(2, 14, 4, 1, "#a99bc9"); c.symRect(3, 16, 3, 1, "#a99bc9");
    return { skin: f, top: 6, eyeY: 11, eyeX: 9, noseY: 14, mouthY: 15, neckY: 19, hw: 6 };
  },
};

// background colours to rotate through, so neighbours in a list differ
const BG = { night: "#2a1a4a", teal: "#1f2e48", swamp: "#22303a", navy: "#141a2e", plum: "#2e2240", rust: "#5a2a14", wine: "#3a1230", forest: "#163024", dusk: "#3a2a5a", orange: "#7a3a10" };

// 10 archetypes x 10 variants. `p` tweaks the base; `gags` are drawn on top
// in order: [name, ...args]; `bg` picks a background. #1 of each is the
// plain original.
const V = {
  vampire: [
    { bg: "night" },
    { p: { skin: "#ff9c8a" }, gags: [["shades"], ["zincNose"], ["volleyball"]], bg: "teal" },
    { p: { bald: true, ears: true, skin: "#c4d0b4", cape: "#2a2a30", lining: "#5a5a60", buckTeeth: true }, bg: "swamp" },
    { p: { cape: "#3a1060", lining: "#ff4fa0" }, gags: [["afro", "#ff4fa0"], ["shades", "#ffd84a"], ["confetti"]], bg: "dusk" },
    { p: { lining: "#2a5bd7", cape: "#141a3a" }, gags: [["topHat"], ["monocle"], ["mustache", "#241433"]], bg: "wine" },
    { gags: [["googly"], ["braces"], ["partyHat", "#7dff5a", "#ff4fa0"]], bg: "plum" },
    { p: { skin: "#f0d8ff" }, gags: [["bat"], ["tongue"], ["blush"]], bg: "night" },
    { p: { hair: "#e8e0ff", lining: "#9b4dff" }, gags: [["longHair", "#e8e0ff"], ["lipstick"], ["bow", "#ff2a5a"]], bg: "wine" },
    { p: { skin: "#9ab4ff", hair: "#ff2a3a" }, gags: [["mohawk", "#ff2a3a"], ["dizzy"], ["earring"]], bg: "navy" },
    { gags: [["nightcap"], ["sleepy"], ["drool"]], bg: "dusk" },
  ],
  witch: [
    { bg: "teal" },
    { p: { skin: "#b07ad9", hair: "#7dff5a", warts: true }, gags: [["googly"]], bg: "forest" },
    { p: { skin: "#ffd2b0", hair: "#2a7aff", band: "#ff7a1a" }, gags: [["shades", "#ff4fa0"], ["flower", 6, 4]], bg: "orange" },
    { p: { hair: "#ff8fd0", hat: "#a02a7a", band: "#ffd84a" }, gags: [["gumBubble"]], bg: "plum" },
    { p: { skin: "#5ac8b0", hair: "#f6f0ff" }, gags: [["frog", 3, 3]], bg: "swamp" },
    { p: { hair: "#c41e3a" }, gags: [["volleyball", 18.5, 19]], bg: "night" },
    { p: { hat: "#163a24", band: "#7dff5a", hair: "#9b4dff" }, gags: [["headphones", "#ff7a1a"]], bg: "wine" },
    { p: { skin: "#ffe04a", hair: "#2a1640", hat: "#ff7a1a", band: "#2a1640" }, gags: [["crossEyed"], ["bigTongue"]], bg: "navy" },
    { p: { hair: "#a0a0b8" }, gags: [["mustache", "#a0a0b8"], ["monocle"]], bg: "dusk" },
    { p: { skin: "#ff9ab0", hair: "#ffd84a", hat: "#2a5bd7", band: "#ff4fa0" }, gags: [["heartEyes"], ["spider", 4]], bg: "teal" },
  ],
  zombie: [
    { bg: "swamp" },
    { p: { skin: "#8ab4e0", shirt: "#c41e3a" }, gags: [["propeller"]], bg: "night" },
    { p: { shirt: "#3a7a3a" }, gags: [["tongue", 11], ["spider", 18]], bg: "plum" },
    { p: { shirt: "#ff7a1a", hair: "#ffd84a" }, gags: [["headband", "#2a5bd7"], ["volleyball"]], bg: "navy" },
    { p: { bald: true, skin: "#b0b8a0", shirt: "#1a1024" }, gags: [["mohawk", "#7dff5a"], ["earring", "#c0c0d0"]], bg: "wine" },
    { p: { skin: "#d8c070", shirt: "#9b4dff" }, gags: [["partyHat", "#2ad0ff", "#ff4fa0", 11], ["confetti"]], bg: "dusk" },
    { p: { shirt: "#2a2a30" }, gags: [["glasses3d"]], bg: "teal" },
    { p: { bald: true, shirt: WHITE }, gags: [["chefHat"], ["mustache", "#5a3a1e"]], bg: "rust" },
    { p: { bald: true, bigBrain: true, skin: "#c0a0d8" }, gags: [["heartEyes"]], bg: "forest" },
    { p: { shirt: "#a0642a" }, gags: [["cowboyHat", "#7a4a20"]], bg: "orange" },
  ],
  ghost: [
    { bg: "night" },
    { p: { sheet: "#c8ffe8", cheek: "#7dff5a" }, gags: [["shades"], ["tongue", 12]], bg: "navy" },
    { p: { sheet: "#fff4b0", dots: "#ff4fa0" }, gags: [["partyHat", "#2ad0ff", "#ffd84a", 13, 3]], bg: "plum" },
    { p: { kidEyes: true, noMouth: true, sheet: "#fff8ee" }, bg: "rust" },
    { p: { sheet: "#ffd0e8" }, gags: [["googly"], ["clownNose"]], bg: "teal" },
    { gags: [["topHat", "#241433", "#ffd84a"], ["monocle"], ["bowtie", "#1a1024"]], bg: "wine" },
    { p: { sheet: "#d0c0ff" }, gags: [["headphones", "#ff4fa0"]], bg: "forest" },
    { gags: [["headband", "#ff7a1a"], ["volleyball", 19, 17]], bg: "swamp" },
    { p: { sheet: "#a0d8ff", noMouth: true }, gags: [["cyclops", "#2a5bd7"]], bg: "dusk" },
    { p: { sheet: "#e8e8e8" }, gags: [["viking"]], bg: "navy" },
  ],
  skeleton: [
    { bg: "navy" },
    { p: { noHood: true, hood: "#5a3418", cord: "#a0642a" }, gags: [["cowboyHat"], ["mustache", "#1a1024"]], bg: "orange" },
    { p: { bone: "#ffd84a", hood: "#7a1a3a", glow: "#ff2a3a" }, gags: [["crown", "#f6f0ff"]], bg: "wine" },
    { p: { hood: "#ff8fd0", glow: "#ff2a5a", cord: "#ffd84a" }, gags: [["flowerCrown"]], bg: "plum" },
    { p: { hood: "#1a1024", cord: "#ffd84a" }, gags: [["shades"], ["goldTooth"], ["headphones", "#ffd84a"]], bg: "dusk" },
    { p: { hood: "#2a7aff" }, gags: [["googly"], ["propeller"]], bg: "teal" },
    { p: { noHood: true, hood: "#ff7a1a", cord: WHITE }, gags: [["headband", "#2a5bd7"], ["volleyball"]], bg: "night" },
    { p: { hood: "#5a3418", glow: "#2ad0ff" }, gags: [["viking"]], bg: "forest" },
    { p: { hood: "#ffd84a", cord: "#ff2a3a" }, gags: [["clownNose"], ["partyHat", "#ff2a3a", WHITE, 12, 3]], bg: "navy" },
    { p: { glow: "#7dff5a", gaps: true, hood: "#3a5a3a" }, gags: [["bandaid"]], bg: "swamp" },
  ],
  werewolf: [
    { bg: "night" },
    { p: { fur: "#8a8a9a", snout: "#d0d0dc" }, gags: [["bigTongue"], ["crossEyed"]], bg: "teal" },
    { p: { fur: "#f0eadc", dark: "#c8c0b0", snout: "#fff8f0", eye: "#2ad0ff" }, gags: [["bow", "#ff4fa0", 14, 3]], bg: "plum" },
    { p: { fur: "#7a4ab0", snout: "#c8a0e8" }, gags: [["bandana", "#ff2a3a"], ["shades"]], bg: "orange" },
    { p: { fur: "#a0642a" }, gags: [["partyHat", "#ffd84a", "#ff2a5a", 12, 6], ["tongue", 12]], bg: "dusk" },
    { p: { fur: "#ff7a1a", snout: "#ffd8a8", dark: "#b04a0a" }, gags: [["googly"]], bg: "forest" },
    { p: { shirt: WHITE }, gags: [["chefHat"]], bg: "wine" },
    { p: { fur: "#5a4030", shirt: "#2a5bd7" }, gags: [["headband", "#ffd84a"], ["volleyball"]], bg: "navy" },
    { p: { fur: "#3a3040", snout: "#8a7a90", shirt: "#1a1024" }, gags: [["topHat", "#1a1024", "#9b4dff"], ["monocle"]], bg: "dusk" },
    { p: { fur: "#c89a60" }, gags: [["cone"]], bg: "swamp" },
  ],
  mummy: [
    { bg: "plum" },
    { gags: [["partyHat", "#ff4fa0", "#2ad0ff", 13, 5], ["confetti"]], bg: "night" },
    { p: { wrap: "#ffc8e0", glow: "#ff4fa0" }, gags: [["bow", "#ff2a5a", 14, 3]], bg: "wine" },
    { gags: [["shades"], ["volleyball"]], bg: "orange" },
    { p: { glow: "#ffd84a" }, gags: [["cyclops", "#ff7a1a"]], bg: "navy" },
    { p: { wrap: "#d8e8ff" }, gags: [["googly"]], bg: "teal" },
    { p: { wrap: "#e0d0a0", glow: "#2ad0ff" }, gags: [["headphones", "#7dff5a"]], bg: "dusk" },
    { gags: [["cowboyHat", "#5a3418"]], bg: "rust" },
    { p: { flap: true }, gags: [["tpRoll"]], bg: "forest" },
    { p: { wrap: "#c8e0b0", glow: "#ff2a3a" }, gags: [["clownNose"], ["mustache", "#5a3418"]], bg: "swamp" },
  ],
  pumpkin: [
    { bg: "night" },
    { p: { skin: "#eae6f2", rib: "#c0b8d8", glow: "#2ad0ff", stem: "#5a5a3a" }, bg: "navy" },
    { p: { skin: "#7ac83a", rib: "#4a9a2a", mouth: "o" }, gags: [["googly"]], bg: "plum" },
    { p: { skin: "#f6f6f0", rib: "#ffd84a", ribs2: "#2a5bd7", glow: "#ff7a1a", hood: "#2a5bd7" }, bg: "teal" },
    { p: { mouth: "smirk" }, gags: [["shades"]], bg: "dusk" },
    { p: { skin: "#ff9a3a" }, gags: [["partyHat", "#9b4dff", "#7dff5a", 7, 6], ["bigTongue"]], bg: "forest" },
    { p: { skin: "#e06a10" }, gags: [["topHat"], ["mustache", "#1a1024"]], bg: "wine" },
    { p: { skin: "#ff8fd0", rib: "#e05aa8", glow: "#ff2a5a", mouth: "smirk" }, gags: [["heartEyes"]], bg: "night" },
    { p: { skin: "#ffb03a", mouth: "o" }, gags: [["propeller"], ["crossEyed"]], bg: "swamp" },
    { p: { skin: "#8a7a3a", rib: "#5a4a2a", glow: "#7dff5a", stem: "#3a2a1a" }, gags: [["worm"], ["spider", 4]], bg: "rust" },
  ],
  frankenstein: [
    { bg: "night" },
    { p: { skin: "#7ab0e0", noHair: true }, gags: [["afro", "#1a1024"]], bg: "orange" },
    { p: { skin: "#ffb0c8", hair: "#ffd84a", jacket: "#9b4dff" }, gags: [["flower", 14, 2], ["lipstick"]], bg: "teal" },
    { gags: [["shades"], ["sparks"]], bg: "navy" },
    { p: { skin: "#a0e070" }, gags: [["googly"], ["partyHat", "#ff7a1a", "#2a1640", 12, 3]], bg: "plum" },
    { p: { skin: "#a080d0", noHair: true, jacket: "#1a1024" }, gags: [["mohawk", "#7dff5a"], ["earring", "#c0c0d0"]], bg: "wine" },
    { p: { skin: "#5ab09a", jacket: "#ff2a3a" }, gags: [["headband", WHITE], ["volleyball"]], bg: "forest" },
    { p: { noHair: true, jacket: WHITE }, gags: [["chefHat"], ["mustache", "#1a1024"]], bg: "rust" },
    { p: { skin: "#c8e070", jacket: "#241433" }, gags: [["monocle"], ["bowtie", "#ff2a5a"]], bg: "dusk" },
    { gags: [["blackEye"]], bg: "swamp" },
  ],
  cat: [
    { bg: "rust" },
    { p: { fur: "#ff9a3a", stripes: "#c86a1a", eye: "#7dff5a", mouth: "#c86a1a" }, gags: [["tongue", 12]], bg: "night" },
    { p: { fur: "#f6f0ff", eye: "#2ad0ff", mouth: "#c8c0e0", collar: "#ff4fa0" }, gags: [["heartEyes"], ["bow", "#ff4fa0", 14, 4]], bg: "plum" },
    { p: { fur: "#8a8a9a", mouth: "#5a5a6a" }, gags: [["shades"]], bg: "orange" },
    { p: { fur: "#f6f0ff", patch: "#ff9a3a", patch2: "#2a1f3d", mouth: "#c8c0e0" }, gags: [["partyHat", "#2ad0ff", "#ff4fa0", 12, 6]], bg: "teal" },
    { gags: [["witchHat", 7]], bg: "dusk" },
    { p: { fur: "#5a4a8a" }, gags: [["googly"]], bg: "forest" },
    { p: { fur: "#f0e0c8", mask: "#5a3a2a", eye: "#2a7aff", mouth: "#5a3a2a" }, gags: [["crown"]], bg: "wine" },
    { p: { fur: "#3a3a46", eye: "#ffd84a" }, gags: [["volleyball"]], bg: "navy" },
    { p: { fur: "#9b4dff", eye: "#ff7a1a", mouth: "#6a2ab0" }, gags: [["cyclops", "#ff7a1a"]], bg: "swamp" },
  ],
};

export const ARCHETYPES = Object.keys(V);

export function drawAvatar(arch, i) {
  const spec = V[arch][i];
  const c = canvas();
  const a = BASES[arch](c, spec.p ?? {});
  for (const [name, ...args] of spec.gags ?? []) {
    const fn = G[name];
    // gags that don't need anchors take (c, ...args)
    if (["volleyball", "sparks", "confetti"].includes(name)) fn(c, ...args);
    else fn(c, a, ...args);
  }
  outline(c);
  const base = BG[spec.bg ?? "night"];
  const bgFn = arch === "werewolf" && i === 0
    ? (x, y) => { const dx = x - 19, dy = y - 4; return dx * dx + dy * dy <= 10 ? (dx + dy < -1 ? "#fff8c4" : "#ffd84a") : sky(base, undefined, [[3, 5], [5, 2], [2, 10]])(x, y); }
    : sky(base);
  return toSvg(c, bgFn);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL(".", import.meta.url);
  for (const f of readdirSync(dir)) if (f.endsWith(".svg")) unlinkSync(new URL(f, dir));
  let n = 0;
  for (const arch of ARCHETYPES) V[arch].forEach((_, i) => { writeFileSync(new URL(`${arch}-${i + 1}.svg`, dir), drawAvatar(arch, i)); n++; });
  console.log(`wrote ${n} avatars`);
}
