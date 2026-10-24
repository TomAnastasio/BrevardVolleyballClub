// Copied from design/gacha/source/data/xl1.js (branch claude/gacha-avatars-design).
import { R, spr, reduced, TAU, glow, sparkle, fade, darken, lighten, at, hash, CX, OUT, makeGrid, outline, shadedRow, ellipse, addTheme, addSkin } from "../kit.js";

// Legendary transformations, batch A (XL1-XL20).
(() => {
// ---------- helpers ----------
// char-grid builder for the 18x28 box; .rows() gives the pixel map
function cg(w = 18, h = 28) {
  const a = [...Array(h)].map(() => Array(w).fill("."));
  return {
    set(x, y, ch) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) a[y][x] = ch; },
    get(x, y) { return y >= 0 && y < h && x >= 0 && x < w ? a[y][x] : "."; },
    rect(x, y, w2, h2, ch) { for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) this.set(x + i, y + j, ch); },
    ell(cx, cy, rx, ry, ch) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const d = 1 - ((y - cy) / ry) ** 2;
        if (d < 0) continue;
        const hw = Math.sqrt(d) * rx;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) this.set(x, y, typeof ch === "function" ? ch(x, y) : ch);
      }
    },
    line(x0, y0, x1, y1, ch, thick = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let k = 0; k <= n; k++) for (let d = 0; d < thick; d++) this.set(x0 + ((x1 - x0) * k) / n + d, y0 + ((y1 - y0) * k) / n, ch);
    },
    rows() { return a.map((r) => r.join("")); },
  };
}
const FIRE = ["#ffffff", "#fff3a0", "#ffd84a", "#ff7a1a", "#c4300a"];
const GFIRE = ["#ffffff", "#c8ffb0", "#5ee84a", "#2f8a3a"];
const BFIRE = ["#ffffff", "#b8feff", "#4fb2ff", "#2a4a8f"];
const PFIRE = ["#ffffff", "#f0d8ff", "#c46bff", "#6b3fa8"];
// a little flame column: w pixels wide starting at x, rising h from y
function flames(c, x, y, w, h, t, cols, speed = 2.4) {
  for (let s = 0; s < w; s++) for (let k = 0; k < 3; k++) {
    const ph = (t * speed + k / 3 + s * 0.23) % 1;
    fade(c, 1 - ph * 0.6, () => R(c, x + s + Math.round(Math.sin(t * 9 + s + k) * ph), y - ph * h * (0.6 + 0.4 * hash(s, k)), 1, 1, cols[Math.min(cols.length - 1, Math.floor(ph * cols.length))]));
  }
}
// n particles rising from a band x0..x0+w at y, fading over h
function rise(c, x0, w, y, h, n, t, speed, col, sway = 1) {
  for (let k = 0; k < n; k++) {
    const ph = (t * speed + k / n) % 1;
    fade(c, 1 - ph, () => R(c, x0 + Math.round(hash(k, 7) * w + Math.sin(t * 2 + k) * sway), y - ph * h, 1, 1, typeof col === "function" ? col(k, ph) : col));
  }
}
function orbit(cx, cy, rx, ry, n, t, speed, fn) {
  for (let k = 0; k < n; k++) { const a = t * speed + (k * TAU) / n; fn(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), k, Math.sin(a)); }
}
const flick = (t, a, b, f = 9) => (Math.sin(t * f) + Math.sin(t * f * 0.57) > -0.5 ? a : b);
const bobf = (amp, speed = 2) => (t) => (reduced ? amp : amp + Math.round((Math.sin(t * speed) + 1) / 2));

// ---------- 1. Spectral Horseman ----------
{
  const g = cg();
  g.ell(9, 17, 6.5, 3.3, "h");
  for (let x = 4; x <= 14; x++) g.set(x, 20, "H");
  g.line(13, 15, 15, 10, "h", 2);
  g.rect(14, 8, 4, 3, "h"); g.set(17, 10, "H"); g.set(16, 9, "r");
  g.set(14, 7, "h"); g.set(15, 7, "h");
  for (const x of [4, 6, 12, 14]) { g.rect(x, 21, 1, 5, x % 4 === 0 ? "H" : "h"); g.set(x, 26, "k"); }
  // rider
  g.rect(7, 8, 4, 7, "c"); g.rect(6, 9, 1, 4, "c"); g.rect(11, 9, 1, 4, "c"); g.set(8, 8, "x"); g.set(9, 8, "x");
  g.rect(6, 15, 2, 4, "C"); g.rect(10, 15, 2, 3, "C"); g.rect(6, 18, 2, 2, "b"); g.set(5, 13, "g"); g.set(12, 13, "g");
  g.rect(7, 7, 4, 1, "k");
  addSkin("legendary", {
    name: "Spectral Horseman",
    pitch: "The headless rider on a ghost horse the full width of the space: blue spirit-fire mane, burning hooves, flames where his head should be, and a blazing pumpkin in his hand.",
    rows: g.rows(),
    pal: { h: "#8fa8c8", H: "#5f7898", r: "#ff3b4d", k: "#1a1024", c: "#2a2240", C: "#1a1530", x: "#8f1426", b: "#3a2a1a", g: "#4a4060" },
    animPal: (t) => ({ h: Math.sin(t * 3) > 0 ? "#8fa8c8" : "#9fb8d8" }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 17, 14, "#4fb2ff", 0.3 + 0.08 * Math.sin(t * 4)); },
    over(c, l, tp, t) {
      flames(c, l + 7, tp + 7, 4, 7, t, FIRE);
      for (let k = 0; k < 5; k++) flames(c, l + 13 + Math.round(k * 0.5), tp + 15 - k, 1, 4, t + k * 0.3, BFIRE, 3);
      flames(c, l + 1, tp + 16, 2, 5, t, BFIRE, 2);
      for (const x of [4, 6, 12, 14]) flames(c, l + x, tp + 27, 1, 2, t + x, FIRE, 3);
      glow(c, l + 3, tp + 12, 6, "#ff7a1a", 0.45);
      spr(c, [".ooo.", "oyoyo", "ooooo", "oyyyo", ".ooo."], { o: "#ff7a1a", y: flick(t, "#fff3a0", "#ffd84a") }, l + 1, tp + 10);
    },
  });
}

