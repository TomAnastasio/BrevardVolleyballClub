// ---------- Legendary transformations, batch B (XL21-XL40 in the full gallery) ----------
(() => {
const M = (t) => (reduced ? 0 : t);
const FIRE = ["#ffffff", "#fff3a0", "#ffd84a", "#ff7a1a", "#c4300a"];
const BLUEFIRE = ["#ffffff", "#d8f0ff", "#9fd4ff", "#4fb2ff", "#2a4a8f"];
const GREENFIRE = ["#ffffff", "#c8ffb0", "#7dff5a", "#3fb02f", "#1f5a26"];
const pick = (cols, ph) => cols[Math.min(cols.length - 1, Math.max(0, Math.floor(ph * cols.length)))];
// rising particles (flames, embers, smoke) inside a box, stateless
function rise(c, x0, y0, w, h, t, cols, n, speed = 2, seed = 0, alpha = 1) {
  for (let k = 0; k < n; k++) {
    const ph = (t * speed + k / n + hash(k, seed) * 0.5) % 1;
    const x = x0 + Math.floor(hash(k, seed, 7) * w) + Math.round(Math.sin(t * 6 + k) * ph);
    fade(c, alpha * (1 - ph * 0.7), () => R(c, x, y0 - ph * h, 1, 1, pick(cols, ph)));
  }
}
function line(c, x0, y0, x1, y1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) R(c, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 1, 1, col);
}
// jagged lightning between two points, re-rolled every step
function bolt(c, x0, y0, x1, y1, seed, col, jag = 1.6) {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const nx = x0 + (x1 - x0) * f + (i < n ? (hash(seed, i) - 0.5) * 2 * jag : 0);
    const ny = y0 + (y1 - y0) * f + (i < n ? (hash(seed, i, 3) - 0.5) * 2 * jag : 0);
    line(c, Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), col);
    px = nx; py = ny;
  }
}
const WISP = [".w.", "www", "w.w"];
function wisp(c, x, y, col) { spr(c, WISP, { w: col }, Math.round(x) - 1, Math.round(y) - 1); }

// ---------- 1 Grim Reaper Supreme ----------
addSkin("legendary", {
  name: "Grim Reaper Supreme",
  pitch: "Death itself: a floating black robe with burning red eyes, a scythe whose blade glows with ghost-light, and lost souls circling the hood.",
  pal: { r: "#231d33", R: "#14101c", k: "#07040f", h: "#ece6d6" },
  float: (t) => (reduced ? 2 : 2 + Math.round((Math.sin(t * 2) + 1) / 2)),
  rows: [
    "........rrr.......",
    ".......rrrrr......",
    "......rrrrrrr.....",
    "......rRkkkRr.....",
    "......rkkkkkr.....",
    "......rkkkkkr.....",
    ".....rrRkkkRrr....",
    "....rrrrrrrrrrr...",
    "...rrrrrrrrrrrrr..",
    "...rrrrrrrrrrrRr..",
    "..hrrrrrrrrrrrRr..",
    "...rrrrrrrrrrrRr..",
    "...rrrrrrrrrrrRr..",
    "...rrrrrrrrrrrRr..",
    "....rrrrrrrrrrR...",
    "....rrrrrrrrrrR...",
    "....rrrrrrrrrrRr..",
    "...rrrrrrrrrrrRr..",
    "...rrrrrrrrrrrRr..",
    "...rrrrrrrrrrrrRr.",
    "..rrrrrrrrrrrrrRr.",
    "..rrrrrrrrrrrrrRr.",
    ".rrrrrrrrrrrrrrRr.",
    ".r.rr.rrr.rr.rr.r.",
  ],
  under(c, l, tp, t) {
    glow(c, l + 9, tp + 10, 16, "#5ee84a", 0.12 + 0.05 * Math.sin(t * 3));
    for (let y = -4; y <= 22; y++) R(c, l + 2, tp + y, 1, 1, "#5a3a20");
    const blade = [[2, -5], [3, -6], [4, -6], [5, -6], [6, -5], [7, -4], [8, -3], [3, -5], [4, -5], [5, -5], [6, -4]];
    const pulse = Math.sin(t * 4) > 0;
    glow(c, l + 5, tp - 5, 7, "#7dff5a", 0.45 + 0.15 * Math.sin(t * 4));
    blade.forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, x >= 7 ? "#ffffff" : pulse ? "#c8ffb0" : "#7dff5a"));
  },
  over(c, l, tp, t) {
    const blink = t % 4 > 3.85;
    spr(c, [".sss.", blink ? "sssss" : "skssk", ".sss.", ".s.s."], { s: "#d8d0c0", k: "#ff3b4d" }, l + 7, tp + 3);
    glow(c, l + 9, tp + 5, 6, "#ff3b4d", 0.3);
    // souls circling the hood, fading as they pass behind
    for (let k = 0; k < 4; k++) {
      const a = M(t) * 1.3 + (k * TAU) / 4;
      const front = Math.sin(a) > 0;
      fade(c, front ? 0.95 : 0.35, () => wisp(c, l + 9 + Math.cos(a) * 9, tp + 9 + Math.sin(a) * 4, front ? "#e0ffd8" : "#7dff5a"));
    }
    rise(c, l + 1, tp + 24, 16, 6, t, ["#a99bc9", "#6b5f8d"], 6, 0.6, 11, 0.5);
  },
});

// ---------- 2 Alpha Werewolf ----------
addSkin("legendary", {
  name: "Alpha Werewolf",
  pitch: "A huge wolf throwing its head back to howl at a blazing full moon, eyes burning gold, as the howl ripples out across the sky.",
  pal: { F: "#3a2614", f: "#6b4a28", l: "#a8844e", y: "#ffd84a", n: "#8a6a3e", k: "#1a1024", c: "#ece6d6", p: "#3a4a78", w: "#ffffff" },
  rows: [
    "...........ff.....",
    "..........fnf.....",
    ".........fnnf.....",
    "....F...ffnf......",
    "....FF.fffff......",
    ".....Ffffyff......",
    ".....fffffff......",
    "....ffffffff......",
    "...fffffffffff....",
    "..ffffllllffff....",
    ".fffflllllfffff...",
    ".ffffllllllfffff..",
    "ff.ffllllllff.ff..",
    "ff.ffffffffff.ff..",
    "cc..ffffffff..cc..",
    "....pppppppp......",
    "....pp.pppppp.....",
    "....pp....pp......",
    "....ff....ff......",
    "...fff....fff.....",
    "...ff......ff.....",
    "....ff....ff......",
    "....ff....ff......",
    "...fff....fff.....",
    "..ffff....ffff....",
    "..cfcf....fcfc....",
  ],
  under(c, l, tp, t) {
    glow(c, l + 13, tp + 3, 16, "#fff3a0", 0.35 + 0.05 * Math.sin(t * 1.5));
    for (let y = -6; y <= 6; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, 36 - y * y)));
      R(c, l + 13 - half, tp + 2 + y, half * 2 + 1, 1, "#f3e9c0");
    }
    [[11, 0], [15, 4], [12, 5], [14, -2]].forEach(([x, y]) => R(c, l + x, tp + y, 2, 1, "#d9cf9e"));
  },
  over(c, l, tp, t) {
    const howling = (t % 4) < 2.6;
    glow(c, l + 9, tp + 5, 4, "#ffd84a", 0.45);
    if (howling) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 1.2 + k / 3) % 1;
        const r = 2 + ph * 9;
        fade(c, 1 - ph, () => {
          for (let a = -0.9; a <= 0.3; a += 0.18) R(c, l + 12 + Math.cos(a - 1.2) * r, tp - 1 + Math.sin(a - 1.2) * r, 1, 1, "#fff3a0");
        });
      }
    }
    rise(c, l, tp + 26, 18, 3, t, ["#a99bc9", "#6b5f8d"], 5, 0.4, 21, 0.5);
  },
});