// ---------- 2. Lich King ----------
{
  const g = cg();
  for (let y = 9; y <= 25; y++) { const hw = 3 + (y - 9) * 0.32; g.rect(Math.round(8.5 - hw), y, Math.round(hw * 2), 1, y > 23 && y % 2 ? "R" : "r"); }
  for (let x = 2; x <= 15; x += 2) g.set(x, 26, "R");
  g.rect(6, 3, 6, 5, "s"); g.set(7, 5, "e"); g.set(10, 5, "e"); g.rect(7, 7, 4, 1, "S"); g.set(8, 8, "s"); g.set(9, 8, "s");
  g.rect(5, 2, 8, 1, "y"); for (const x of [5, 7, 9, 11]) { g.set(x, 1, "y"); } g.set(6, 0, "y"); g.set(9, 0, "y"); g.set(12, 0, "y"); g.set(8, 1, "j");
  g.rect(5, 9, 8, 2, "m"); g.rect(4, 9, 1, 3, "y"); g.rect(13, 9, 1, 3, "y");
  g.set(3, 15, "s"); g.set(14, 15, "s");
  for (let y = 1; y <= 26; y++) g.set(16, y, "w");
  g.set(15, 0, "y"); g.set(17, 0, "y"); g.set(16, 0, "j");
  g.rect(8, 12, 2, 6, "y");
  addSkin("legendary", {
    name: "Lich King",
    pitch: "An undead sorcerer-king floating in tattered robes, a golden crown on his skull, a glowing staff, and lost souls orbiting him.",
    float: bobf(2),
    rows: g.rows(),
    pal: { r: "#2a1a4a", R: "#1a0f30", s: "#ece6d6", S: "#b9ae94", e: "#7dfcff", y: "#e8c45a", j: "#4fb2ff", m: "#3a2a5c", w: "#5a3a20" },
    animPal: (t) => ({ e: flick(t, "#7dfcff", "#ffffff", 6), j: Math.sin(t * 4) > 0 ? "#4fb2ff" : "#b8feff" }),
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 14, 16, "#7a4ad9", 0.35 + 0.1 * Math.sin(t * 2));
      orbit(l + 9, tp + 14, 10, 4, 4, t, 1.2, (x, y, k, s) => { if (s < 0) { glow(c, x, y, 3, "#7dfcff", 0.4); R(c, x, y, 1, 1, "#9fd4ff"); } });
    },
    over(c, l, tp, t) {
      glow(c, l + 16, tp, 5, "#4fb2ff", 0.55);
      glow(c, l + 8, tp + 5, 4, "#7dfcff", 0.3);
      orbit(l + 9, tp + 14, 10, 4, 4, t, 1.2, (x, y, k, s) => { if (s >= 0) { glow(c, x, y, 3, "#7dfcff", 0.6); R(c, x, y, 2, 2, "#e0ffff"); R(c, x - Math.round(Math.cos(t * 1.2 + (k * TAU) / 4) * 2), y, 1, 1, "#4fb2ff"); } });
      rise(c, l + 2, 14, tp + 27, 6, 5, t, 0.6, "#c46bff");
    },
  });
}

// ---------- 3. Dracula's Bat Form ----------
{
  const g = cg(18, 22);
  g.ell(8.5, 10, 2.5, 4, "b"); g.rect(7, 14, 4, 2, "b");
  g.rect(7, 4, 4, 3, "b"); g.set(7, 3, "b"); g.set(10, 3, "b"); g.set(7, 2, "b"); g.set(10, 2, "b");
  g.set(8, 5, "e"); g.set(9, 5, "e"); g.set(8, 7, "f"); g.set(9, 7, "f");
  g.rect(7, 16, 1, 2, "B"); g.rect(10, 16, 1, 2, "B");
  addSkin("legendary", {
    name: "Dracula's Bat Form",
    pitch: "The Count as a giant bat with wings spanning the whole space. The wings beat slowly, the red eyes burn, and a crimson mist swirls underneath.",
    float: bobf(5, 3),
    rows: g.rows(),
    pal: { b: "#3a2d4a", B: "#231d33", e: "#ff3b4d", f: "#ffffff" },
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 8, 12, "#8f1426", 0.4);
      const flap = reduced ? 0 : Math.sin(t * 4);
      for (const dir of [-1, 1]) {
        for (let k = 0; k < 9; k++) {
          const x = l + 9 + dir * (2 + k);
          const lift = Math.round(flap * k * 0.5);
          const topY = tp + 6 - Math.round(Math.sin((k / 8) * Math.PI) * 3) - lift;
          const bottom = tp + 11 + (k % 3 === 2 ? -1 : 1) - Math.round(lift * 0.6);
          for (let y = topY; y <= bottom; y++) R(c, x, y, 1, 1, y === topY ? "#8a6aaa" : k % 3 === 0 ? "#5a4486" : "#3d2c5c");
        }
      }
    },
    over(c, l, tp, t) {
      glow(c, l + 9, tp + 5, 4, "#ff3b4d", 0.5);
      for (let k = 0; k < 8; k++) {
        const ph = (t * 0.4 + k / 8) % 1;
        fade(c, 0.45 * Math.sin(ph * Math.PI), () => R(c, l + Math.round(hash(k, 3) * 18 + Math.sin(t + k) * 2), tp + 22 + Math.round(hash(k) * 6) - Math.round(ph * 4), 3, 1, k % 2 ? "#c42a3e" : "#8f1426"));
      }
    },
  });
}

// ---------- 4. Great Pumpkin King ----------
{
  const g = cg();
  g.ell(8.5, 18.5, 8.5, 8.5, (x, y) => (x === 4 || x === 13 || x === 8 ? "r" : x <= 2 ? "h" : x >= 15 ? "O" : "o"));
  g.rect(3, 8, 12, 2, "y"); for (const x of [3, 6, 9, 11, 14]) { g.set(x, 7, "y"); g.set(x, 6, x % 2 ? "Y" : "y"); }
  g.set(6, 8, "j"); g.set(9, 8, "J"); g.set(12, 8, "j");
  for (const [x, y] of [[5, 15], [4, 16], [5, 16], [6, 16], [12, 15], [11, 16], [12, 16], [13, 16], [8, 18], [9, 18], [4, 21], [5, 22], [6, 22], [7, 21], [8, 22], [9, 22], [10, 21], [11, 22], [12, 22], [13, 21]]) g.set(x, y, "f");
  g.set(0, 15, "v"); g.set(0, 14, "v"); g.set(1, 13, "l"); g.set(17, 16, "v"); g.set(17, 15, "v"); g.set(16, 14, "l");
  addSkin("legendary", {
    name: "Great Pumpkin King",
    pitch: "A giant pumpkin wearing a jeweled crown, its carved face blazing, curling vines at its sides, and fireflies drifting all around it.",
    rows: g.rows(),
    pal: { o: "#ff7a1a", O: "#c4550a", h: "#ffa45a", r: "#e0661a", y: "#ffc53a", Y: "#fff1b0", j: "#ff3b4d", J: "#4fb2ff", f: "#fff3a0", v: "#3f6b3a", l: "#5a8a3a" },
    animPal: (t) => ({ f: flick(t, "#fff3a0", "#ffd84a"), Y: Math.floor(t * 6) % 3 ? "#fff1b0" : "#ffffff" }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 18, 16, "#ff9a3a", 0.35 + 0.1 * Math.sin(t * 9)); },
    over(c, l, tp, t) {
      for (let k = 0; k < 7; k++) {
        const x = l + 9 + Math.round(Math.sin(t * 0.7 + k * 1.9) * 11), y = tp + 12 + Math.round(Math.sin(t * 0.9 + k * 2.7) * 10);
        if (Math.sin(t * 3 + k * 1.3) > -0.2) { glow(c, x, y, 3, "#ffff9a", 0.5); R(c, x, y, 1, 1, "#ffffcc"); }
      }
      const tw = Math.floor(t * 4) % 5;
      sparkle(c, l + [3, 6, 9, 11, 14][tw], tp + 5, "#ffffff", true);
    },
  });
}

// ---------- 5. Swamp Kraken ----------
{
  const g = cg();
  g.ell(9, 13, 6, 7, (x, y) => (x <= 4 ? "M" : x >= 13 ? "N" : "m"));
  g.set(6, 13, "e"); g.set(7, 13, "e"); g.set(11, 13, "e"); g.set(12, 13, "e"); g.set(7, 13, "k"); g.set(11, 13, "k");
  g.rect(7, 16, 5, 1, "N");
  for (let y = 21; y <= 27; y++) for (let x = 0; x < 18; x++) g.set(x, y, y === 21 ? "W" : "w");
  addSkin("legendary", {
    name: "Swamp Kraken",
    pitch: "A huge squid-beast rising out of a dark swamp, with tentacles that curl and wave around it, glowing eyes, and bubbles and splashes everywhere.",
    rows: g.rows(),
    pal: { m: "#5a3a7a", M: "#7a5a9a", N: "#3a2458", e: "#ffd84a", k: "#1a1024", w: "#1f3a33", W: "#3f7a6a" },
    animPal: (t) => ({ e: flick(t, "#ffd84a", "#fff3a0", 4), W: Math.floor(t * 3) % 2 ? "#3f7a6a" : "#5a9a8a" }),
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 14, 14, "#5ee8b0", 0.25);
      for (const [bx, dir, sp] of [[2, -1, 0], [16, 1, 1.3], [5, -1, 2.1], [13, 1, 3.1]]) {
        for (let k = 0; k < 12; k++) {
          const y = tp + 21 - k;
          const x = l + bx + Math.round(Math.sin(t * 1.6 + sp + k * 0.45) * (1 + k * 0.25)) + dir * Math.round(k * 0.15);
          const thick = k < 6 ? 2 : 1;
          R(c, x, y, thick, 1, k % 3 === 0 ? "#c4a0e0" : "#6b4a8a");
        }
      }
    },
    over(c, l, tp, t) {
      glow(c, l + 6, tp + 13, 3, "#ffd84a", 0.4); glow(c, l + 12, tp + 13, 3, "#ffd84a", 0.4);
      rise(c, l + 1, 16, tp + 21, 8, 6, t, 0.8, "#9fd4ff");
      for (let k = 0; k < 4; k++) { const ph = (t * 1.5 + k / 4) % 1; fade(c, 1 - ph, () => R(c, l + [1, 6, 11, 16][k] + Math.round(Math.sin(k) * ph * 3), tp + 21 - Math.sin(ph * Math.PI) * 4, 1, 1, "#b8feff")); }
    },
  });
}

// ---------- 6. Ash Phoenix ----------
{
  const g = cg();
  g.ell(9, 13, 2.5, 4, "b"); g.rect(8, 6, 3, 3, "b"); g.set(11, 7, "k"); g.set(9, 7, "e"); g.set(10, 5, "c"); g.set(9, 4, "c"); g.set(8, 5, "c");
  for (let k = 0; k <= 7; k++) {
    for (const dir of [-1, 1]) {
      const x = 9 + dir * (2 + k);
      const top = 10 - Math.round(k * 0.9), bot = 13 - Math.round(k * 0.3);
      for (let y = top; y <= bot; y++) g.set(x, y, y === top ? "y" : y === bot ? "r" : "o");
    }
  }
  for (let k = 0; k < 8; k++) { g.set(9 + Math.round(Math.sin(k) * 2), 17 + k, k % 2 ? "r" : "o"); g.set(8 - Math.round(k * 0.4), 17 + k, "y"); g.set(10 + Math.round(k * 0.4), 17 + k, "o"); }
  for (let x = 4; x <= 14; x++) g.set(x, 27, x % 2 ? "a" : "A");
  g.rect(6, 26, 7, 1, "A");
  addSkin("legendary", {
    name: "Ash Phoenix",
    pitch: "A firebird rising out of a pile of glowing ash, wings spread wide and burning, its tail feathers trailing flame and embers drifting up.",
    rows: g.rows(),
    pal: { b: "#ff7a1a", o: "#ff9a3a", r: "#c4300a", y: "#ffd84a", e: "#ffffff", k: "#1a1024", c: "#fff3a0", a: "#5a4a40", A: "#ff7a1a" },
    animPal: (t) => ({ o: flick(t, "#ff9a3a", "#ffb35a"), y: flick(t, "#ffd84a", "#fff3a0", 11), A: flick(t, "#ff7a1a", "#c4300a", 5) }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 12, 17, "#ff7a1a", 0.4 + 0.12 * Math.sin(t * 7)); },
    over(c, l, tp, t) {
      for (let k = 0; k <= 7; k++) for (const dir of [-1, 1]) flames(c, l + 9 + dir * (2 + k), tp + 10 - Math.round(k * 0.9), 1, 4, t + k * 0.2, FIRE, 2.6);
      flames(c, l + 8, tp + 4, 3, 5, t, FIRE, 3);
      rise(c, l + 3, 12, tp + 27, 26, 10, t, 0.5, (k) => (k % 3 ? "#ffd84a" : "#ff7a1a"), 2);
    },
  });
}

// ---------- 7. Shadow Wraith ----------
{
  const g = cg();
  g.ell(9, 6, 4, 4, "v"); for (let y = 9; y <= 24; y++) { const hw = 5 + Math.sin(y * 0.6) * 1.5 - Math.max(0, y - 19) * 0.8; g.rect(Math.round(9 - hw), y, Math.round(hw * 2), 1, "v"); }
  g.rect(1, 12, 3, 1, "v"); g.rect(0, 13, 2, 3, "v"); g.rect(14, 12, 3, 1, "v"); g.rect(16, 13, 2, 3, "v");
  g.set(7, 6, "e"); g.set(11, 6, "e"); g.set(8, 6, "E"); g.set(10, 6, "E");
  addSkin("legendary", {
    name: "Shadow Wraith",
    pitch: "A tall living shadow with a starry void inside it, two piercing violet eyes, clawed arms, and wisps of darkness streaming off its edges.",
    float: bobf(3, 1.5),
    rows: g.rows(),
    pal: { v: "#07040f", e: "#f0d8ff", E: "#c46bff" },
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 12, 16, "#6b3fa8", 0.45 + 0.1 * Math.sin(t * 2));
      for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k / 6) % 1; fade(c, 0.8 * (1 - ph), () => R(c, l + 3 + Math.round(hash(k) * 12) + Math.round(Math.sin(t * 2 + k) * 2), tp + 24 + ph * 6, 2, 1, "#2a1a4a")); }
    },
    over(c, l, tp, t) {
      for (let k = 0; k < 14; k++) {
        const x = 5 + Math.round(hash(k, 1) * 8), y = 9 + Math.round(hash(k, 2) * 13);
        if (Math.sin(t * 2 + k * 1.7) > 0.2) R(c, l + x, tp + y, 1, 1, k % 3 ? "#5a4486" : "#ffffff");
      }
      glow(c, l + 9, tp + 6, 5, "#c46bff", 0.45);
      for (const [x, y] of [[0, 9], [17, 9], [3, 3], [15, 3], [1, 18], [17, 19]]) {
        const ph = (t * 0.9 + x * 0.1) % 1;
        fade(c, 0.7 * (1 - ph), () => R(c, l + x + Math.round(Math.sin(t * 3 + y) * 1), tp + y - ph * 6, 1, 2, "#3a2a5c"));
      }
    },
  });
}