// ---------- 3 It's Alive! ----------
addSkin("legendary", {
  name: "It's Alive!",
  pitch: "The monster at the moment of creation: lightning leaps from its neck bolts to the ground, the air flashes white, and sparks spray off its fists.",
  pal: { h: "#14101c", g: "#6b9a52", G: "#4a7038", b: "#a49db0", k: "#1a1024", w: "#f3efe6", m: "#2f3a2a", j: "#2a2433", J: "#1a1622", p: "#3a3646", B: "#14101c" },
  animPal: (t) => (Math.floor(t * 9) % 6 === 0 ? { w: "#9fd4ff", k: "#ffffff", g: "#9ad47a" } : {}),
  rows: [
    "....hhhhhhhhhh....",
    "....hhhhhhhhhh....",
    "....gkgkgkgggg....",
    "...bGGGGGGGGGGb...",
    "....gwkgggwkgg....",
    "....gggggggggG....",
    "....ggmmmmmmgG....",
    ".....ggggggggG....",
    ".......gggg.......",
    "...jjjjjjjjjjjJ...",
    "..jjjjjjjjjjjjJj..",
    "..jj.jjjjjjjjJ.jj.",
    "..jj.jjjjjjjjJ.jj.",
    "..jj.jjjjjjjjJ.jj.",
    "..gg.jjjjjjjjJ.gg.",
    "..gg.pppppppp..gg.",
    "..GG.pppp.pppp.GG.",
    ".....ppp...ppp....",
    ".....ppp...ppp....",
    ".....ggp...pgg....",
    ".....ppp...ppp....",
    "....BBBB...BBBB...",
    "....BBBB...BBBB...",
    "...BBBBB...BBBBB..",
    "...BBBBB...BBBBB..",
  ],
  under(c, l, tp, t) {
    const step = Math.floor(t * 9);
    glow(c, l + 9, tp + 10, 18, "#4fb2ff", step % 6 === 0 ? 0.55 : 0.18);
  },
  over(c, l, tp, t) {
    const step = Math.floor(t * 9);
    if (step % 3 !== 2) {
      bolt(c, l + 3, tp + 3, l - 1, tp + 24, step, "#d8f0ff");
      bolt(c, l + 14, tp + 3, l + 19, tp + 22, step + 50, "#d8f0ff");
      if (step % 2) bolt(c, l + 3, tp + 3, l + 8, tp - 5, step + 9, "#ffffff", 1);
      else bolt(c, l + 14, tp + 3, l + 10, tp - 5, step + 13, "#ffffff", 1);
    }
    R(c, l + 3, tp + 3, 1, 1, "#ffffff"); R(c, l + 14, tp + 3, 1, 1, "#ffffff");
    for (const [hx, seed] of [[3, 1], [15, 2]]) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 2.5 + k / 3 + seed * 0.3) % 1;
        fade(c, 1 - ph, () => R(c, l + hx + (k - 1) * ph * 4, tp + 15 + ph * 3 - Math.sin(ph * Math.PI) * 3, 1, 1, k === 1 ? "#ffffff" : "#9fd4ff"));
      }
    }
  },
});

// ---------- 4 Pharaoh Rising ----------
addSkin("legendary", {
  name: "Pharaoh Rising",
  pitch: "A golden sarcophagus stands open and a mummified pharaoh steps out with glowing eyes, while scarab beetles swarm and gold dust sparkles in the air.",
  pal: { g: "#ffc53a", G: "#b37a10", b: "#2a4a8f", s: "#d9cfb2", S: "#b9ae94", e: "#5ee84a", m: "#3a3044", y: "#ffc53a", c: "#4fb2ff", w: "#e8e0c8", W: "#b9ae94" },
  rows: [
    "......gggggg......",
    ".....gbgbgbgg.....",
    "....gbgggggbgg....",
    "....gbsssssbg.....",
    "....gbseseSbg.....",
    "....gbsssssbg.....",
    "....gbbsmssbbg....",
    ".....ggsssssgg....",
    ".....yyyyyyyy.....",
    "....ycycycycyc....",
    "....wwwwwwwww.....",
    "...wwWwwwwWwww....",
    "...w.wwWwwww.w....",
    "...w.wwwWwww.w....",
    "...ww.wwwwWw.ww...",
    ".....wwWwwww......",
    ".....wwwwWww......",
    ".....www.www......",
    ".....wWw.wwW......",
    ".....www.www......",
    ".....wwW.wWw......",
    ".....www.www......",
    "....wwww.wwww.....",
  ],
  under(c, l, tp, t) {
    // the open coffin behind him: dark interior, gold rim, two lids swung open
    glow(c, l + 9, tp + 10, 18, "#ffc53a", 0.25 + 0.06 * Math.sin(t * 2));
    for (let y = -3; y <= 22; y++) {
      const w = y < 0 ? 10 + y * 2 : y > 18 ? 12 : 14;
      R(c, l + 9 - w / 2 - 1, tp + y, w + 2, 1, "#b37a10");
      R(c, l + 9 - w / 2, tp + y, w, 1, "#1a1024");
    }
    for (const lx of [0, 16]) {
      for (let y = -2; y <= 22; y++) R(c, l + lx, tp + y, 2, 1, y % 5 === 0 ? "#2a4a8f" : "#ffc53a");
    }
  },
  over(c, l, tp, t) {
    glow(c, l + 8, tp + 4, 4, "#5ee84a", 0.5);
    for (let k = 0; k < 5; k++) {
      const a = M(t) * (k % 2 ? 1.1 : -0.8) + (k * TAU) / 5;
      const x = l + 9 + Math.cos(a) * (8 + (k % 2)), y = tp + 12 + Math.sin(a) * 9;
      spr(c, ["k.k", "kgk", ".k."], { k: "#1f4a3a", g: "#3fb0a0" }, Math.round(x) - 1, Math.round(y) - 1);
    }
    for (let k = 0; k < 6; k++) {
      const ph = (t * 0.8 + k / 6) % 1;
      if (Math.sin(t * 7 + k * 3) > 0.4) sparkle(c, l + 1 + Math.floor(hash(k, 4) * 16), tp + 22 - ph * 26, "#fff1b0", false);
    }
  },
});

// ---------- 5 Haunted Music Box ----------
const BALLERINA = [
  [".....sss....", "b...skks...b", ".b..ssss..b.", "..b..tt..b..", "...bbbbbb...", ".....bb.....", "....bbbb....", ".....bb.....", "...pppppp...", "..pPppppPp..", ".pppppppppp.", ".....bb.....", ".....b.b....", ".....b..b...", ".....b...b..", "....bb...bb."],
  [".....sss....", "....skks....", "...bssssb...", "..b..tt..b..", "..bbbbbbbb..", ".....bb.....", "....bbbb....", ".....bb.....", "...pppppp...", "..pPppppPp..", ".pppppppppp.", ".....bb.....", ".....bb.....", ".....bb.....", ".....bb.....", "....bbbb...."],
];
addSkin("legendary", {
  name: "Haunted Music Box",
  pitch: "An old music box with a mirrored lid where a tiny skeleton ballerina spins on her toes, ghostly notes drift up, and a pink glow pulses with the tune.",
  pal: { L: "#6b4a28", m: "#7a6aa0", M: "#c9c2d9", b: "#3a1f4a", B: "#2a1636", g: "#ffc53a", p: "#ff8fb8", f: "#3a2614" },
  rows: [
    "..LLLLLLLLLLLLLL..",
    "..LmmmmmmmmmmmmL..",
    "..LmMmmmmmmmmmmL..",
    "..LmmMmmmmmmmmmL..",
    "..LmmmmmmmmmmmmL..",
    "..LmmmmmmmmmmmmL..",
    "..LmmmmmmmmmmmmL..",
    "..LmmmmmmmmmmmmL..",
    "..LmmmmmmmmmmmmL..",
    "..LLLLLLLLLLLLLL..",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "bbbbbbbbbbbbbbbbbb",
    "bggggggggggggggggb",
    "bgBBBBBBBBBBBBBBgb",
    "bgBpBBBBpBBBBpBBgb",
    "bgBBBBBBBBBBBBBBgb",
    "bggggggggggggggggb",
    ".ff............ff.",
  ],
  under(c, l, tp, t) { glow(c, l + 9, tp + 14, 15, "#ff8fb8", 0.25 + 0.1 * Math.sin(t * 3)); },
  over(c, l, tp, t) {
    // spinning: front pose, then turned (mirrored), switching quickly
    const ph = Math.floor(M(t) * 6) % 4;
    const frame = BALLERINA[ph % 2 ? 1 : 0];
    const pal = { s: "#ece6d6", k: "#1a1024", t: "#ece6d6", b: "#ece6d6", p: "#ff8fb8", P: "#ffc0dc" };
    if (ph === 2) {
      c.save(); c.translate(l * 2 + 18, 0); c.scale(-1, 1); spr(c, frame, pal, l + 3, tp + 5); c.restore();
    } else spr(c, frame, pal, l + 3, tp + 5);
    R(c, l + 8, tp + 21, 2, 1, "#fff1b0");
    // music notes
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.5 + k / 3) % 1;
      fade(c, 1 - q, () => spr(c, [".n", ".n", "nn"], { n: k % 2 ? "#ff8fb8" : "#d8d0ec" }, l + 14 - k * 5 + Math.round(Math.sin(t * 2 + k) * 2), tp + 18 - q * 22));
    }
    if (Math.sin(t * 5) > 0.6) sparkle(c, l + 5, tp + 3, "#ffffff", false);
  },
});