// ---------- 8. Ghost Ship ----------
{
  const g = cg();
  for (let y = 18; y <= 23; y++) { const inset = Math.max(0, y - 20); g.rect(inset, y, 18 - inset * 2, 1, y === 18 ? "D" : "h"); }
  g.rect(0, 16, 3, 2, "h"); g.rect(15, 15, 3, 3, "h"); g.set(4, 20, "w"); g.set(8, 20, "w"); g.set(12, 20, "w");
  g.rect(6, 2, 1, 16, "m"); g.rect(12, 5, 1, 13, "m");
  for (let y = 3; y <= 12; y++) { const w = 4 - Math.abs(y - 8) * 0.3; g.rect(Math.round(6 - w), y, Math.round(w * 2 + 1), 1, (y + 1) % 4 ? "s" : "S"); }
  for (let y = 6; y <= 14; y++) { const w = 3 - Math.abs(y - 10) * 0.3; g.rect(Math.round(12 - w), y, Math.round(w * 2 + 1), 1, y % 3 ? "s" : "S"); }
  g.rect(6, 0, 3, 2, "k"); g.set(7, 0, "x");
  g.set(3, 6, "."); g.set(9, 9, "."); g.set(13, 11, ".");
  addSkin("legendary", {
    name: "Ghost Ship",
    pitch: "A tiny spectral galleon sailing through the air on ghostly waves, its torn sails glowing, a skull flag flying and a lantern swinging off the stern.",
    float: bobf(3, 1.6),
    rows: g.rows(),
    pal: { h: "#2f5a5a", D: "#4f8a80", w: "#b8feff", m: "#3a2a1a", s: "#b8f0e0", S: "#7fc8b8", k: "#14101c", x: "#ece6d6" },
    animPal: (t) => ({ s: Math.sin(t * 2) > 0 ? "#b8f0e0" : "#d8fff0" }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 12, 16, "#5ee8b0", 0.3 + 0.08 * Math.sin(t * 2)); },
    over(c, l, tp, t) {
      const sw = Math.round(Math.sin(t * 2.5));
      R(c, l + 16, tp + 13, 1, 1, "#3a2a1a");
      glow(c, l + 16 + sw, tp + 15, 5, "#ffd84a", 0.6);
      R(c, l + 16 + sw, tp + 14, 1, 2, flick(t, "#fff3a0", "#ffd84a"));
      for (let x = -1; x < 19; x++) {
        const y = tp + 25 + Math.round(Math.sin(t * 3 + x * 0.7) * 1.2);
        fade(c, 0.6, () => R(c, l + x, y, 1, 1, (x + Math.floor(t * 4)) % 4 ? "#7fc8b8" : "#e0fff8"));
      }
      rise(c, l + 1, 16, tp + 24, 10, 5, t, 0.4, "#b8feff");
    },
  });
}

// ---------- 9. Haunted Mansion ----------
{
  const g = cg();
  g.rect(1, 12, 16, 16, "b"); for (let y = 12; y < 28; y += 2) g.rect(1, y, 16, 1, "B");
  for (let k = 0; k <= 6; k++) g.rect(9 - k - 2, 6 + k, (k + 2) * 2 + 1, 1, "r");
  g.rect(1, 3, 4, 9, "b"); for (let k = 0; k < 3; k++) g.rect(1 + k, 2 - k, 4 - k * 2, 1, "r"); g.set(2, -1, "r");
  g.rect(13, 4, 2, 4, "b");
  for (const [x, y, n] of [[2, 6, "1"], [3, 15, "2"], [7, 15, "3"], [12, 15, "4"], [3, 20, "5"], [12, 20, "6"], [8, 10, "7"]]) { g.rect(x, y, 2, 2, n); }
  g.rect(7, 22, 3, 6, "d"); g.set(9, 25, "y");
  addSkin("legendary", {
    name: "Haunted Mansion",
    pitch: "You become a tiny haunted house: a crooked tower, windows that flicker on and off, a creaking door, and ghosts and bats pouring out of it.",
    rows: g.rows(),
    pal: { b: "#3a2d4a", B: "#2a2038", r: "#6b3a5a", d: "#14101c", y: "#ffd84a", 1: "#ffd84a", 2: "#ffd84a", 3: "#ffd84a", 4: "#ffd84a", 5: "#ffd84a", 6: "#ffd84a", 7: "#ffd84a" },
    animPal: (t) => {
      const p = {};
      for (let k = 1; k <= 7; k++) p[k] = Math.sin(t * (1.3 + k * 0.37) + k * 2) > -0.3 ? (k === 7 ? "#c46bff" : "#ffd84a") : "#2a1d45";
      return p;
    },
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 16, 16, "#c46bff", 0.25);
      glow(c, l + 15, tp + 1, 6, "#e9e0c6", 0.35);
    },
    over(c, l, tp, t) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.35 + k / 3) % 1;
        const x = l + [14, 3, 9][k] + Math.round(Math.sin(t * 3 + k) * 3) + Math.round(ph * (k % 2 ? -4 : 4));
        const y = tp + [4, 6, 10][k] - Math.round(ph * 12);
        fade(c, 1 - ph, () => spr(c, [".ww.", "wkkw", "wwww", "w.w."], { w: "#f3efe6", k: "#1a1024" }, x, y));
      }
      orbit(l + 9, tp + 4, 9, 3, 3, t, 1.5, (x, y, k) => { const f = Math.floor(t * 10 + k) % 2; R(c, x, y, 1, 1, "#0b0614"); R(c, x - 1, y - f, 1, 1, "#0b0614"); R(c, x + 1, y - f, 1, 1, "#0b0614"); });
    },
  });
}

// ---------- 10. Witch Queen on a Broom ----------
{
  const g = cg(18, 26);
  g.rect(0, 20, 18, 1, "w"); for (let y = 18; y <= 23; y++) { const hw = Math.abs(y - 20.5) < 3 ? 3 - Math.abs(y - 20.5) * 0.6 : 0; g.rect(0, y, Math.round(4 - Math.abs(y - 20.5) * 0.7), 1, y % 2 ? "s" : "S"); }
  g.ell(9, 16, 4, 3, "p"); g.rect(6, 17, 7, 3, "p"); g.rect(10, 19, 3, 3, "P"); g.set(12, 22, "k"); g.set(13, 22, "k"); g.set(14, 21, "k");
  g.rect(8, 9, 4, 4, "f"); g.set(9, 10, "e"); g.set(11, 10, "e"); g.set(10, 12, "m");
  g.rect(7, 9, 1, 6, "h"); g.rect(6, 11, 1, 5, "h"); g.rect(12, 9, 1, 3, "h");
  g.rect(5, 8, 10, 1, "k"); g.rect(7, 7, 6, 1, "k"); g.rect(8, 6, 4, 1, "g"); for (let k = 0; k < 6; k++) g.rect(9 + Math.round(k * 0.4), 5 - k, Math.max(1, 3 - Math.floor(k / 2)), 1, "k"); g.set(11, 6, "y");
  g.rect(12, 14, 2, 2, "p"); g.set(14, 15, "f");
  addSkin("legendary", {
    name: "Witch Queen on a Broom",
    pitch: "A witch queen riding her broom across a giant full moon, cape flying, leaving a trail of purple and gold sparkles behind her.",
    float: bobf(2, 1.8),
    rows: g.rows(),
    pal: { w: "#7a4a24", s: "#d9a441", S: "#a8792a", p: "#6b3fa8", P: "#52308a", f: "#9ae07a", e: "#1a1024", m: "#8f1426", h: "#ff7a1a", k: "#14101c", g: "#5ee84a", y: "#ffd84a" },
    under(c, l, tp, t) {
      glow(c, l + 10, tp + 9, 16, "#fff6d0", 0.25);
      fade(c, 0.85, () => { for (let y = -2; y <= 18; y++) { const d = 10 - Math.abs(y - 8); if (d <= 0) continue; const hw = Math.sqrt(100 - (y - 8) ** 2); R(c, l + 10 - hw, tp + y, hw * 2, 1, "#e9e0c6"); } });
      fade(c, 0.3, () => { R(c, l + 6, tp + 3, 3, 2, "#c9bfa0"); R(c, l + 14, tp + 9, 2, 2, "#c9bfa0"); });
    },
    over(c, l, tp, t) {
      for (let k = 0; k < 10; k++) {
        const ph = (t * 0.9 + k / 10) % 1;
        const x = l - 1 - Math.round(ph * 10), y = tp + 20 + Math.round(Math.sin(ph * 6 + k) * 2);
        fade(c, 1 - ph, () => (ph < 0.3 && k % 3 === 0 ? sparkle(c, x, y, "#ffffff", false) : R(c, x, y, 1, 1, k % 2 ? "#ffd84a" : "#c46bff")));
      }
      const fl = reduced ? 0 : Math.floor(t * 5) % 2;
      R(c, l + 4, tp + 15 + fl, 2, 3, "#52308a");
    },
  });
}

// ---------- 11. Cerberus ----------
{
  const g = cg();
  g.ell(9, 18, 7.5, 4, "b"); g.rect(3, 21, 2, 6, "b"); g.rect(13, 21, 2, 6, "b"); g.rect(6, 21, 2, 6, "B"); g.rect(10, 21, 2, 6, "B");
  for (const x of [3, 6, 10, 13]) g.rect(x, 27, 2, 1, "k");
  const head = (cx, cy) => { g.rect(cx - 2, cy - 2, 5, 4, "b"); g.set(cx - 2, cy - 3, "b"); g.set(cx + 2, cy - 3, "b"); g.rect(cx - 1, cy + 2, 3, 1, "B"); g.set(cx - 1, cy - 1, "e"); g.set(cx + 1, cy - 1, "e"); g.set(cx, cy + 1, "k"); g.set(cx - 1, cy + 2, "f"); g.set(cx + 1, cy + 2, "f"); };
  g.rect(3, 11, 3, 5, "b"); g.rect(12, 11, 3, 5, "b"); g.rect(8, 9, 3, 6, "b");
  head(3, 10); head(9, 6); head(15, 10);
  g.rect(5, 15, 9, 1, "c"); g.set(7, 15, "s"); g.set(11, 15, "s");
  addSkin("legendary", {
    name: "Cerberus",
    pitch: "The three-headed hound of the underworld, wider than a person, with burning red eyes and a spiked collar. The middle head breathes fire while the others snarl smoke.",
    rows: g.rows(),
    pal: { b: "#3a3046", B: "#262033", e: "#ff3b4d", k: "#0b0614", f: "#ffffff", c: "#8f1426", s: "#c9c2d9" },
    animPal: (t) => ({ e: flick(t, "#ff3b4d", "#ffd84a", 7) }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 14, 16, "#c4300a", 0.35 + 0.1 * Math.sin(t * 6)); },
    over(c, l, tp, t) {
      const ph = (t % 3) / 3;
      if (ph < 0.45) {
        const len = Math.sin((ph / 0.45) * Math.PI);
        for (let k = 0; k < 14; k++) {
          const d = (k / 14) * 9 * len;
          R(c, l + 9 + Math.round(Math.sin(t * 20 + k) * d * 0.25), tp + 9 + d, 1, 1, FIRE[Math.min(4, Math.floor((k / 14) * 5))]);
        }
        glow(c, l + 9, tp + 13, 7 * len + 1, "#ff7a1a", 0.5);
      }
      for (const hx of [3, 15]) rise(c, l + hx - 1, 2, tp + 11, 6, 3, t + hx, 0.7, "#6b6380");
      for (const [x, y] of [[2, 9], [4, 9], [8, 5], [10, 5], [14, 9], [16, 9]]) glow(c, l + x, tp + y, 2, "#ff3b4d", 0.4);
    },
  });
}

// ---------- 12. Bone Dragon ----------
{
  const g = cg();
  // skull
  g.rect(11, 2, 5, 3, "b"); g.rect(15, 3, 3, 2, "b"); g.set(12, 3, "e"); g.set(16, 5, "b"); g.set(14, 5, "b"); g.set(12, 1, "b"); g.set(11, 0, "b");
  // neck vertebrae curving down-left
  for (const [x, y] of [[11, 6], [10, 7], [10, 8], [9, 9], [9, 10], [9, 11]]) { g.set(x, y, "b"); g.set(x + 1, y, "B"); }
  // ribcage
  g.ell(9, 15, 4, 3.5, "r"); for (let y = 12; y <= 18; y += 2) g.rect(6, y, 7, 1, "b"); g.rect(9, 12, 1, 8, "b");
  // wings: bone arms + tattered membrane
  g.line(6, 12, 0, 4, "b"); g.line(12, 12, 17, 6, "b");
  for (let k = 0; k <= 6; k++) { g.line(6 - k, 12 - Math.round(k * 1.3), 4 - Math.round(k * 0.5), 18, k % 2 ? "m" : "M"); }
  for (let k = 0; k <= 5; k++) { g.line(12 + k, 12 - k, 15, 17, k % 2 ? "m" : "M"); }
  g.line(6, 12, 0, 4, "b"); g.line(12, 12, 17, 6, "b");
  // legs + tail
  g.rect(6, 19, 1, 6, "b"); g.rect(11, 19, 1, 6, "b"); g.rect(5, 25, 3, 1, "b"); g.rect(10, 25, 3, 1, "b");
  for (let k = 0; k < 9; k++) g.set(9 - Math.round(Math.sin(k * 0.5) * 3) - Math.floor(k / 3), 20 + k * 0.85, "b");
  addSkin("legendary", {
    name: "Bone Dragon",
    pitch: "A dragon skeleton with tattered wings spread wide, green soulfire burning in its eye sockets and ribcage, and ghostly flames curling from its jaws.",
    rows: g.rows(),
    pal: { b: "#ece6d6", B: "#b9ae94", e: "#5ee84a", r: "#1f3a2a", m: "#3a4a3a", M: "#2a362a" },
    animPal: (t) => ({ e: flick(t, "#7dff5a", "#e0ffd8", 8), r: flick(t, "#1f3a2a", "#2f5a3a", 5) }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 14, 16, "#5ee84a", 0.25 + 0.08 * Math.sin(t * 3)); },
    over(c, l, tp, t) {
      flames(c, l + 7, tp + 15, 4, 3, t, GFIRE, 2.6);
      glow(c, l + 12, tp + 3, 3, "#5ee84a", 0.6);
      const ph = (t % 2.6) / 2.6;
      if (ph < 0.4) for (let k = 0; k < 8; k++) { const d = k * (ph / 0.4); R(c, l + 17 + Math.round(d * 0.6), tp + 5 + Math.round(Math.sin(t * 15 + k) * 1.2), 1, 1, GFIRE[Math.min(3, Math.floor(k / 2))]); }
      rise(c, l + 4, 10, tp + 18, 14, 6, t, 0.5, "#7dff5a");
    },
  });
}