// ---------- 6 Spider Queen ----------
addSkin("legendary", {
  name: "Spider Queen",
  pitch: "A giant crowned spider with a glowing red hourglass, eight long legs filling the space, webs spreading behind her, and spiderlings dropping on silk threads.",
  pal: { y: "#ffc53a", h: "#231d33", r: "#ff3b4d", a: "#2a2238", A: "#1a1528", R: "#ff3b4d" },
  rows: [
    "......y.y.y.......",
    "......yyyyy.......",
    ".......hhh........",
    "......hrhrh.......",
    "......hhhhh.......",
    ".......hhh........",
    "......aaaaa.......",
    ".....aaaaaaa......",
    "....aaaaaaaaa.....",
    "....aaaaRaaaa.....",
    "....aaaRRRaaa.....",
    "....aaaaRaaaa.....",
    "....aaaRRRaaa.....",
    "....aaaaaaaaa.....",
    ".....aaaaaaa......",
    "......aaaaa.......",
    ".......aaa........",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
  ],
  under(c, l, tp, t) {
    // web spreading from the corners, pulsing
    const a = 0.35 + 0.15 * Math.sin(t * 2);
    fade(c, a, () => {
      for (const [cx, cy] of [[-1, -1], [18, -1]]) {
        for (let k = 0; k < 5; k++) line(c, l + cx, tp + cy, l + cx + (cx < 0 ? 1 : -1) * (3 + k * 3), tp + cy + 15 - k * 3, "#d8d0ec");
        for (let r = 4; r <= 12; r += 4) for (let k = 0; k <= 8; k++) {
          const ang = (k / 8) * (Math.PI / 2);
          R(c, l + cx + (cx < 0 ? 1 : -1) * Math.cos(ang) * r, tp + cy + Math.sin(ang) * r, 1, 1, "#d8d0ec");
        }
      }
    });
    glow(c, l + 8, tp + 10, 12, "#ff3b4d", 0.2 + 0.1 * Math.sin(t * 4));
    // eight legs from the body down to the ground
    const step = M(t) * 3;
    const legs = [[-1, 7, -7, 27], [-1, 9, -5, 27], [-1, 11, -3, 27], [-1, 13, -1, 27], [1, 7, 7, 27], [1, 9, 5, 27], [1, 11, 3, 27], [1, 13, 1, 27]];
    legs.forEach(([side, y0, dx, y1], i) => {
      const x0 = 8 + side * 4, lift = Math.round(Math.max(0, Math.sin(step + i * 1.7)) * 1.5);
      const kx = x0 + side * 6, ky = y0 - 4 + (i % 4);
      line(c, l + x0, tp + y0, l + kx, tp + ky, "#2a2238");
      line(c, l + kx, tp + ky, l + x0 + dx + side * 6, tp + y1 - lift, "#2a2238");
      R(c, l + kx, tp + ky, 1, 1, "#4a3a6a");
    });
  },
  over(c, l, tp, t) {
    const glowR = Math.sin(t * 4) > 0 ? "#ff6b7a" : "#ff3b4d";
    [[8, 9], [7, 10], [8, 10], [9, 10], [8, 11], [7, 12], [8, 12], [9, 12]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, glowR));
    for (let k = 0; k < 3; k++) {
      const ph = ((M(t) * 0.35 + k / 3) % 1);
      const x = l + [1, 15, 12][k], y = tp - 2 + Math.sin(ph * Math.PI) * [10, 14, 7][k];
      line(c, x, tp - 3, x, y, "#a99bc9");
      spr(c, ["k.k", ".k.", "k.k"], { k: "#d8d0ec" }, x - 1, y);
    }
  },
});

// ---------- 7 Swamp Hydra ----------
addSkin("legendary", {
  name: "Swamp Hydra",
  pitch: "Three serpent heads on long swaying necks rise from a bubbling green pool, eyes glowing, tongues flicking, one of them hissing out poison mist.",
  pal: { w: "#2f8a5a", W: "#5ec88a", d: "#1f5a3a" },
  rows: [
    "..................", "..................", "..................", "..................", "..................", "..................",
    "..................", "..................", "..................", "..................", "..................", "..................",
    "..................", "..................", "..................", "..................", "..................", "..................",
    "..................", "..................", "..................", "..................", "..................", "..................",
    "..wwwwwwwwwwwwww..",
    ".wwWwwwwwwwwWwwww.",
    "wwwwwwwWwwwwwwwwww",
    ".dwwwwwwwwwwwwwwd.",
  ],
  under(c, l, tp, t) { glow(c, l + 9, tp + 20, 18, "#5ee84a", 0.22 + 0.06 * Math.sin(t * 2)); },
  over(c, l, tp, t) {
    const heads = [[4, 7, 0], [9, 2, 1], [14, 8, 2]];
    for (const [bx, hy, i] of heads) {
      let hx = bx;
      for (let y = 25; y >= hy + 3; y--) {
        const x = Math.round(bx + Math.sin(y * 0.45 + M(t) * 1.6 + i * 2) * 1.6);
        R(c, l + x, tp + y, 2, 1, "#3f7a5a"); R(c, l + x + 1, tp + y, 1, 1, "#7ab88a");
        if (y % 3 === 0) R(c, l + x, tp + y, 1, 1, "#2a5a40");
        hx = x;
      }
      const dir = i === 0 ? -1 : 1;
      const hxl = hx + (dir < 0 ? -2 : 0);
      spr(c, dir < 0 ? ["..ggg", ".ggeg", "gggggg", ".gggg."] : ["ggg..", "gegg.", "gggggg", ".gggg."], { g: "#3f7a5a", e: Math.sin(t * 5 + i) > -0.6 ? "#ffd84a" : "#3f7a5a" }, l + hxl, tp + hy);
      if (Math.floor(t * 4 + i) % 3 === 0) { R(c, l + hxl + (dir < 0 ? -1 : 6), tp + hy + 2, 1, 1, "#ff3b4d"); R(c, l + hxl + (dir < 0 ? -2 : 7), tp + hy + 1, 1, 1, "#ff3b4d"); }
      glow(c, l + hxl + 3, tp + hy + 1, 3, "#ffd84a", 0.35);
    }
    // poison mist from the middle head
    rise(c, l + 10, tp + 4, 6, 7, t, ["#c8ffb0", "#7dff5a", "#3fb02f"], 6, 0.9, 77, 0.7);
    // bubbles in the pool
    for (let k = 0; k < 4; k++) {
      const ph = (t * 1.1 + k / 4) % 1;
      if (ph < 0.8) R(c, l + 2 + k * 4, tp + 24 - ph * 3, 1, 1, "#b7ff9e");
    }
  },
});

// ---------- 8 Candy Golem ----------
addSkin("legendary", {
  name: "Candy Golem",
  pitch: "A hulking golem built from Halloween candy: a gumdrop head with lollipop eyes, a chocolate-bar body and candy-cane arms, with sweets orbiting it and sugar sparkling in the air.",
  pal: { p: "#ff6fb5", P: "#c44a8a", w: "#ffffff", k: "#c42a3e", m: "#7a1a4a", c: "#6b3a1a", C: "#4a2410", r: "#e0384e", W: "#f3efe6", y: "#ffd84a", o: "#ff7a1a", g: "#5ee84a", G: "#3fb02f" },
  rows: [
    "......pppppp......",
    ".....pppppppp.....",
    "....pppppppppP....",
    "....pwkpppwkpP....",
    "....pkwpppkwpP....",
    "....pppppppppP....",
    "....ppmmmmmmpP....",
    ".....ppppppppP....",
    "..cccccccccccccc..",
    ".rcCcccCcccCcccCW.",
    ".WccccccccccccccrW",
    ".rcCcccCcccCcccCW.",
    ".WccccccccccccccrW",
    ".rcCcccCcccCcccCW.",
    "..ccccccccccccccr.",
    "..cCcccCcccCcccC..",
    "..cccccccccccccc..",
    "....gggg..gggg....",
    "....gggg..gggg....",
    "....GggG..GggG....",
    "...yyyyy..yyyyy...",
    "...ooooo..ooooo...",
    "...WWWWW..WWWWW...",
  ],
  under(c, l, tp, t) { glow(c, l + 9, tp + 10, 17, "#ff8fb8", 0.2 + 0.06 * Math.sin(t * 2)); },
  over(c, l, tp, t) {
    // lollipop-swirl eyes
    const sw = Math.floor(M(t) * 4) % 2;
    R(c, l + 5 + sw, tp + 3 + sw, 1, 1, "#ffffff"); R(c, l + 11 - sw, tp + 4 - sw, 1, 1, "#ffffff");
    const SWEETS = [
      [".y.", "yoy", "WWW"],
      ["r.r", "rWr", "r.r"],
      [".pp.", "pWWp", ".pp.", "..k."],
      ["g.g", "ggg", "g.g"],
    ];
    const PAL = { y: "#ffd84a", o: "#ff7a1a", W: "#ffffff", r: "#e0384e", p: "#c46bff", k: "#e8dff5", g: "#5ee84a" };
    SWEETS.forEach((s, k) => {
      const a = M(t) * 1.2 + (k * TAU) / 4;
      fade(c, Math.sin(a) > -0.3 ? 1 : 0.4, () => spr(c, s, PAL, Math.round(l + 9 + Math.cos(a) * 11) - 1, Math.round(tp + 11 + Math.sin(a) * 5) - 1));
    });
    for (let k = 0; k < 6; k++) {
      const ph = (t * 0.7 + k / 6) % 1;
      fade(c, 1 - ph, () => R(c, l + Math.floor(hash(k, 8) * 18), tp + ph * 26 - 2, 1, 1, ["#ff6fb5", "#ffd84a", "#4fb2ff", "#5ee84a", "#ffffff", "#c46bff"][k]));
      if (Math.sin(t * 6 + k * 2) > 0.85) sparkle(c, l + Math.floor(hash(k, 9) * 18), tp + Math.floor(hash(k, 10) * 22), "#ffffff", false);
    }
  },
});

// ---------- 9 Disco Skeleton ----------
const DANCE = [
  ["b...sssss..b", ".b..skssk.b.", "..b.sssss.b.", "...b.sts.b..", "....b.s.b...", "....bbbbb...", ".....bbb....", "......b.....", ".....bbb....", "......b.....", ".....bbb....", "......b.....", "....bbbbb...", "....b...b...", "...b.....b..", "...b.....b..", "..b.......b.", "..b.......b.", ".bb.......bb"],
  ["..........b.", "....sssss.b.", "....skssk.b.", "....sssssb..", ".....sts.b..", "......s.b...", "...bbbbbb...", "..b...b.....", "..b..bbb....", "...b..b.....", "....bbbb....", "......b.....", "....bbbbb...", "....b...b...", "....b....b..", "....b.....b.", "....b......b", "....b.......", "...bb......."],
];
addSkin("legendary", {
  name: "Disco Skeleton",
  pitch: "A skeleton busting moves under a spinning disco ball, colored spotlights sweeping the floor, the dance-floor tiles lighting up with every step.",
  pal: { L: "#a99bc9", D: "#e8e0f0", d: "#7a6aa0" },
  rows: [
    "........L.........",
    "........L.........",
    ".......DdD........",
    "......DdDdD.......",
    ".......DdD........",
  ].concat(Array(23).fill("..................")),
  under(c, l, tp, t) {
    const hue = Math.round((t * 90) % 360);
    // sweeping spotlight beams from the ball
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + Math.sin(M(t) * 1.5 + k * 2.1) * 0.7;
      fade(c, 0.22, () => { c.fillStyle = `hsl(${(hue + k * 120) % 360} 100% 60%)`; c.beginPath(); c.moveTo(l + 9, tp + 4); c.lineTo(l + 9 + Math.cos(a - 0.12) * 30, tp + 4 + Math.sin(a - 0.12) * 30); c.lineTo(l + 9 + Math.cos(a + 0.12) * 30, tp + 4 + Math.sin(a + 0.12) * 30); c.fill(); });
    }
    // floor tiles
    for (let x = 0; x < 18; x += 3) {
      const on = (Math.floor(t * 4) + x / 3) % 3 === 0;
      R(c, l + x, tp + 27, 3, 1, on ? `hsl(${(hue + x * 20) % 360} 100% 65%)` : "#2a1d48");
    }
  },
  over(c, l, tp, t) {
    const beat = Math.floor(M(t) * 2.5) % 2;
    const hue = Math.round((t * 90) % 360);
    const frame = DANCE[beat];
    spr(c, frame, { b: "#ece6d6", s: "#ece6d6", k: `hsl(${hue} 100% 60%)`, t: "#1a1024" }, l + 3, tp + 8);
    // disco ball facets twinkle
    for (let k = 0; k < 2; k++) if (Math.sin(t * 8 + k * 3) > 0.4) R(c, l + 7 + k * 3, tp + 3 - (k % 2), 1, 1, "#ffffff");
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.2 + k / 3) % 1;
      if (ph < 0.25) sparkle(c, l + [1, 16, 14][k], tp + [6, 12, 3][k], `hsl(${(hue + k * 100) % 360} 100% 75%)`, ph < 0.12);
    }
  },
});

// ---------- 10 Black Cat Familiar ----------
addSkin("legendary", {
  name: "Black Cat Familiar",
  pitch: "A giant witch's cat sitting tall on a glowing magic circle, green eyes blazing, tail swishing, and a crescent-moon charm shining on its collar.",
  pal: { k: "#1f1a2e", K: "#3a2d5c", p: "#ff8fb8", e: "#7dff5a", E: "#0b0614", n: "#ff8fb8", y: "#c46bff" },
  rows: [
    "...k........k.....",
    "...kk......kk.....",
    "...kkk....kkk.....",
    "...kpkkkkkkpk.....",
    "...kkkkkkkkkk.....",
    "..Kkkkkkkkkkkk....",
    "..KkeekkkkeekK....",
    "..KkeEkkkkeEkK....",
    "..Kkkkkknkkkkk....",
    "...Kkkkkkkkkk.....",
    "....kkyyyykk......",
    "...Kkkkkkkkkk.....",
    "..Kkkkkkkkkkkk....",
    ".Kkkkkkkkkkkkkk...",
    ".Kkkkkkkkkkkkkk...",
    ".Kkkkkkkkkkkkkk...",
    "Kkkkkkkkkkkkkkkk..",
    "Kkkkkkkkkkkkkkkk..",
    "Kkkkkkkkkkkkkkkk..",
    "Kkkkkkkkkkkkkkkk..",
    ".Kkkkkkkkkkkkkk...",
    ".Kkkkkkkkkkkkkk...",
    ".Kkk.kkkkkk.kkk...",
    "Kkkk.kkkkkk.kkkk..",
  ],
  animPal: (t) => (t % 4.5 > 4.35 ? { e: "#1f1a2e", E: "#1f1a2e" } : { e: Math.sin(t * 3) > 0 ? "#b7ff9e" : "#7dff5a" }),
  under(c, l, tp, t) {
    // magic circle on the floor
    glow(c, l + 8, tp + 23, 14, "#c46bff", 0.35 + 0.1 * Math.sin(t * 2.5));
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU + M(t) * 0.6;
      R(c, l + 8 + Math.cos(a) * 10, tp + 23 + Math.sin(a) * 2.5, 1, 1, k % 3 === 0 ? "#f0d8ff" : "#c46bff");
    }
    // tail swishing up the right side
    const sw = Math.sin(M(t) * 2) * 2;
    for (let y = 22; y >= 9; y--) {
      const f = (22 - y) / 13;
      R(c, l + 15 + Math.round(Math.sin(f * 3 + sw * 0.5) * 1.5 + f * sw), tp + y, 2, 1, "#1f1a2e");
    }
  },
  over(c, l, tp, t) {
    glow(c, l + 5, tp + 6, 3, "#7dff5a", 0.4); glow(c, l + 11, tp + 6, 3, "#7dff5a", 0.4);
    spr(c, [".y", "y.", ".y"], { y: Math.sin(t * 4) > 0 ? "#fff1b0" : "#ffd84a" }, l + 7, tp + 11);
    // whiskers
    [[1, 8], [0, 9], [14, 8], [15, 9]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, "#a99bc9"));
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.7 + k / 4) % 1;
      if (ph < 0.3) sparkle(c, l + [0, 16, 3, 13][k], tp + 20 - ph * 12, "#f0d8ff", ph < 0.15);
    }
  },
});