// ---------- 13. Demon Lord ----------
{
  const g = cg();
  g.rect(6, 5, 6, 6, "r"); g.set(7, 7, "e"); g.set(10, 7, "e"); g.rect(7, 9, 4, 1, "k"); g.set(7, 10, "f"); g.set(10, 10, "f");
  g.line(6, 5, 4, 1, "h"); g.line(5, 5, 3, 2, "h"); g.set(4, 0, "H"); g.line(11, 5, 13, 1, "h"); g.line(12, 5, 14, 2, "h"); g.set(13, 0, "H");
  g.rect(5, 11, 8, 8, "r"); g.rect(7, 12, 4, 3, "R"); g.rect(5, 19, 8, 2, "k"); g.rect(5, 21, 3, 6, "r"); g.rect(10, 21, 3, 6, "r"); g.rect(4, 27, 4, 1, "k"); g.rect(10, 27, 4, 1, "k");
  g.rect(3, 12, 2, 6, "r"); g.rect(13, 12, 2, 6, "r"); g.set(3, 18, "c"); g.set(4, 18, "c"); g.set(13, 18, "c"); g.set(14, 18, "c");
  for (const dir of [-1, 1]) for (let k = 0; k < 4; k++) { const x0 = dir < 0 ? 4 : 13; g.line(x0, 10, x0 + dir * (3 + k), 4 + k * 3, "w"); }
  for (const dir of [-1, 1]) { const x0 = dir < 0 ? 4 : 13; g.line(x0, 10, x0 + dir * 4, 3, "W"); }
  g.rect(4, 11, 10, 1, "r");
  addSkin("legendary", {
    name: "Demon Lord",
    pitch: "A towering red demon with curled horns, burning eyes and huge leathery wings, standing in a ring of hellfire that roars up around his legs.",
    rows: g.rows(),
    pal: { r: "#a81e30", R: "#c42a3e", e: "#ffd84a", k: "#14101c", f: "#ffffff", h: "#3a3646", H: "#c9c2d9", c: "#ece6d6", w: "#3a1420", W: "#5c1c2c" },
    animPal: (t) => ({ e: flick(t, "#ffd84a", "#ffffff", 8) }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 20, 16, "#ff3b1a", 0.4 + 0.12 * Math.sin(t * 9)); },
    over(c, l, tp, t) {
      flames(c, l - 1, tp + 28, 20, 9, t, FIRE, 2.2);
      glow(c, l + 8, tp + 7, 4, "#ffd84a", 0.4);
      rise(c, l, 18, tp + 26, 26, 8, t, 0.5, (k) => (k % 2 ? "#ffd84a" : "#ff7a1a"), 2);
    },
  });
}

// ---------- 14. Mothman Supreme ----------
{
  const g = cg();
  for (const dir of [-1, 1]) {
    for (let k = 0; k <= 8; k++) {
      const x = 9 + dir * (1 + k) - (dir < 0 ? 0 : 1);
      const top = 4 + Math.round(Math.abs(k - 5) * 0.6), bot = 21 - Math.round(k * 0.9);
      for (let y = top; y <= bot; y++) g.set(x, y, y < 12 ? "w" : "W");
    }
    g.ell(9 + dir * 5 - (dir < 0 ? 0 : 1), 9, 1.6, 1.6, "s"); g.set(9 + dir * 5 - (dir < 0 ? 0 : 1), 9, "S");
    g.ell(9 + dir * 4 - (dir < 0 ? 0 : 1), 16, 1.2, 1.2, "s");
  }
  g.rect(8, 3, 2, 22, "b"); g.rect(7, 4, 4, 4, "b"); g.set(7, 5, "e"); g.set(10, 5, "e"); g.set(7, 2, "a"); g.set(6, 1, "a"); g.set(10, 2, "a"); g.set(11, 1, "a");
  g.rect(7, 24, 1, 4, "b"); g.rect(10, 24, 1, 4, "b");
  addSkin("legendary", {
    name: "Mothman Supreme",
    pitch: "A dark, towering moth-creature whose huge patterned wings fill the space, with blazing red eyes, flickering lights around it and glowing dust falling off its wings.",
    rows: g.rows(),
    pal: { b: "#14101c", w: "#4a3a3a", W: "#3a2a2a", s: "#8a7a5a", S: "#ff3b4d", e: "#ff3b4d", a: "#3a3646" },
    animPal: (t) => ({ e: Math.floor(t * 11) % 9 === 0 ? "#3a1420" : "#ff3b4d", w: Math.sin(t * 2) > 0 ? "#4a3a3a" : "#5a4a44", S: flick(t, "#ff3b4d", "#ffd84a", 4) }),
    under(c, l, tp, t) {
      const on = Math.floor(t * 7) % 11 !== 0;
      glow(c, l + 9, tp + 5, 12, "#ff3b4d", on ? 0.45 : 0.1);
      glow(c, l + 9, tp + 14, 18, "#6b3fa8", 0.25);
    },
    over(c, l, tp, t) {
      rise(c, l, 18, tp + 21, -6, 10, t, 0.4, (k) => (k % 2 ? "#e8d8a0" : "#c9b48a"), 1);
      orbit(l + 9, tp + 12, 11, 8, 3, t, 0.8, (x, y, k) => { if (Math.floor(t * 9 + k * 3) % 7) { glow(c, x, y, 3, "#ffffcc", 0.5); R(c, x, y, 1, 1, "#ffffff"); } });
    },
  });
}