// ---------- 11 Cosmic Ghost ----------
const BOO = [
  "......wwwwww......",
  "....wwwwwwwwww....",
  "...wwwwwwwwwwww...",
  "..wwwwwwwwwwwwww..",
  "..wwwwwwwwwwwwww..",
  ".wwwwkkwwwwkkwwww.",
  ".wwwwkkwwwwkkwwww.",
  ".wwwwwwwwwwwwwwww.",
  ".wwwwwwwkkwwwwwww.",
  ".wwwwwwwkkwwwwwww.",
  ".wwwwwwwwwwwwwwww.",
  "wwwwwwwwwwwwwwwwww",
  "wwwwwwwwwwwwwwwwww",
  "ww.wwwwwwwwwwww.ww",
  "...wwwwwwwwwwww...",
  "...wwwwwwwwwwww...",
  "...wwwwwwwwwwww...",
  "..wwwwwwwwwwwwww..",
  "..wwwwwwwwwwwwww..",
  "..wwwwwwwwwwwwww..",
  ".wwwwwwwwwwwwwwww.",
];
addSkin("legendary", {
  name: "Cosmic Ghost",
  pitch: "A giant bedsheet ghost made of outer space: stars and nebulas drift through its body, tiny planets orbit it, and its edges shimmer with starlight.",
  pal: { w: "#141c4a", k: "#ffffff" },
  float: (t) => (reduced ? 3 : 3 + Math.round((Math.sin(t * 1.6) + 1) * 1.2)),
  rows: BOO,
  under(c, l, tp, t) { glow(c, l + 9, tp + 10, 18, "#7a4ad9", 0.4 + 0.1 * Math.sin(t * 2)); },
  over(c, l, tp, t) {
    // nebula and stars only inside the ghost
    for (let j = 0; j < BOO.length; j++) for (let i = 0; i < BOO[j].length; i++) {
      if (BOO[j][i] !== "w") continue;
      const n = Math.sin(i * 0.6 + j * 0.4 + M(t) * 0.8) + Math.sin(i * 0.3 - j * 0.5 + M(t) * 0.5);
      if (n > 1.2) R(c, l + i, tp + j, 1, 1, "#4a2a8f");
      else if (n < -1.3) R(c, l + i, tp + j, 1, 1, "#1c3a7a");
      const edge = BOO[j][i - 1] !== "w" || BOO[j][i + 1] !== "w" || !BOO[j - 1] || BOO[j - 1][i] !== "w";
      if (edge) R(c, l + i, tp + j, 1, 1, Math.sin(t * 3 + i + j) > 0 ? "#b9a0ff" : "#7a9ae0");
    }
    for (let k = 0; k < 9; k++) {
      const i = Math.floor(hash(k, 31) * 18), j = Math.floor(((hash(k, 32) * 21 + M(t) * 1.5) % 21));
      if (BOO[j] && BOO[j][i] === "w") R(c, l + i, tp + j, 1, 1, (k + Math.floor(t * 3)) % 3 ? "#ffffff" : "#ffd84a");
    }
    // eyes glow, hem waves
    glow(c, l + 6, tp + 6, 3, "#9fd4ff", 0.5); glow(c, l + 12, tp + 6, 3, "#9fd4ff", 0.5);
    const wv = reduced ? 0 : Math.floor(t * 3) % 2;
    for (let x = 1; x < 17; x++) if ((x + wv) % 3) R(c, l + x, tp + 21, 1, 1, "#141c4a");
    // planets
    const a = M(t) * 1.1;
    fade(c, Math.sin(a) > 0 ? 1 : 0.5, () => spr(c, [".o.", "ooo", ".o."], { o: "#ff7a1a" }, Math.round(l + 9 + Math.cos(a) * 12) - 1, Math.round(tp + 10 + Math.sin(a) * 4) - 1));
    const b = M(t) * 0.8 + 2.5;
    fade(c, Math.sin(b) > 0 ? 1 : 0.5, () => { spr(c, [".pp.", "pppp", ".pp."], { p: "#4fb2ff" }, Math.round(l + 9 + Math.cos(b) * 10) - 2, Math.round(tp + 14 + Math.sin(b) * 3) - 1); });
    if (Math.sin(t * 5) > 0.6) sparkle(c, l + 2, tp + 1, "#ffffff", true);
  },
});

// ---------- 12 Gargoyle Awakened ----------
addSkin("legendary", {
  name: "Gargoyle Awakened",
  pitch: "A stone gargoyle cracking to life with its wings spread wide, molten light pouring through glowing runes, its eyes igniting and chips of stone breaking away.",
  pal: { W: "#4a4558", w: "#6b6380", g: "#8a8494", G: "#6b6578", h: "#5a5468", e: "#ff7a1a", c: "#ff7a1a", t: "#ece6d6", k: "#3a3546" },
  rows: [
    "W.......h..h.....W",
    "WW......hhhh....WW",
    "WWW....gggggg..WWW",
    "WwWW..ggeggegg.WWwW",
    "WwwWW.gggggggg.WWwwW",
    "WwwwWW.gtgtgtg.WWwwwW",
    "WwwwwWWkggggggkWWwwwW",
    ".WwwwwWggggggggWwwwW.",
    "..WwwwWggcggcggWwwW..",
    "...WwwWgggggggGWwW...",
    "....WWWggccggGGWW....",
    ".....WWgggggggGW.....",
    "......gggggggGG......",
    ".....ggg.ggg.GGG.....",
    ".....gg..ggg..GG.....",
    "....ggg..ggg..GGG....",
    "....ggg.......GGG....",
    "...gggg.......GGGG...",
    "...kkkkkkkkkkkkkkk...",
    "..kkkkkkkkkkkkkkkkk..",
  ].map((r) => r.slice(1, 19)),
  animPal: (t) => {
    const p = Math.sin(t * 3) > 0;
    return { c: p ? "#ffd84a" : "#ff7a1a", e: Math.floor(t * 8) % 5 === 0 ? "#ffffff" : "#ff7a1a" };
  },
  under(c, l, tp, t) { glow(c, l + 9, tp + 8, 16, "#ff7a1a", 0.25 + 0.1 * Math.sin(t * 3)); },
  over(c, l, tp, t) {
    // cracks of light across the chest
    const crk = Math.sin(t * 3) > 0 ? "#ffd84a" : "#ff7a1a";
    [[9, 9], [10, 10], [9, 11], [8, 12]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, crk));
    glow(c, l + 9, tp + 3, 4, "#ff7a1a", 0.5);
    // stone chips falling
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.6 + k / 4) % 1;
      fade(c, 1 - ph, () => R(c, l + 3 + k * 4, tp + 6 + ph * 16, 1, 1, "#8a8494"));
    }
    rise(c, l + 4, tp + 10, 10, 10, t, FIRE.slice(1), 5, 0.7, 41, 0.8);
  },
});