// ---------- 15. Wisp Swarm ----------
{
  const g = cg();
  g.ell(9, 5, 2.5, 2.5, "d"); g.rect(7, 8, 5, 9, "d"); g.rect(5, 9, 2, 7, "d"); g.rect(12, 9, 2, 7, "d"); g.rect(7, 17, 2, 10, "d"); g.rect(10, 17, 2, 10, "d");
  const ANCHORS = [[9, 4], [7, 6], [11, 6], [6, 10], [12, 10], [9, 11], [5, 15], [13, 15], [8, 14], [10, 14], [8, 19], [11, 19], [8, 24], [11, 24], [7, 27], [12, 27], [9, 8], [9, 17]];
  addSkin("legendary", {
    name: "Wisp Swarm",
    pitch: "No body at all: a swarm of glowing will-o'-the-wisps circling in the shape of a person, drifting and swapping places, with a faint ghostly outline holding them together.",
    rows: g.rows(),
    pal: { d: "#1c2a40" },
    under(c, l, tp, t) { glow(c, l + 9, tp + 14, 16, "#4fb2ff", 0.25 + 0.08 * Math.sin(t * 2)); },
    over(c, l, tp, t) {
      ANCHORS.forEach(([ax, ay], k) => {
        const a = t * (1.2 + hash(k) * 1.5) + k;
        const x = l + ax + Math.round(Math.cos(a) * 1.5), y = tp + ay + Math.round(Math.sin(a * 1.3) * 1.5);
        const col = k % 3 === 0 ? "#b8feff" : k % 3 === 1 ? "#7dfcff" : "#c8ffb0";
        glow(c, x, y, 3, col, 0.55);
        R(c, x, y, 1, 1, "#ffffff");
        fade(c, 0.5, () => R(c, x - Math.round(Math.cos(a) * 2), y - Math.round(Math.sin(a * 1.3) * 2), 1, 1, col));
      });
    },
  });
}

// ---------- 16. Storm Golem ----------
{
  const g = cg();
  for (const [x, y, r] of [[9, 5, 4], [6, 6, 3], [12, 6, 3], [9, 12, 5.5], [4, 11, 3.5], [14, 11, 3.5], [9, 17, 4.5], [2, 15, 2.5], [16, 15, 2.5]]) g.ell(x, y, r, r * 0.85, (xx, yy) => (yy < y - r * 0.3 ? "c" : yy > y + r * 0.4 ? "C" : "m"));
  g.set(7, 5, "e"); g.set(11, 5, "e"); g.rect(8, 7, 3, 1, "k");
  g.rect(6, 20, 3, 6, "C"); g.rect(10, 20, 3, 6, "C"); g.rect(5, 26, 4, 2, "m"); g.rect(10, 26, 4, 2, "m");
  addSkin("legendary", {
    name: "Storm Golem",
    pitch: "A giant made of thunderclouds, rumbling and shifting, with glowing eyes, rain pouring off its arms, and lightning cracking through its body and down to the ground.",
    rows: g.rows(),
    pal: { c: "#8a8aa8", m: "#5a5a78", C: "#3a3a54", e: "#ffffff", k: "#1a1a2a" },
    animPal: (t) => {
      const flash = Math.floor(t * 6) % 9 === 0;
      return flash ? { c: "#d8e8ff", m: "#9aa8d0", C: "#5a6a90" } : { e: flick(t, "#ffffff", "#9fd4ff", 6) };
    },
    under(c, l, tp, t) { glow(c, l + 9, tp + 12, 16, "#4fb2ff", Math.floor(t * 6) % 9 === 0 ? 0.6 : 0.2); },
    over(c, l, tp, t) {
      for (let k = 0; k < 10; k++) { const ph = (t * 1.6 + k / 10) % 1; const x = l + [0, 2, 3, 15, 16, 17, 1, 14, 4, 13][k]; fade(c, 0.7, () => R(c, x, tp + 15 + ph * 12, 1, 2, "#9fd4ff")); }
      const step = Math.floor(t * 6);
      if (step % 3 === 0) {
        let seed = step * 9301 + 49297; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        let x = l + 6 + Math.round(rnd() * 6), y = tp + 6;
        while (y < tp + 28) { R(c, x, y, 1, 1, y % 3 ? "#ffffff" : "#fff3a0"); y++; x += rnd() > 0.6 ? 1 : rnd() > 0.5 ? -1 : 0; }
        glow(c, x, tp + 27, 5, "#fff3a0", 0.6);
      }
    },
  });
}

// ---------- 17. Crystal Ball Seer ----------
{
  const g = cg();
  g.ell(9, 10, 8, 8.5, (x, y) => ((x - 6) ** 2 + (y - 5) ** 2 < 5 ? "h" : "g"));
  g.rect(4, 19, 10, 2, "y"); g.rect(5, 21, 8, 1, "Y"); g.rect(7, 22, 4, 3, "y"); g.rect(5, 25, 8, 1, "Y"); g.rect(3, 26, 12, 2, "y");
  g.set(6, 19, "j"); g.set(9, 19, "J"); g.set(12, 19, "j"); g.set(8, 26, "J");
  g.rect(0, 22, 3, 2, "s"); g.rect(15, 22, 3, 2, "s");
  addSkin("legendary", {
    name: "Crystal Ball Seer",
    pitch: "A giant crystal ball on a golden stand, with violet mist swirling inside it and a ghostly face that slowly appears, blinks and fades, while sparkles circle the glass.",
    rows: g.rows(),
    pal: { g: "#3a2a6a", h: "#b8a8f0", y: "#e8c45a", Y: "#b38a2a", j: "#ff3b4d", J: "#4fb2ff", s: "#c9b49a" },
    under(c, l, tp, t) { glow(c, l + 9, tp + 10, 16, "#c46bff", 0.4 + 0.1 * Math.sin(t * 2)); },
    over(c, l, tp, t) {
      for (let k = 0; k < 16; k++) {
        const a = t * 1.2 + k * 0.7, r = 1 + (k % 6);
        const x = l + 9 + Math.round(Math.cos(a) * r), y = tp + 10 + Math.round(Math.sin(a) * r * 0.9);
        R(c, x, y, 1, 1, k % 3 === 0 ? "#f0d8ff" : k % 3 === 1 ? "#c46bff" : "#7a4ad9");
      }
      const face = (Math.sin(t * 0.8) + 1) / 2;
      if (face > 0.5) fade(c, (face - 0.5) * 2, () => {
        const blink = t % 3 > 2.85;
        R(c, l + 6, tp + 9, 2, blink ? 1 : 2, "#ffffff"); R(c, l + 11, tp + 9, 2, blink ? 1 : 2, "#ffffff");
        R(c, l + 7, tp + 14, 4, 1, "#ffffff"); R(c, l + 6, tp + 13, 1, 1, "#ffffff"); R(c, l + 11, tp + 13, 1, 1, "#ffffff");
      });
      orbit(l + 9, tp + 10, 10, 10, 4, t, 0.9, (x, y, k) => { const tw = Math.sin(t * 6 + k * 2) > 0.3; sparkle(c, x, y, tw ? "#ffffff" : "#c46bff", tw); });
    },
  });
}