// ---------- 13 Hellhound ----------
addSkin("legendary", {
  name: "Hellhound",
  pitch: "A charcoal-black hound with lava glowing through its cracked hide, a mane and tail of roaring flames, burning eyes and fire puffing from its jaws.",
  pal: { k: "#3a2626", K: "#1f1414", e: "#ffd84a", l: "#ff7a1a", t: "#ece6d6" },
  rows: [
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "..................",
    "............k..k..",
    "...........kkkkk..",
    "..........kkkekk..",
    "..........kkkkkkkk",
    ".........kkkkkkKKK",
    "..k......kkkkkt.t.",
    "...kkkkkkkkkkk....",
    "..kkklkkkkklkk....",
    "..kkkkkklkkkkk....",
    "..kklkkkkkkklk....",
    "..kkkkkkkkkkkk....",
    "..kkk......kkk....",
    "..kk.k....kk.k....",
    "..kk.k....kk.k....",
    "..kk.k....kk.k....",
    "..kk.k....kk.k....",
    ".kKk.kK..kKk.kK...",
  ],
  animPal: (t) => ({ l: Math.sin(t * 5) > 0 ? "#ffd84a" : "#ff7a1a", e: Math.floor(t * 7) % 4 ? "#ffd84a" : "#ffffff" }),
  under(c, l, tp, t) { glow(c, l + 9, tp + 18, 16, "#ff4a1a", 0.3 + 0.1 * Math.sin(t * 9)); },
  over(c, l, tp, t) {
    // flaming mane along the neck and back, flaming tail
    rise(c, l + 7, tp + 16, 8, 11, t, FIRE, 22, 2.2, 51);
    rise(c, l + 3, tp + 17, 6, 6, t, FIRE, 12, 2.4, 52);
    rise(c, l + 1, tp + 16, 2, 9, t, FIRE, 10, 2.6, 53);
    glow(c, l + 13, tp + 12, 3, "#ffd84a", 0.6);
    // fire breath puffs
    for (let k = 0; k < 4; k++) {
      const ph = (t * 1.4 + k / 4) % 1;
      if (t % 3 < 1.6) fade(c, 1 - ph, () => R(c, l + 18 + ph * 6, tp + 14 - ph * 2 + Math.sin(k * 2) * ph * 2, ph > 0.5 ? 2 : 1, 1, pick(FIRE, ph)));
    }
    // burning paw prints
    for (const x of [1, 6, 9, 14]) R(c, l + x, tp + 27, 2, 1, Math.sin(t * 7 + x) > 0 ? "#ff7a1a" : "#c4300a");
  },
});

// ---------- 14 Plague Alchemist ----------
addSkin("legendary", {
  name: "Plague Alchemist",
  pitch: "A plague doctor in a long black coat and wide hat, goggles glowing green, holding a bubbling flask while potion bottles orbit and toxic smoke curls around.",
  pal: { h: "#1a1622", H: "#2a2433", b: "#e8e0c8", B: "#b9ae94", g: "#5ee84a", c: "#231d33", C: "#14101c", y: "#c9a24a", l: "#6b4a28", f: "#3a3646" },
  rows: [
    "......hhhhhh......",
    ".....hhhhhhhh.....",
    "..HHHHHHHHHHHHHH..",
    "......bbbbbb......",
    ".....bgbbbgbb.....",
    ".....bbbbbbbbbb...",
    "......bbbbbbbBBB..",
    ".......bbbb...B...",
    "....cccccccccc....",
    "...cccccyccccCc...",
    "..cc.cccccccC.cc..",
    "..cc.cyccccyC.cc..",
    "..cc.lllllllC.cc..",
    "..bb.cccccccC.bb..",
    ".....cccccccC.....",
    ".....cccccccCC....",
    "....cccc.cccCC....",
    "....ccc...ccCC....",
    "....ccc...cccC....",
    "....ccc...cccC....",
    ".....ff...ff......",
    ".....ff...ff......",
    "....fff...fff.....",
  ],
  animPal: (t) => ({ g: Math.sin(t * 4) > 0 ? "#b7ff9e" : "#5ee84a" }),
  under(c, l, tp, t) { glow(c, l + 9, tp + 12, 16, "#5ee84a", 0.18 + 0.06 * Math.sin(t * 3)); },
  over(c, l, tp, t) {
    glow(c, l + 7, tp + 4, 3, "#7dff5a", 0.5); glow(c, l + 11, tp + 4, 3, "#7dff5a", 0.5);
    // flask in the right hand
    spr(c, [".W.", ".W.", "WgW", "ggg", ".g."], { W: "#d8d0ec", g: "#7dff5a" }, l + 14, tp + 11);
    rise(c, l + 14, tp + 11, 3, 6, t, ["#c8ffb0", "#7dff5a"], 4, 1.2, 61);
    // potions orbiting
    const POT = [[".k.", "ppp", "ppp"], [".k.", "rrr", ".r."], [".k.", "bbb", "bbb"]];
    POT.forEach((p, k) => {
      const a = M(t) * 1.1 + (k * TAU) / 3;
      fade(c, Math.sin(a) > -0.2 ? 1 : 0.35, () => spr(c, p, { k: "#d8d0ec", p: "#c46bff", r: "#ff3b4d", b: "#4fb2ff" }, Math.round(l + 9 + Math.cos(a) * 11) - 1, Math.round(tp + 13 + Math.sin(a) * 4) - 1));
    });
    // smoke at the feet
    rise(c, l + 1, tp + 22, 16, 6, t, ["#7dff5a", "#3fb02f", "#a99bc9"], 8, 0.5, 62, 0.55);
  },
});

// ---------- 15 Phantom Knight ----------
addSkin("legendary", {
  name: "Phantom Knight",
  pitch: "An empty suit of ghostly armor with a burning blue visor, raising a sword wreathed in blue flame, its tattered cape drifting on a wind that isn't there.",
  pal: { a: "#8aa8d8", A: "#5a78b0", d: "#3a4a78", v: "#07040f", c: "#2a3a6a", C: "#1c2a50" },
  float: (t) => (reduced ? 1 : 1 + Math.round((Math.sin(t * 2) + 1) / 2)),
  rows: [
    ".......aaaa.......",
    "......aaaaaA......",
    "......avvvvA......",
    "......aaaaaA......",
    "......aaadaA......",
    ".......aaaA.......",
    "...AAaaaaaaaAAA...",
    "..AaaadaaaadaaAA..",
    "..Aa.aaaaaaaA.aA..",
    "..Aa.aadddaaA.aA..",
    "..Aa.aaaaaaaA.aA..",
    "..aa.aaaaaaaA.aa..",
    ".....dddddddd.....",
    ".....aaaaaaaA.....",
    ".....aaa..aaA.....",
    ".....aa....aA.....",
    ".....aa....aA.....",
    ".....aa....aA.....",
    "....aaa....aAA....",
    "....AAA....AAA....",
  ],
  under(c, l, tp, t) {
    glow(c, l + 9, tp + 10, 17, "#4fb2ff", 0.3 + 0.08 * Math.sin(t * 2));
    // tattered cape behind
    const sw = Math.sin(M(t) * 2);
    for (let y = 6; y <= 22; y++) {
      const f = (y - 6) / 16, x0 = 3 - Math.round(f * (2 + sw)), x1 = 14 + Math.round(f * (2 - sw));
      for (let x = x0; x <= x1; x++) if (!(y > 18 && (x + y) % 3 === 0)) R(c, l + x, tp + y, 1, 1, x > 9 ? "#1c2a50" : "#2a3a6a");
    }
  },
  over(c, l, tp, t) {
    const vis = Math.sin(t * 5) > 0 ? "#9fd4ff" : "#4fb2ff";
    R(c, l + 7, tp + 2, 4, 1, vis);
    glow(c, l + 9, tp + 2, 4, "#4fb2ff", 0.6);
    // sword raised in the right hand, blade on fire
    for (let y = -5; y <= 10; y++) R(c, l + 16, tp + y, 1, 1, y > 7 ? "#5a3a20" : "#d8f0ff");
    R(c, l + 15, tp + 8, 3, 1, "#8aa8d8");
    glow(c, l + 16, tp + 2, 6, "#4fb2ff", 0.5);
    rise(c, l + 15, tp + 8, 3, 13, t, BLUEFIRE, 10, 2, 71);
    // wisps leaking from the joints
    rise(c, l + 4, tp + 12, 10, 8, t, ["#d8f0ff", "#9fd4ff", "#4fb2ff"], 5, 0.6, 72, 0.6);
  },
});