// ---------- 18. Jack-o'-Lantern Totem ----------
{
  const g = cg();
  const pk = (cx, cy, rx, ry, faces) => {
    g.ell(cx, cy, rx, ry, (x) => (x === Math.round(cx - rx * 0.4) || x === Math.round(cx + rx * 0.4) ? "r" : x <= cx - rx + 1 ? "h" : x >= cx + rx - 1 ? "O" : "o"));
    for (const [x, y] of faces) g.set(x, y, "f");
  };
  pk(9, 23, 8.5, 4.5, [[5, 21], [6, 21], [12, 21], [13, 21], [4, 24], [5, 25], [6, 24], [7, 25], [8, 24], [9, 25], [10, 24], [11, 25], [12, 24], [13, 25], [14, 24]]);
  pk(9, 14.5, 6.5, 4, [[6, 13], [7, 12], [11, 12], [12, 13], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16], [11, 16], [12, 16], [8, 17], [10, 17]]);
  pk(9, 7, 4.5, 3.3, [[7, 6], [11, 6], [9, 7], [7, 9], [8, 8], [9, 9], [10, 8], [11, 9]]);
  g.set(9, 3, "v"); g.set(10, 2, "v"); g.set(8, 10.5, "v"); g.set(5, 18.5, "v"); g.set(13, 18.5, "v");
  addSkin("legendary", {
    name: "Jack-o'-Lantern Totem",
    pitch: "Three carved pumpkins stacked into a totem, each face glowing and flickering on its own, with fire roaring out of the top pumpkin and embers floating away.",
    rows: g.rows(),
    pal: { o: "#ff7a1a", O: "#c4550a", h: "#ffa45a", r: "#e0661a", f: "#fff3a0", v: "#3f6b3a" },
    animPal: (t) => ({ f: flick(t, "#fff3a0", "#ffd84a") }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 14, 17, "#ff9a3a", 0.35 + 0.1 * Math.sin(t * 9)); },
    over(c, l, tp, t) {
      flames(c, l + 7, tp + 4, 5, 9, t, FIRE, 2.2);
      for (const [cx, cy, r] of [[9, 23, 6], [9, 14, 5], [9, 7, 4]]) glow(c, l + cx, tp + cy, r, "#ffd84a", 0.25 + 0.15 * Math.sin(t * 7 + cy));
      rise(c, l + 2, 14, tp + 8, 14, 7, t, 0.5, (k) => (k % 2 ? "#ffd84a" : "#ff7a1a"), 2);
    },
  });
}

// ---------- 19. Ectoplasm Giant ----------
{
  const g = cg();
  g.ell(9, 6, 4, 4, "g"); g.ell(9, 15, 8.5, 6, "g"); g.rect(2, 13, 2, 9, "g"); g.rect(14, 13, 2, 9, "g"); g.rect(4, 20, 4, 7, "g"); g.rect(10, 20, 4, 7, "g");
  g.ell(9, 15, 4, 3, "G"); g.ell(9, 6, 2, 2, "G");
  g.set(7, 6, "e"); g.set(11, 6, "e"); g.rect(8, 8, 3, 1, "m");
  for (let x = 0; x < 18; x++) g.set(x, 27, x % 3 ? "p" : "g");
  addSkin("legendary", {
    name: "Ectoplasm Giant",
    pitch: "A hulking blob of glowing green ghost-goo shaped like a giant, with bubbles rising through its body, slime dripping off its arms and a spreading puddle under its feet.",
    rows: g.rows(),
    pal: { g: "#3fb02f", G: "#7dff5a", e: "#ffffff", m: "#1f5a1a", p: "#2f8a3a" },
    animPal: (t) => ({ G: flick(t, "#7dff5a", "#b7ff9e", 3), g: Math.sin(t * 2) > 0 ? "#3fb02f" : "#46c034" }),
    under(c, l, tp, t) { glow(c, l + 9, tp + 14, 17, "#5ee84a", 0.4 + 0.1 * Math.sin(t * 3)); },
    over(c, l, tp, t) {
      rise(c, l + 4, 10, tp + 20, 16, 8, t, 0.6, "#e0ffd8", 1);
      for (const [x, sp] of [[2, 0], [3, 0.3], [14, 0.6], [15, 0.15], [6, 0.8], [12, 0.45]]) {
        const ph = (t * 0.7 + sp) % 1;
        const y = ph < 0.5 ? 22 : 22 + Math.round((ph - 0.5) * 2 * 5);
        fade(c, ph < 0.5 ? 1 : 1 - (ph - 0.5) * 2, () => R(c, l + x, tp + y, 1, 2, "#7dff5a"));
      }
      const spread = Math.round((Math.sin(t * 1.5) + 1) * 1.5);
      R(c, l - spread, tp + 27, 18 + spread * 2, 1, "#2f8a3a");
    },
  });
}

// ---------- 20. Banshee Queen ----------
{
  const g = cg();
  g.rect(7, 3, 4, 5, "s"); g.set(8, 5, "e"); g.set(10, 5, "e"); g.rect(8, 7, 3, 2, "m");
  g.rect(6, 2, 6, 1, "w"); g.rect(6, 3, 1, 7, "w"); g.rect(11, 3, 1, 7, "w"); g.set(7, 1, "y"); g.set(9, 0, "y"); g.set(11, 1, "y"); g.rect(7, 2, 5, 1, "y");
  for (let y = 9; y <= 25; y++) { const hw = 2.5 + (y - 9) * 0.35; g.rect(Math.round(9 - hw), y, Math.round(hw * 2), 1, y > 21 ? (y % 2 ? "d" : "D") : "d"); }
  for (let x = 3; x <= 15; x += 3) g.set(x, 26, "D");
  g.rect(4, 11, 2, 1, "s"); g.rect(13, 11, 2, 1, "s"); g.set(3, 10, "s"); g.set(15, 10, "s");
  addSkin("legendary", {
    name: "Banshee Queen",
    pitch: "A floating ghost queen in a tattered gown, her long white hair streaming out to both sides as she wails, sending rings of sound pulsing out across the space.",
    float: bobf(3, 1.6),
    rows: g.rows(),
    pal: { s: "#d8e8f0", e: "#1a1024", m: "#1a1024", w: "#f3f8ff", y: "#9fd4ff", d: "#b8c8e8", D: "#8fa0c8" },
    animPal: (t) => ({ e: Math.sin(t * 3) > 0.7 ? "#7dfcff" : "#1a1024" }),
    under(c, l, tp, t) {
      glow(c, l + 9, tp + 12, 17, "#9fd4ff", 0.35);
      for (const dir of [-1, 1]) for (let k = 0; k < 9; k++) {
        const x = l + 9 + dir * (3 + k), y = tp + 3 + k + Math.round(Math.sin(t * 3 - k * 0.6) * 1.5);
        R(c, x, y, 1, 2, k % 3 === 2 ? "#d8e8f8" : "#f3f8ff");
      }
    },
    over(c, l, tp, t) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3) % 1;
        const r = 2 + ph * 12;
        fade(c, 0.8 * (1 - ph), () => {
          for (let a = 0; a < TAU; a += 0.35) R(c, l + 9 + Math.cos(a) * r, tp + 8 + Math.sin(a) * r * 0.6, 1, 1, "#b8feff");
        });
      }
      for (let k = 0; k < 4; k++) { const ph = (t * 0.6 + k / 4) % 1; fade(c, 0.6 * (1 - ph), () => R(c, l + 3 + k * 4 + Math.round(Math.sin(t * 2 + k) * 2), tp + 26 + ph * 4, 2, 1, "#b8c8e8")); }
    },
  });
}
})();