// ---------- 16 Eldritch Eye ----------
addSkin("legendary", {
  name: "Eldritch Eye",
  pitch: "A giant floating eyeball with bloodshot veins that follows whoever is across the net, while tentacles writhe beneath it and a purple aura throbs.",
  pal: { w: "#f3efe6", W: "#d9d2e6", v: "#c42a3e" },
  float: (t) => (reduced ? 0 : Math.round((Math.sin(t * 1.5) + 1))),
  rows: [
    "......wwwwww......",
    "....wwwwwwwwWW....",
    "...wwwvwwwwwwWW...",
    "..wwwwwvwwwwwwWW..",
    "..wvwwwwwwwwwvwW..",
    ".wwwvwwwwwwwwvwWW.",
    ".wwwwwwwwwwwwwwWW.",
    ".wwwwwwwwwwwwwwWW.",
    ".wwwwwwwwwwwwwwWW.",
    ".wwvwwwwwwwwwwwWW.",
    "..wwvwwwwwwwvwWW..",
    "..wwwwwwwwwwvwWW..",
    "...wwwwwwwwwwWW...",
    "....wwwwwwwwWW....",
    "......wwwwww......",
  ].concat(Array(13).fill("..................")),
  under(c, l, tp, t) {
    glow(c, l + 9, tp + 8, 18, "#7a4ad9", 0.35 + 0.15 * Math.sin(t * 3));
    // tentacles writhing below
    for (let k = 0; k < 5; k++) {
      const bx = 3 + k * 3;
      for (let y = 12; y <= 27; y++) {
        const f = (y - 12) / 15;
        const x = bx + Math.sin(f * 4 + M(t) * 2 + k * 1.3) * (1 + f * 2);
        R(c, l + x, tp + y, f > 0.8 ? 1 : 2, 1, y % 3 ? "#4a2a66" : "#6b3fa8");
        if (y % 4 === 0 && f < 0.8) R(c, l + x + 1, tp + y, 1, 1, "#c46bff");
      }
    }
  },
  over(c, l, tp, t) {
    // iris looks around, then the eye blinks
    const lx = Math.round(Math.sin(t * 0.9) * 3), ly = Math.round(Math.sin(t * 0.6) * 1.5);
    const cx = l + 8 + lx, cy = tp + 7 + ly;
    spr(c, [".ggg.", "ggggg", "ggkgg", "ggggg", ".ggg."], { g: Math.sin(t * 2) > 0 ? "#5ee84a" : "#3fb02f", k: "#07040f" }, cx - 2, cy - 2);
    R(c, cx - 1, cy - 1, 1, 1, "#ffffff");
    if (t % 5 > 4.75) for (let y = 0; y < 15; y++) R(c, l + 1, tp + y, 16, 1, "#4a2a66");
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.8 + k / 3) % 1;
      if (ph < 0.3) sparkle(c, l + [0, 17, 2][k], tp + [3, 6, 16][k], "#e0b0ff", ph < 0.15);
    }
  },
});

// ---------- 17 Graveyard Rising ----------
addSkin("legendary", {
  name: "Graveyard Rising",
  pitch: "A cracked tombstone glowing from within, zombie hands bursting up out of the dirt on both sides and grabbing at the air, with fog rolling across the ground.",
  pal: { s: "#8a8494", S: "#5a5468", k: "#3a3546", d: "#4a3018", D: "#2e1e10", g: "#5ee84a" },
  rows: [
    "..................",
    "..................",
    "..................",
    ".......ssss.......",
    ".....ssssssSS.....",
    "....sssssssssS....",
    "....sskskssksS....",
    "....sskskksksS....",
    "....ssksksskSS....",
    "....sssssssssS....",
    "....sssssgsssS....",
    "....ssssgssssS....",
    "....sssssgsssS....",
    "....sssssgsssS....",
    "....ssssgssssS....",
    "....sssssssssS....",
    "....sssssssssS....",
    "....sssssssssS....",
    "....sssssssssS....",
    "....sssssssssS....",
    "....sssssssssS....",
    "...dddddddddddd...",
    "..dddDddddddDddd..",
    ".ddddddddDddddddd.",
    "ddDdddddddddDdddd.",
    "dddddddDdddddddddd",
    "ddddDdddddddddDddd",
    "dddddddddddddddddd",
  ],
  animPal: (t) => ({ g: Math.sin(t * 3) > 0 ? "#b7ff9e" : "#5ee84a" }),
  under(c, l, tp, t) { glow(c, l + 9, tp + 12, 16, "#5ee84a", 0.2 + 0.08 * Math.sin(t * 3)); },
  over(c, l, tp, t) {
    glow(c, l + 9, tp + 12, 5, "#7dff5a", 0.3);
    // hands rising and sinking
    const HAND = ["z.z.z", "zzzzz", ".zzz.", ".zzz.", ".zz..", ".zz..", ".zz.."];
    [[0, 0], [13, 1.7]].forEach(([hx, off]) => {
      const up = reduced ? 4 : Math.round((Math.sin(t * 1.4 + off) + 1) * 2.5);
      c.save(); c.beginPath(); c.rect(l - 2, tp, 22, 22); c.clip();
      spr(c, HAND, { z: "#8a9a72" }, l + hx, tp + 21 - up);
      c.restore();
      if (up > 3) for (let k = 0; k < 2; k++) R(c, l + hx + 1 + k * 3, tp + 20 - up / 2 - k, 1, 1, "#4a3018");
    });
    // fog
    for (let k = 0; k < 5; k++) fade(c, 0.35, () => R(c, l - 2 + ((k * 7 + M(t) * 3) % 22), tp + 20 + (k % 2), 5, 1, "#b9b0d9"));
    rise(c, l + 5, tp + 20, 8, 10, t, ["#c8ffb0", "#7dff5a"], 4, 0.7, 81, 0.7);
  },
});

// ---------- 18 Haunted Volleyball Comet ----------
const BALL = [
  ".....wwwwwww.....",
  "...wwwwwwwwwww...",
  "..wwwwwwwwwwwwW..",
  ".wwwwwwwwwwwwwWW.",
  ".wwkkwwwwwkkwwWW.",
  "wwwkkkwwwkkkwwWWW",
  "wwwwwwwwwwwwwwWWW",
  "wwwwwwwwwwwwwwWWW",
  "wwwkwkwkwkwkwwWWW",
  "wwwwkwkwkwkwwwWWW",
  ".wwwwwwwwwwwwWWW.",
  ".wwwwwwwwwwwwWWW.",
  "..wwwwwwwwwwWWW..",
  "...wwwwwwwwWWW...",
  ".....wwwwwww.....",
];
addSkin("legendary", {
  name: "Haunted Volleyball Comet",
  pitch: "A possessed volleyball with an angry jack-o'-lantern grin, spinning as it rockets along on a blazing comet tail. The club's own monster.",
  pal: { w: "#f3efe6", W: "#d9d2e6", k: "#c4300a" },
  float: (t) => (reduced ? 8 : 8 + Math.round(Math.sin(t * 2) * 1.5)),
  rows: BALL,
  animPal: (t) => ({ k: Math.floor(t * 10) % 3 ? "#ff7a1a" : "#ffd84a" }),
  under(c, l, tp, t) {
    glow(c, l + 8, tp + 7, 16, "#ff7a1a", 0.4 + 0.12 * Math.sin(t * 10));
    // the comet tail streams down and to the left
    for (let k = 0; k < 26; k++) {
      const ph = (t * 2.4 + k / 26) % 1;
      const x = l + 6 - ph * 10 + Math.sin(k * 1.7) * 3 * ph;
      const y = tp + 9 + ph * 14 + Math.cos(k * 2.3) * 2;
      fade(c, 1 - ph * 0.8, () => R(c, x, y, ph < 0.4 ? 2 : 1, ph < 0.4 ? 2 : 1, pick(FIRE, ph)));
    }
  },
  over(c, l, tp, t) {
    // spinning panel seams
    const a = M(t) * 3;
    c.save(); c.beginPath(); c.arc(l + 8.5, tp + 7.5, 7.5, 0, TAU); c.clip();
    c.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const b = a + (k * TAU) / 3;
      c.strokeStyle = k === 0 ? "#3d6fd1" : k === 1 ? "#ffcf3a" : "#7d7591";
      c.beginPath(); c.arc(l + 8.5 + Math.cos(b) * 9, tp + 7.5 + Math.sin(b) * 9, 8, 0, TAU); c.stroke();
    }
    c.restore();
    // face on top of the seams
    [[3, 4], [4, 4], [10, 4], [11, 4], [3, 5], [4, 5], [5, 5], [9, 5], [10, 5], [11, 5], [3, 8], [5, 8], [7, 8], [9, 8], [11, 8], [4, 9], [6, 9], [8, 9], [10, 9]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, Math.floor(t * 10) % 3 ? "#ff7a1a" : "#ffd84a"));
    rise(c, l + 2, tp + 1, 13, 6, t, FIRE, 8, 2.5, 91);
  },
});

// ---------- 19 Poltergeist Storm ----------
const JUNK = [
  [["b.b", "bbb", "b.b", "b.b"], { b: "#8a5a30" }],               // chair
  [["rrr", "rWr", "rrr"], { r: "#c42a3e", W: "#f3efe6" }],          // book
  [[".y.", "yyy", ".k.", ".k."], { y: "#ffd84a", k: "#6b6380" }],   // lamp
  [["gggg", "gpcg", "gggg"], { g: "#c9a24a", p: "#4fb2ff", c: "#5ee84a" }], // picture frame
  [[".ww.", "wwww", ".ww."], { w: "#e8e0f0" }],                      // plate
  [["kk", "kk"], { k: "#5a3a20" }],                                  // box
];
addSkin("legendary", {
  name: "Poltergeist Storm",
  pitch: "An angry little ghost at the eye of a whirlwind, with chairs, books, a lamp, a picture frame and plates spinning around it as the wind howls.",
  pal: { w: "#f3efe6", W: "#d9d2e6", k: "#1a1024", r: "#ff3b4d" },
  float: (t) => (reduced ? 6 : 6 + Math.round((Math.sin(t * 2) + 1))),
  rows: [
    "......wwwww.......",
    ".....wwwwwwwW.....",
    "....wwkrwwkrwW....",
    "....wwwwwwwwwW....",
    "....wwwkkkkwwW....",
    "....wwwwwwwwwW....",
    ".....wwwwwwwW.....",
    ".....wwwwwwW......",
    "......wwwwW.......",
    ".......wwW........",
    "........w.........",
  ],
  under(c, l, tp, t) {
    glow(c, l + 9, tp + 5, 14, "#b9b0d9", 0.35);
    // wind streaks
    for (let k = 0; k < 6; k++) {
      const a = M(t) * 2.2 + k;
      fade(c, 0.4, () => { for (let s = 0; s < 4; s++) R(c, l + 9 + Math.cos(a + s * 0.12) * (8 + (k % 3) * 2), tp + 6 + Math.sin(a + s * 0.12) * (5 + (k % 2) * 4), 1, 1, "#a99bc9"); });
    }
  },
  over(c, l, tp, t) {
    // junk orbiting: behind items dimmer, in front brighter
    JUNK.forEach(([rows, pal], k) => {
      const a = M(t) * 1.8 + (k * TAU) / JUNK.length;
      const r = 10 + (k % 2) * 2;
      const x = l + 9 + Math.cos(a) * r, y = tp + 7 + Math.sin(a) * 7 + Math.sin(a * 2) * 2;
      fade(c, Math.sin(a) > 0 ? 1 : 0.45, () => spr(c, rows, pal, Math.round(x) - 1, Math.round(y) - 1));
    });
    // debris on the floor, kicked up
    for (let k = 0; k < 4; k++) {
      const ph = (t * 1.3 + k / 4) % 1;
      fade(c, 1 - ph, () => R(c, l + 2 + k * 4 + ph * 3, tp + 18 - ph * 8, 1, 1, "#8a8494"));
    }
  },
});

// ---------- 20 Scarecrow King ----------
addSkin("legendary", {
  name: "Scarecrow King",
  pitch: "The lord of the cornfield: a crowned scarecrow in a ragged cape with burning jack-o'-lantern eyes, crows wheeling around him, and the field at his feet on fire.",
  pal: { y: "#d9a441", Y: "#a8792a", b: "#a8844e", B: "#8a6a3e", k: "#1a1024", o: "#ff7a1a", c: "#8f1426", C: "#5c0c18", x: "#3a2a1a", s: "#f3d27a", w: "#5a3a20", W: "#3a2614", g: "#ffc53a", r: "#c4402a", R: "#8f2a1a" },
  rows: [
    "......g.g.g.......",
    "......ggggg.......",
    ".....yyyyyyy......",
    "..yyyyyyyyyyyyy...",
    "....bbbbbbbbb.....",
    "....bkobbbkobB....",
    "....bbbbbbbbbB....",
    "....bkxkxkxkbB....",
    ".....bbbbbbbB.....",
    "..CcRRRrRRRrRcC...",
    ".CcRRrRRRrRRRRcC..",
    "sCc.RrRRRrRRR.cCs.",
    "sCc.RRRrRRRrR.cCs.",
    "sscc.RrRRRrRR.ccss",
    ".Ccc.RRRrRRRr.ccC.",
    ".Ccc.xxxxxxxx.ccC.",
    "..Cc...sswss..cC..",
    "..Cc....ww....cC..",
    "..Cc....wW....cC..",
    "...C....wW....C...",
    "...c....wW....c...",
    "........wW........",
    "........wW........",
    "......wwwWWW......",
  ],
  animPal: (t) => ({ o: Math.sin(t * 9) + Math.sin(t * 5.1) > -0.6 ? "#ffd84a" : "#ff7a1a" }),
  under(c, l, tp, t) { glow(c, l + 9, tp + 18, 18, "#ff5a1a", 0.3 + 0.08 * Math.sin(t * 7)); },
  over(c, l, tp, t) {
    glow(c, l + 6, tp + 5, 3, "#ff7a1a", 0.5); glow(c, l + 11, tp + 5, 3, "#ff7a1a", 0.5);
    if (Math.sin(t * 5) > 0.7) sparkle(c, l + 8, tp - 1, "#fff1b0", false);
    // the burning field
    for (let x = 0; x < 18; x++) R(c, l + x, tp + 23, 1, 1, x % 3 ? "#a8792a" : "#d9a441");
    rise(c, l, tp + 23, 18, 7, t, FIRE, 18, 2.2, 101);
    // crows wheeling around
    for (let k = 0; k < 4; k++) {
      const a = M(t) * (k % 2 ? 1.3 : -1.1) + (k * TAU) / 4;
      const x = l + 9 + Math.cos(a) * (10 + k % 2), y = tp + 6 + Math.sin(a) * 5;
      const flap = Math.floor(t * 8 + k) % 2;
      spr(c, flap ? ["k...k", ".kkk.", "..k.."] : [".....", "kkkkk", "..k.."], { k: "#2a2238" }, Math.round(x) - 2, Math.round(y) - 1);
    }
    rise(c, l + 2, tp + 18, 14, 18, t, ["#ffd84a", "#ff7a1a"], 5, 0.5, 102, 0.8);
  },
});
})();
