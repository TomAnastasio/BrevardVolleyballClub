// ---------- Shirts: 10 themes ----------
// Torso: rows 8-14 (x 3-11 at shoulders, x 5-10 lower; T = right-side shade). Arms: u rows 9-11, l rows 12-13 (x 2-3, 12-13).
const shd = (col, z) => (z === "T" || z === "l" ? darken(col, 0.8) : col);
const torso = (z) => z === "t" || z === "T";

// ---------- 1. Candy Corn Stripes ----------
const cornPx = (s) => (x, y, z) => shd(y <= 9 ? s.a : y <= 11 ? s.b : s.c, z);
addTheme("shirt", {
  name: "Candy Corn Stripes",
  pitch: "Bold horizontal bands like a piece of candy corn, bright and loud on the court.",
  common: {
    pitch: "Three wide bands, top to bottom.",
    colors: [
      { name: "Classic", a: "#fff6e0", b: "#ff7a1a", c: "#ffd84a" },
      { name: "Witch's brew", a: "#b7ff9e", b: "#6b3fa8", c: "#231d33" },
      { name: "Blood moon", a: "#fff6e0", b: "#c42a3e", c: "#231d33" },
      { name: "Ghostly", a: "#ffffff", b: "#c9b8f0", c: "#8a8296" },
      { name: "Swamp", a: "#ffd84a", b: "#5a8a3a", c: "#2f4a2a" },
      { name: "Midnight", a: "#ffffff", b: "#4a72c4", c: "#1c2a5c" },
    ],
    make: (s) => ({ sleeve: "short", px: cornPx(s) }),
  },
  rare: {
    name: "Caramel Apple",
    pitch: "The top of the shirt is dipped in shiny caramel like a caramel apple, with thick drips of different lengths running down over the candy bands.",
    item: {
      sleeve: "short",
      px: (x, y, z) => {
        // how far down the caramel reaches in each column; the last pixel is the darker drop tip
        const drip = { 5: 12, 8: 13, 10: 12 };
        const end = drip[x] ?? 10;
        if (y <= end) {
          if (y === end && end > 10) return "#7a4510";
          if (at([[4, 9], [5, 8]], x, y)) return "#f8d08a";
          return z === "T" ? "#9a5e20" : "#c8822e";
        }
        return cornPx({ a: "#fff6e0", b: "#ff7a1a", c: "#ffd84a" })(x, y, z);
      },
    },
  },
  epic: {
    name: "Sugar Rush",
    pitch: "The candy bands slowly scroll down the shirt, round and round, like a candy-striped barber pole.",
    item: {
      sleeve: "short",
      px: (x, y, z, t) => {
        const band = Math.floor((y + t * 3) / 2) % 3;
        return shd(["#fff6e0", "#ff7a1a", "#ffd84a"][band], z);
      },
    },
  },
  legendary: {
    name: "Candy Corn King",
    pitch: "Glowing sugar-coated bands with candy corn kernels orbiting the body and sugar sparkles popping.",
    item: {
      sleeve: "short",
      px: (x, y, z, t) => {
        const sh = Math.sin(t * 5 + x * 0.8 - y * 0.5) > 0.85;
        return sh ? "#ffffff" : cornPx({ a: "#fff6e0", b: "#ff9a3a", c: "#ffe14d" })(x, y, z);
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 13, "#ff9a3a", 0.35 + 0.1 * Math.sin(t * 3)),
      over: (c, l, tp, t) => {
        for (let k = 0; k < 4; k++) {
          const a = t * 1.6 + (k * TAU) / 4;
          if (Math.sin(a) < -0.3) continue;
          const x = Math.round(l + 7 + Math.cos(a) * 9), y = Math.round(tp + 11 + Math.sin(a) * 3);
          R(c, x, y - 1, 1, 1, "#fff6e0"); R(c, x, y, 1, 1, "#ff7a1a"); R(c, x, y + 1, 1, 1, "#ffd84a");
        }
        const ph = (t * 1.2) % 1;
        if (ph < 0.25) sparkle(c, l + 4 + Math.round(hash(Math.floor(t * 1.2)) * 7), tp + 9 + Math.round(hash(Math.floor(t * 1.2), 3) * 4), "#ffffff", ph < 0.12);
      },
    },
  },
});

// ---------- 2. Pumpkin Flannel ----------
const plaid = (s) => (x, y, z) => {
  const a = x % 3 === 0, b = y % 3 === 0;
  return shd(a && b ? s.dark : a || b ? s.mid : s.base, z);
};
addTheme("shirt", {
  name: "Pumpkin Flannel",
  pitch: "A cozy long-sleeve plaid flannel, the pumpkin-patch hayride look.",
  common: {
    pitch: "Plaid flannel, long sleeves.",
    colors: [
      { name: "Pumpkin", base: "#ff7a1a", mid: "#8f3c06", dark: "#1a1024" },
      { name: "Moss", base: "#5a8a3a", mid: "#2f4a2a", dark: "#1a1024" },
      { name: "Blood", base: "#c42a3e", mid: "#5c0c18", dark: "#1a1024" },
      { name: "Violet", base: "#7a4ad9", mid: "#3d2470", dark: "#1a1024" },
      { name: "Ash", base: "#a49db0", mid: "#55506b", dark: "#1a1024" },
      { name: "Midnight", base: "#4a72c4", mid: "#1c2a5c", dark: "#0b0614" },
    ],
    make: (s) => ({ sleeve: "long", px: plaid(s) }),
  },
  rare: {
    name: "Puffer Vest",
    pitch: "A puffy brown quilted vest zipped up over the orange flannel, with a cream fleece collar and the plaid sleeves showing.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        if (!torso(z)) return plaid({ base: "#ff7a1a", mid: "#8f3c06", dark: "#1a1024" })(x, y, z);
        if (y === 8) return x >= 5 && x <= 9 ? "#ecdcb8" : "#6b4a28";
        if (x === 7) return y === 9 ? "#f3efe6" : "#a49db0"; // zipper and pull
        if (y === 10 || y === 13) return "#3d2614"; // quilting seams
        if (y === 9 || y === 11) return z === "T" ? "#6b4a28" : "#a87a44"; // puffy highlight under each seam
        return z === "T" ? "#55391e" : "#7a5430";
      },
    },
  },
  epic: {
    name: "Leaf Fall",
    pitch: "Autumn leaves keep drifting off the shoulders and tumbling down past you.",
    item: {
      sleeve: "long",
      px: plaid({ base: "#ff7a1a", mid: "#8f3c06", dark: "#1a1024" }),
      over: (c, l, tp, t) => {
        const COLS = ["#ffd84a", "#c42a3e", "#e0661a"];
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.45 + k / 3) % 1;
          const sx = k === 1 ? 13 : 1 + k;
          fade(c, 1 - ph * 0.7, () => R(c, l + sx + Math.round(Math.sin(t * 3 + k * 2) * 1.5), tp + 9 + ph * 18, 1, 1, COLS[k]));
        }
      },
    },
  },
  legendary: {
    name: "Bonfire Flannel",
    pitch: "The flannel glows like it's been sitting by the bonfire all night: plaid lines flicker with firelight and sparks rise off it.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        const a = x % 3 === 0, b = y % 3 === 0;
        if (a || b) {
          const f = Math.sin(t * 9 + x * 1.3 + y * 0.7);
          return a && b ? "#1a1024" : f > 0.5 ? "#ffd84a" : f > -0.3 ? "#ff7a1a" : "#c4300a";
        }
        return shd("#8f2a0a", z);
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 14, "#ff7a1a", 0.35 + 0.12 * Math.sin(t * 11)),
      over: (c, l, tp, t) => {
        for (let k = 0; k < 5; k++) {
          const ph = (t * 0.7 + k / 5) % 1;
          fade(c, 1 - ph, () => R(c, l + 3 + k * 2 + Math.round(Math.sin(t * 2 + k) * 2), tp + 12 - ph * 14, 1, 1, ph < 0.4 ? "#fff3a0" : "#ff7a1a"));
        }
      },
    },
  },
});

// ---------- 3. Vampire Count ----------
// White shirt, vest and bow tie in front; the cape hangs behind the body (drawn in `under`), so its
// edges show past the arms, its lining shows around the legs, and a tall collar stands up behind the
// head. A light rim on the cape's outer edge keeps it from melting into the dark night background.
const vampPx = (s) => (x, y, z) => {
  if (z === "u" || z === "l") return z === "l" ? "#3a3150" : "#4a4060";
  if (x === 7 || x === 8) return y === 9 ? s.accent : "#f3efe6";
  if (y >= 10) return z === "T" ? darken(s.accent, 0.6) : s.accent;
  return z === "T" ? "#cfc8d8" : "#f3efe6";
};
// P: { cape, rim, lining }; flap widens the hem; liningPx(x, y) can paint the lining
function vampCape(c, l, tp, P, flap = 0, liningPx = null) {
  for (const [x, y] of [[2, 4], [2, 5], [3, 5], [2, 6], [3, 6], [4, 6], [2, 7], [3, 7], [4, 7]]) {
    const col = x === 2 ? P.rim : P.lining;
    R(c, l + x, tp + y, 1, 1, col); R(c, l + 15 - x, tp + y, 1, 1, col);
  }
  for (let y = 8; y <= 24; y++) {
    const w = 6.5 + (y - 8) * 0.13 + (y > 14 ? (flap * (y - 14)) / 10 : 0);
    const x0 = Math.round(7.5 - w), x1 = Math.round(7.5 + w);
    for (let x = x0; x <= x1; x++) {
      let col = x === x0 || x === x1 ? P.rim : x === x0 + 1 || x === x1 - 1 ? P.cape : liningPx ? liningPx(x, y) : P.lining;
      if (y === 24 && x !== x0 && x !== x1) col = x % 2 ? P.rim : P.cape; // scalloped hem
      R(c, l + x, tp + y, 1, 1, col);
    }
  }
}
const VAMP = { cape: "#2e2546", rim: "#b8a8d8" };
addTheme("shirt", {
  name: "Vampire Count",
  pitch: "A white dress shirt, colored vest and bow tie under a long black cape with a tall standing collar and a bright lining.",
  common: {
    pitch: "Vest, bow tie and cape lining in one color.",
    colors: [
      { name: "Blood red", accent: "#8f1426" },
      { name: "Royal purple", accent: "#52308a" },
      { name: "Emerald", accent: "#1f5a4a" },
      { name: "Midnight blue", accent: "#1c2a5c" },
      { name: "Old gold", accent: "#a8792a" },
      { name: "Silver", accent: "#6b6380" },
    ],
    make: (s) => ({ sleeve: "long", px: vampPx(s), under: (c, l, tp) => vampCape(c, l, tp, { ...VAMP, lining: lighten(s.accent, 0.3) }) }),
  },
  rare: {
    name: "Royal Count",
    pitch: "A gold-trimmed cape with a crimson lining, frilly white ruffles down the front and a ruby medallion on a gold chain.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        if (torso(z) && (x === 7 || x === 8) && y >= 10 && y <= 12) return (x + y) % 2 ? "#ffffff" : "#d9d2e6";
        return vampPx({ accent: "#8f1426" })(x, y, z);
      },
      under: (c, l, tp) => vampCape(c, l, tp, { cape: "#2e2546", rim: "#e8b84a", lining: "#c42a3e" }),
      over: (c, l, tp) => {
        [[4, 9], [5, 10], [6, 11], [9, 11], [10, 10], [11, 9]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, "#e8b84a"));
        R(c, l + 7, tp + 12, 2, 2, "#e8b84a"); R(c, l + 7, tp + 12, 1, 1, "#ff3b4d"); R(c, l + 8, tp + 13, 1, 1, "#8f1426");
      },
    },
  },
  epic: {
    name: "Billowing Cape",
    pitch: "The cape catches a ghostly breeze and keeps billowing out wide and settling back.",
    item: {
      sleeve: "long",
      px: vampPx({ accent: "#8f1426" }),
      under: (c, l, tp, t) => vampCape(c, l, tp, { ...VAMP, lining: "#c42a3e" }, reduced ? 0 : (Math.sin(t * 2.5) + 1) * 1.6),
    },
  },
  legendary: {
    name: "Night Lord",
    pitch: "The cape's lining is a twinkling blood-red night sky, a crimson glow pulses around you, and bats keep breaking off the hem and flying away.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => (torso(z) && (x === 7 || x === 8) && y === 9 ? (Math.sin(t * 4) > 0 ? "#ff3b4d" : "#c42a3e") : vampPx({ accent: "#5c0c18" })(x, y, z)),
      under: (c, l, tp, t) => {
        glow(c, l + 7, tp + 14, 16, "#ff3b4d", 0.35 + 0.12 * Math.sin(t * 2.5));
        const rim = Math.sin(t * 3) > 0 ? "#ff8a96" : "#ff3b4d";
        vampCape(c, l, tp, { cape: "#2a1430", rim, lining: "#5c0c28" }, reduced ? 0 : (Math.sin(t * 2) + 1) * 0.8,
          (x, y) => (hash(x, y, Math.floor(t * 2)) > 0.94 ? "#ffffff" : hash(x, y) > 0.88 ? "#ff6b7a" : "#5c0c28"));
      },
      over: (c, l, tp, t) => {
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.45 + k / 3) % 1;
          const dir = k === 1 ? 1 : -1;
          const x = Math.round(l + (k === 1 ? 15 : 0) + dir * ph * 6), y = Math.round(tp + 23 - ph * 20);
          const up = Math.floor(t * 9 + k) % 2;
          fade(c, 1 - ph * 0.8, () => {
            R(c, x, y, 1, 1, "#0b0614"); R(c, x - 1, y - up, 1, 1, "#0b0614"); R(c, x + 1, y - up, 1, 1, "#0b0614");
            R(c, x, y, 1, 1, "#ff3b4d");
          });
        }
      },
    },
  },
});

// ---------- 4. Mummy Wraps ----------
const wrapPx = (s, gap = "#3a3044") => (x, y, z) => {
  const band = (x + y * 2) % 5;
  if (band === 0) return gap;
  return shd(band === 2 ? lighten(s.c, 0.25) : band === 4 ? darken(s.c, 0.85) : s.c, z);
};
function looseEnd(c, l, tp, col, t, long = 0) {
  const fl = reduced ? 0 : Math.round(Math.sin(t * 4));
  R(c, l + 10, tp + 15, 1, 1, col); R(c, l + 11, tp + 16, 1, 1, col); R(c, l + 11 + fl, tp + 17, 1, 1, darken(col, 0.85));
  for (let k = 0; k < long; k++) R(c, l + 12 + k + Math.round(Math.sin(t * 5 + k) * (k / 2)), tp + 17 + Math.round(Math.sin(t * 4 + k * 0.8)), 1, 1, k % 2 ? darken(col, 0.85) : col);
}
addTheme("shirt", {
  name: "Mummy Wraps",
  pitch: "The whole torso and arms wrapped in layered old bandages, with a loose end hanging off the hip.",
  common: {
    pitch: "Bandage wraps, long sleeves.",
    colors: [
      { name: "Linen", c: "#d9cfb2" },
      { name: "Bone white", c: "#ece6d6" },
      { name: "Tea-stained", c: "#b8955e" },
      { name: "Ash", c: "#9a94a8" },
      { name: "Soot", c: "#4a4458" },
      { name: "Moss", c: "#8a9a6a" },
    ],
    make: (s) => ({ sleeve: "long", px: wrapPx(s), over: (c, l, tp, t) => looseEnd(c, l, tp, s.c, t) }),
  },
  rare: {
    name: "Pharaoh",
    pitch: "Royal wraps with a striped gold-and-blue collar across the shoulders and an ankh on the chest.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        if (torso(z) && (y === 8 || y === 9)) return (x + y) % 2 ? "#ffc53a" : "#2a4a8f";
        if (torso(z) && at([[7, 10], [6, 11], [7, 11], [8, 11], [7, 12], [7, 13]], x, y)) return "#ffc53a";
        return wrapPx({ c: "#d9cfb2" })(x, y, z);
      },
      over: (c, l, tp, t) => looseEnd(c, l, tp, "#d9cfb2", t),
    },
  },
  epic: {
    name: "Unraveling",
    pitch: "A long strip has come loose and keeps flapping and snaking in the wind behind you.",
    item: { sleeve: "long", px: wrapPx({ c: "#d9cfb2" }), over: (c, l, tp, t) => looseEnd(c, l, tp, "#d9cfb2", t, 5) },
  },
  legendary: {
    name: "Cursed Scarab",
    pitch: "Glowing green hieroglyphs pulse across the wraps, scarab beetles crawl over them, and cursed dust drifts off.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        const glyph = torso(z) && hash(x, y, 7) > 0.78;
        if (glyph) return Math.sin(t * 3 - y * 0.6) > 0.2 ? "#7dff5a" : "#2f8a3a";
        return wrapPx({ c: "#b8955e" }, "#1a1024")(x, y, z);
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 13, "#5ee84a", 0.3 + 0.12 * Math.sin(t * 3)),
      over: (c, l, tp, t) => {
        looseEnd(c, l, tp, "#b8955e", t, 2);
        const PATH = [[4, 9], [5, 10], [6, 11], [7, 12], [8, 13], [9, 12], [10, 11], [9, 10], [8, 9], [6, 9]];
        for (let k = 0; k < 2; k++) {
          const [x, y] = PATH[(Math.floor(t * 2) + k * 5) % PATH.length];
          R(c, l + x, tp + y, 1, 1, "#1f5a4a"); R(c, l + x, tp + y - 1, 1, 1, "#5ee84a");
        }
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.5 + k / 3) % 1;
          fade(c, 0.8 * (1 - ph), () => R(c, l + 3 + k * 4, tp + 8 - ph * 9, 1, 1, "#b7ff9e"));
        }
      },
    },
  },
});

// ---------- 5. Bedsheet Ghost ----------
const sheetPx = (s, eyes = "#1a1024") => (x, y, z) => {
  if (at([[5, 10], [5, 11], [9, 10], [9, 11]], x, y)) return eyes;
  return z === "T" || z === "l" ? s.sh : s.c;
};
function hem(c, l, tp, s, t, wavy = true) {
  const wave = wavy && !reduced ? Math.floor(t * 3) % 2 : 0;
  for (let x = 2; x <= 13; x++) {
    const h = 2 + ((x + wave) % 2);
    R(c, l + x, tp + 15, 1, h, x >= 11 ? s.sh : s.c);
  }
  for (let y = 11; y <= 14; y++) { R(c, l + 4, tp + y, 1, 1, s.c); R(c, l + 11, tp + y, 1, 1, s.sh); }
}
addTheme("shirt", {
  name: "Bedsheet Ghost",
  pitch: "A sheet thrown over the shoulders with two eye holes cut in the chest and a wavy hem past the waist.",
  common: {
    pitch: "Sheet with eye holes and a wavy hem.",
    colors: [
      { name: "White", c: "#f3efe6", sh: "#d9d2e6" },
      { name: "Lavender", c: "#d8c8f5", sh: "#b8a4e0" },
      { name: "Mint", c: "#c8f5d8", sh: "#9ad8b0" },
      { name: "Peach", c: "#ffd8c0", sh: "#e8b498" },
      { name: "Sky", c: "#c8e4ff", sh: "#9cc4e8" },
      { name: "Dusty grey", c: "#b9b2c9", sh: "#9d96b0" },
    ],
    make: (s) => ({ sleeve: "long", px: sheetPx(s), over: (c, l, tp, t) => hem(c, l, tp, s, t) }),
  },
  rare: {
    name: "Too Cool Ghost",
    pitch: "A ghost in shades: the eye holes are covered by a pair of black sunglasses, plus rosy cheeks.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        if (y === 10 && x >= 4 && x <= 10) return x === 7 ? "#1a1024" : x === 4 || x === 10 ? "#1a1024" : "#231d33";
        if (y === 11 && (x === 5 || x === 6 || x === 8 || x === 9)) return "#231d33";
        if (y === 12 && (x === 5 || x === 9)) return "#ff8fb8";
        return sheetPx({ c: "#f3efe6", sh: "#d9d2e6" })(x, y, z);
      },
      over: (c, l, tp, t) => { hem(c, l, tp, { c: "#f3efe6", sh: "#d9d2e6" }, t); R(c, l + 5, tp + 10, 1, 1, "#6b6380"); R(c, l + 8, tp + 10, 1, 1, "#6b6380"); },
    },
  },
  epic: {
    name: "Boo!",
    pitch: "Every few seconds the ghost blinks, opens a big round mouth hole and shouts BOO while the hem flaps.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        const ph = t % 3.5, boo = ph > 2.4, blink = ph > 1.9 && ph < 2.05;
        if (at([[5, 10], [5, 11], [9, 10], [9, 11]], x, y)) return blink ? "#d9d2e6" : "#1a1024";
        if (boo && at([[7, 12], [6, 13], [7, 13], [8, 13], [7, 14]], x, y)) return "#1a1024";
        return z === "T" || z === "l" ? "#d9d2e6" : "#f3efe6";
      },
      over: (c, l, tp, t) => {
        hem(c, l, tp, { c: "#f3efe6", sh: "#d9d2e6" }, t * 2);
        if (t % 3.5 > 2.4) { R(c, l + 13, tp + 10, 1, 1, "#ffffff"); R(c, l + 14, tp + 9, 1, 1, "#ffffff"); R(c, l + 15, tp + 11, 1, 1, "#ffffff"); }
      },
    },
  },
  legendary: {
    name: "True Phantom",
    pitch: "A real ghost: the sheet glows, flickers half see-through, and trails wisps of spirit mist that drift away.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        if (at([[5, 10], [5, 11], [9, 10], [9, 11]], x, y)) return Math.sin(t * 3) > 0 ? "#7dfcff" : "#3ac6d6";
        const f = Math.sin(t * 2 + y * 0.7);
        return f > 0.5 ? "#ffffff" : z === "T" ? "#b8d8f0" : "#d8ecff";
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 13, 15, "#9fd4ff", 0.4 + 0.15 * Math.sin(t * 2)),
      over: (c, l, tp, t) => {
        fade(c, 0.75 + 0.25 * Math.sin(t * 2.3), () => hem(c, l, tp, { c: "#e8f4ff", sh: "#b8d8f0" }, t));
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.6 + k / 4) % 1;
          fade(c, 0.7 * (1 - ph), () => R(c, l + 3 + k * 3 + Math.round(Math.sin(t * 2 + k) * 2), tp + 17 + ph * 4 - ph * ph * 10, 1, 2, "#d8ecff"));
        }
      },
    },
  },
});

// ---------- 6. Spiderweb Hoodie ----------
const WEB = [[3, 8], [4, 9], [5, 10], [6, 11], [7, 12], [4, 8], [5, 8], [6, 8], [3, 9], [3, 10], [5, 9], [6, 10], [4, 10], [7, 10], [8, 9]];
const hoodiePx = (s, web = "#d8d0ec") => (x, y, z) => {
  if (z === "t" && at(WEB, x, y)) return web;
  if (at([[8, 13], [9, 13]], x, y)) return darken(s.c, 0.7);
  return shd(s.c, z);
};
const hood = (c, l, tp, col) => { R(c, l + 4, tp + 7, 6, 1, darken(col, 0.8)); R(c, l + 3, tp + 7, 1, 1, col); R(c, l + 10, tp + 7, 1, 1, darken(col, 0.6)); };
addTheme("shirt", {
  name: "Spiderweb Hoodie",
  pitch: "A cozy hoodie with a white spiderweb spreading from one shoulder and the hood bunched behind the neck.",
  common: {
    pitch: "Hoodie with a web print.",
    colors: [
      { name: "Witch purple", c: "#6b3fa8" },
      { name: "Black", c: "#2a2433" },
      { name: "Charcoal", c: "#4a4458" },
      { name: "Pumpkin", c: "#e0661a" },
      { name: "Slime", c: "#3fb02f" },
      { name: "Blood", c: "#a81e30" },
    ],
    make: (s) => ({ sleeve: "long", px: hoodiePx(s), over: (c, l, tp) => { hood(c, l, tp, s.c); R(c, l + 9, tp + 13, 1, 1, "#1a1024"); } }),
  },
  rare: {
    name: "Spider Costume",
    pitch: "The whole front is a giant black spider: a round body on the chest with eight legs stretching out across the hoodie.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        const body = at([[6, 10], [7, 10], [8, 10], [6, 11], [7, 11], [8, 11], [7, 12], [7, 9]], x, y);
        if (body) return x === 7 && y === 12 ? "#c42a3e" : "#14101c";
        const legs = [[4, 9], [3, 8], [10, 9], [11, 8], [5, 11], [4, 12], [9, 11], [10, 12], [5, 13], [9, 13], [4, 10], [10, 10]];
        if (at(legs, x, y)) return "#14101c";
        return shd("#6b3fa8", z);
      },
      over: (c, l, tp) => { hood(c, l, tp, "#6b3fa8"); R(c, l + 6, tp + 10, 1, 1, "#ff3b4d"); R(c, l + 8, tp + 10, 1, 1, "#ff3b4d"); },
    },
  },
  epic: {
    name: "Dangling Spider",
    pitch: "A little spider drops down on a silk thread from the hood string, bobs there, and climbs back up.",
    item: {
      sleeve: "long",
      px: hoodiePx({ c: "#6b3fa8" }),
      over: (c, l, tp, t) => {
        hood(c, l, tp, "#6b3fa8");
        const ph = (t % 4) / 4, drop = Math.round(Math.sin(Math.min(1, ph * 1.6) * Math.PI) * 5);
        R(c, l + 8, tp + 9, 1, 1, "#f3efe6");
        for (let k = 0; k < drop; k++) R(c, l + 8, tp + 10 + k, 1, 1, "#d8d0ec");
        const y = tp + 10 + drop;
        R(c, l + 8, y, 1, 1, "#0b0614"); R(c, l + 7, y, 1, 1, "#0b0614"); R(c, l + 9, y, 1, 1, "#0b0614"); R(c, l + 8, y + 1, 1, 1, "#ff3b4d");
      },
    },
  },
  legendary: {
    name: "Widow's Web",
    pitch: "The web glows silver-blue in moonlight, dewdrops twinkle along its threads, and black widows crawl across it.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        if (z === "t" && at(WEB, x, y)) return Math.sin(t * 4 - x - y) > 0.7 ? "#ffffff" : "#9fd4ff";
        return shd("#1f1a30", z);
      },
      under: (c, l, tp, t) => glow(c, l + 5, tp + 10, 13, "#9fd4ff", 0.3 + 0.1 * Math.sin(t * 2)),
      over: (c, l, tp, t) => {
        hood(c, l, tp, "#1f1a30");
        for (let k = 0; k < 3; k++) if (Math.sin(t * 5 + k * 2.1) > 0.6) sparkle(c, l + [4, 6, 3][k], tp + [9, 11, 8][k], "#ffffff", false);
        const PATH = [[9, 13], [10, 12], [10, 11], [9, 10], [8, 9], [9, 9], [10, 10], [11, 11]];
        for (let k = 0; k < 2; k++) {
          const [x, y] = PATH[(Math.floor(t * 2.2) + k * 4) % PATH.length];
          R(c, l + x, tp + y, 1, 1, "#0b0614"); R(c, l + x - 1, tp + y, 1, 1, "#0b0614"); R(c, l + x + 1, tp + y, 1, 1, "#0b0614");
          R(c, l + x, tp + y - 1, 1, 1, "#ff3b4d");
        }
      },
    },
  },
});

// ---------- 7. Frankenstein Jacket ----------
const frankPx = (s) => (x, y, z) => {
  if (torso(z) && x >= 6 && x <= 8) return x === 7 && y % 2 === 0 ? "#2a2433" : "#8a8494";
  if (x === 4 && y >= 9 && y <= 13) return "#1a1024";
  if ((x === 3 || x === 5) && (y === 10 || y === 12)) return "#1a1024";
  return z === "T" ? darken(s.c, 0.7) : s.c;
};
const rag = (c, l, tp, col) => { R(c, l + 2, tp + 12, 1, 1, col); R(c, l + 13, tp + 12, 1, 1, darken(col, 0.7)); R(c, l + 5, tp + 15, 1, 1, col); R(c, l + 10, tp + 15, 1, 1, darken(col, 0.7)); };
addTheme("shirt", {
  name: "Frankenstein Jacket",
  pitch: "A torn, too-small jacket over a grey shirt, held together with big black stitches and ragged short sleeves.",
  common: {
    pitch: "Stitched jacket over a grey shirt.",
    colors: [
      { name: "Monster green", c: "#456b36" },
      { name: "Charcoal", c: "#3a3646" },
      { name: "Rust", c: "#8a4a2a" },
      { name: "Navy", c: "#2a3a63" },
      { name: "Lab grey", c: "#6b6380" },
      { name: "Olive", c: "#6a6a3a" },
    ],
    make: (s) => ({ sleeve: "short", px: frankPx(s), over: (c, l, tp) => rag(c, l, tp, s.c) }),
  },
  rare: {
    name: "Bolted",
    pitch: "Big steel bolts sticking out of both shoulders and a zigzag scar stitched across the chest.",
    item: {
      sleeve: "short",
      px: (x, y, z) => (torso(z) && at([[6, 11], [7, 10], [8, 11], [6, 12], [8, 12]], x, y) ? "#c9b49a" : torso(z) && at([[7, 11]], x, y) ? "#1a1024" : frankPx({ c: "#456b36" })(x, y, z)),
      over: (c, l, tp) => { rag(c, l, tp, "#456b36"); R(c, l + 1, tp + 9, 2, 1, "#a49db0"); R(c, l + 13, tp + 9, 2, 1, "#a49db0"); R(c, l + 0, tp + 9, 1, 1, "#6b6380"); R(c, l + 15, tp + 9, 1, 1, "#6b6380"); },
    },
  },
  epic: {
    name: "Live Wires",
    pitch: "Electrodes on the shoulders spark and crackle every couple of seconds.",
    item: {
      sleeve: "short",
      px: frankPx({ c: "#456b36" }),
      over: (c, l, tp, t) => {
        rag(c, l, tp, "#456b36");
        R(c, l + 1, tp + 9, 2, 1, "#a49db0"); R(c, l + 13, tp + 9, 2, 1, "#a49db0");
        const ph = t % 1.6;
        if (ph < 0.3) {
          const k = Math.floor(t * 12) % 2;
          for (const [x, d] of [[0, -1], [15, 1]]) {
            R(c, l + x, tp + 8 - k, 1, 1, "#ffffff"); R(c, l + x + d, tp + 7 + k, 1, 1, "#9fd4ff"); R(c, l + x, tp + 10 + k, 1, 1, "#9fd4ff");
          }
        }
      },
    },
  },
  legendary: {
    name: "Lightning Rods",
    pitch: "Two copper lightning rods stick up from the shoulders and a bolt keeps jumping between them over your head. Pulses of blue power run down the stitches, and a green heart beats in a glass window on the chest.",
    item: {
      sleeve: "short",
      px: (x, y, z, t) => {
        const seam = (x === 4 && y >= 9 && y <= 13) || ((x === 3 || x === 5) && (y === 10 || y === 12));
        if (seam) return Math.abs(((y - t * 8) % 5 + 5) % 5) < 1 ? "#d8fbff" : "#4fb2ff";
        if (torso(z) && x >= 7 && x <= 9 && y >= 10 && y <= 12) {
          if (x === 8 && y === 11) return Math.sin(t * 7) > 0.2 ? "#b7ff9e" : "#3fb02f";
          return x === 8 || y === 11 ? "#2a5a3a" : "#c9c2d9";
        }
        if (torso(z) && x >= 6 && x <= 8) return "#8a8494";
        return z === "T" ? "#2f4a26" : "#456b36";
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 6, 16, "#4fb2ff", 0.28 + (Math.floor(t * 6) % 3 === 0 ? 0.25 : 0.05)),
      over: (c, l, tp, t) => {
        rag(c, l, tp, "#456b36");
        for (const x of [1, 14]) {
          for (let y = 2; y <= 8; y++) R(c, l + x, tp + y, 1, 1, y % 2 ? "#e8a060" : "#b8662a");
          R(c, l + x, tp + 1, 1, 1, "#d8fbff");
        }
        const step = Math.floor(t * 6);
        if (step % 3 === 2) return;
        let y = tp + 1;
        for (let x = l + 2; x <= l + 13; x++) {
          y = Math.max(tp - 4, Math.min(tp + 1, y + (hash(step, x) > 0.5 ? 1 : -1)));
          R(c, x, y, 1, 1, hash(step, x, 7) > 0.7 ? "#ffffff" : "#9fd4ff");
        }
      },
    },
  },
});

// ---------- 8. Spooky Club Jersey ----------
const DIGITS = [[5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [7, 9], [8, 9], [9, 9], [9, 10], [8, 11], [9, 11], [9, 12], [7, 13], [8, 13], [9, 13]];
const jerseyPx = (s, num) => (x, y, z, t) => {
  if (torso(z) && at(DIGITS, x, y)) return num ? num(x, y, t) : s.acc;
  if (z === "u") return y === 9 ? s.acc : s.c;
  if (x === 3 || x === 11) return darken(s.acc, 0.8);
  return z === "T" ? darken(s.c, 0.75) : s.c;
};
addTheme("shirt", {
  name: "Spooky Club Jersey",
  pitch: "Our own volleyball jersey: side stripes, trimmed sleeves and an unlucky number 13 on the chest.",
  common: {
    pitch: "Club jersey with a big 13.",
    colors: [
      { name: "Black & orange", c: "#1f1a2a", acc: "#ff7a1a" },
      { name: "Purple & slime", c: "#3d2470", acc: "#5ee84a" },
      { name: "White & black", c: "#e8e0f0", acc: "#1a1024" },
      { name: "Orange & black", c: "#e0661a", acc: "#1a1024" },
      { name: "Green & purple", c: "#2f6b3a", acc: "#c46bff" },
      { name: "Red & white", c: "#a81e30", acc: "#f3efe6" },
    ],
    make: (s) => ({ sleeve: "short", px: jerseyPx(s) }),
  },
  rare: {
    name: "Captain's Jersey",
    pitch: "The black-and-orange jersey with gold-trimmed numbers and a gold captain's armband.",
    item: {
      sleeve: "short",
      px: (x, y, z, t) => (z === "u" && y === 10 ? "#ffc53a" : jerseyPx({ c: "#1f1a2a", acc: "#ff7a1a" }, (nx, ny) => (ny === 9 || ny === 13 ? "#ffc53a" : "#ff7a1a"))(x, y, z, t)),
      over: (c, l, tp) => { R(c, l + 2, tp + 10, 1, 1, "#1a1024"); },
    },
  },
  epic: {
    name: "Glow Numbers",
    pitch: "The 13 glows neon orange and pulses like a scoreboard on game night.",
    item: {
      sleeve: "short",
      px: jerseyPx({ c: "#1f1a2a", acc: "#ff7a1a" }, (x, y, t) => (Math.sin(t * 4 - y * 0.5) > 0.3 ? "#ffd84a" : "#ff7a1a")),
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 9, "#ff7a1a", 0.3 + 0.15 * Math.sin(t * 4)),
    },
  },
  legendary: {
    name: "Haunted MVP",
    pitch: "The jersey burns with violet ghostfire, the 13 blazes gold, and spectral volleyballs orbit around you.",
    item: {
      sleeve: "short",
      px: (x, y, z, t) => {
        if (torso(z) && at(DIGITS, x, y)) return Math.floor(t * 10 + x) % 3 ? "#ffd84a" : "#fff1b0";
        const f = Math.sin(t * 6 + x * 1.1 + y * 0.9);
        if (x === 3 || x === 11 || (z === "u" && y === 9)) return f > 0 ? "#c46bff" : "#7a3fc4";
        return z === "T" ? "#14101c" : "#1f1a2a";
      },
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 15, "#c46bff", 0.35 + 0.1 * Math.sin(t * 5)),
      over: (c, l, tp, t) => {
        for (let k = 0; k < 2; k++) {
          const a = t * 1.5 + k * Math.PI;
          if (Math.sin(a) < -0.2) continue;
          const x = Math.round(l + 7 + Math.cos(a) * 9), y = Math.round(tp + 11 + Math.sin(a) * 4);
          fade(c, 0.85, () => { R(c, x - 1, y, 3, 1, "#e8e0f0"); R(c, x, y - 1, 1, 3, "#e8e0f0"); R(c, x, y, 1, 1, "#c46bff"); });
        }
        for (let k = 0; k < 4; k++) {
          const ph = (t * 1.1 + k / 4) % 1;
          fade(c, 1 - ph, () => R(c, l + 3 + k * 3, tp + 9 - ph * 8, 1, 1, "#c46bff"));
        }
      },
    },
  },
});

// ---------- 9. Scarecrow ----------
const STRAW = ["#ffd84a", "#d9a441", "#f3d27a"];
const burlap = (s, patch = "#5a8a3a") => (x, y, z) => {
  if (torso(z) && at([[5, 10], [6, 10], [5, 11], [6, 11]], x, y)) return x === 5 && y === 10 ? lighten(patch, 0.2) : patch;
  const grain = (x * 3 + y * 5) % 7 === 0;
  return grain ? darken(s.c, 0.7) : shd(s.c, z);
};
function straw(c, l, tp, t, wiggle = false) {
  const w = wiggle && !reduced ? Math.floor(t * 6) % 2 : 0;
  [[5, 7], [6, 6 - w], [8, 7], [9, 6 + w]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, STRAW[i % 3]));
  [[1, 15], [2, 16 + w], [3, 15], [12, 15], [13, 16 - w], [14, 15]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, STRAW[i % 3]));
}
addTheme("shirt", {
  name: "Scarecrow",
  pitch: "A patched burlap shirt with straw poking out of the collar and cuffs and a crooked patch over the heart.",
  common: {
    pitch: "Burlap shirt with straw tufts.",
    colors: [
      { name: "Natural burlap", c: "#a8844e" },
      { name: "Faded red", c: "#9a4a3a" },
      { name: "Denim", c: "#5a6e9a" },
      { name: "Moss", c: "#6e7a42" },
      { name: "Plum", c: "#6e4a6e" },
      { name: "Charcoal", c: "#55506b" },
    ],
    make: (s) => ({ sleeve: "long", px: burlap(s), over: (c, l, tp, t) => straw(c, l, tp, t) }),
  },
  rare: {
    name: "Windswept",
    pitch: "Caught in a big gust: the straw sticks out sideways from the collar and cuffs, frozen mid-blow, and the hem has torn loose on one side.",
    item: {
      sleeve: "long",
      px: (x, y, z) => (torso(z) && y === 14 && x >= 9 ? "#1a1024" : burlap({ c: "#a8844e" })(x, y, z)),
      over: (c, l, tp) => {
        [[5, 7], [6, 6], [7, 6], [8, 7], [9, 6], [10, 6], [11, 5], [12, 5]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, STRAW[i % 3]));
        [[2, 15], [3, 15], [4, 16], [12, 15], [13, 15], [14, 16], [15, 16]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, STRAW[i % 3]));
        R(c, l + 11, tp + 14, 1, 1, "#a8844e"); R(c, l + 12, tp + 15, 1, 1, "#8a6a3e");
      },
    },
  },
  epic: {
    name: "Crow's Perch",
    pitch: "A black crow has made itself at home on your shoulder, beady yellow eye and all, and every few seconds it throws its head up and caws.",
    item: {
      sleeve: "long",
      px: burlap({ c: "#a8844e" }),
      over: (c, l, tp, t) => {
        straw(c, l, tp, t);
        const caw = !reduced && t % 3 < 0.5;
        // cawing: head tipped up, beak open (upper and lower beak)
        const crow = caw ? ["...kko", "..kkyo", "kgkk.o", ".kk...", ".k.k.."] : ["..kk.", ".kkyo", "kgkk.", ".kk..", ".k.k."];
        spr(c, crow, { k: "#3a3150", g: "#6b6380", y: "#ffd84a", o: "#e0661a" }, l + 11, tp + 4);
      },
    },
  },
  legendary: {
    name: "Harvest Wraith",
    pitch: "The patch over the heart is a glowing jack-o'-lantern, the straw smolders with embers, and crows circle overhead.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => {
        if (torso(z) && at([[5, 10], [6, 10], [5, 11], [6, 11]], x, y)) return (x === 5 && y === 10) || (x === 6 && y === 10) ? (Math.sin(t * 9) > -0.4 ? "#fff3a0" : "#ffd84a") : "#ff7a1a";
        return burlap({ c: "#6e4a2a" })(x, y, z);
      },
      under: (c, l, tp, t) => glow(c, l + 6, tp + 10, 11, "#ff7a1a", 0.35 + 0.12 * Math.sin(t * 9)),
      over: (c, l, tp, t) => {
        [[5, 7], [6, 6], [8, 7], [9, 6], [1, 15], [2, 16], [3, 15], [12, 15], [13, 16], [14, 15]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, Math.sin(t * 8 + i) > 0.3 ? "#ff7a1a" : "#ffd84a"));
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.6 + k / 3) % 1;
          fade(c, 1 - ph, () => R(c, l + 2 + k * 5, tp + 14 - ph * 12, 1, 1, "#ffd84a"));
        }
        for (let k = 0; k < 2; k++) {
          const a = t * 1.1 + k * Math.PI;
          const x = Math.round(l + 7 + Math.cos(a) * 8), y = Math.round(tp + 2 + Math.sin(a) * 2);
          const up = Math.floor(t * 7 + k) % 2;
          R(c, x, y, 1, 1, "#3a3150"); R(c, x - 1, y - up, 1, 1, "#3a3150"); R(c, x + 1, y - up, 1, 1, "#3a3150");
        }
      },
    },
  },
});

// ---------- 10. Bat-Wing Sweater ----------
// Webbed wing flaps fill the gap between each arm and the torso (x 4 and x 11, rows 10-14) with a scalloped edge.
function wings(c, l, tp, col, open = 0, glowCol = null) {
  const edge = lighten(col, 0.5);
  for (const [x, d] of [[4, -1], [11, 1]]) {
    for (let y = 10; y <= 13; y++) R(c, l + x, tp + y, 1, 1, col);
    R(c, l + x, tp + 14, 1, 1, edge);
    if (glowCol) { R(c, l + x, tp + 11, 1, 1, glowCol); R(c, l + x, tp + 13, 1, 1, glowCol); }
    // opened wings stretch past the arms (x 1, 0, … on the left; x 14, 15, … on the right)
    for (let k = 1; k <= open; k++) {
      const wx = d < 0 ? l + 2 - k : l + 13 + k;
      for (let y = 9 + k; y <= 13 - Math.floor(k / 2); y++) R(c, wx, tp + y, 1, 1, y === 13 - Math.floor(k / 2) ? edge : col);
    }
  }
}
const sweaterPx = (s) => (x, y, z) => {
  if (torso(z) && y === 14) return darken(s.c, 0.7);
  if (z === "l" && y === 13) return darken(s.c, 0.7);
  return shd(s.c, z);
};
addTheme("shirt", {
  name: "Bat-Wing Sweater",
  pitch: "A snug sweater with webbed bat-wing flaps between the arms and the body, so you look half bat every time you raise your arms.",
  common: {
    pitch: "Sweater with wing flaps under the arms.",
    colors: [
      { name: "Black", c: "#231d33" },
      { name: "Purple", c: "#52308a" },
      { name: "Blood", c: "#7a1422" },
      { name: "Grey", c: "#55506b" },
      { name: "Midnight", c: "#1c2a5c" },
      { name: "Pumpkin", c: "#c4550a" },
    ],
    make: (s) => ({ sleeve: "long", px: sweaterPx(s), over: (c, l, tp) => wings(c, l, tp, lighten(s.c, 0.38)) }),
  },
  rare: {
    name: "Bat Face",
    pitch: "A bat face knitted on the chest: pointy ears, red eyes and two little white fangs.",
    item: {
      sleeve: "long",
      px: (x, y, z) => {
        if (torso(z)) {
          if (at([[5, 9], [9, 9]], x, y)) return "#14101c";
          if (at([[6, 10], [8, 10]], x, y)) return "#ff3b4d";
          if (at([[6, 12], [8, 12]], x, y)) return "#ffffff";
          if (x >= 5 && x <= 9 && y >= 10 && y <= 11) return "#14101c";
          if (y === 12 && x === 7) return "#14101c";
        }
        return sweaterPx({ c: "#52308a" })(x, y, z);
      },
      over: (c, l, tp) => wings(c, l, tp, "#6b4aa8"),
    },
  },
  epic: {
    name: "Flapping Wings",
    pitch: "Every few seconds the wings stretch out past your arms and give a few big flaps.",
    item: {
      sleeve: "long",
      px: sweaterPx({ c: "#231d33" }),
      over: (c, l, tp, t) => {
        const ph = t % 3, flapping = !reduced && ph > 1.8;
        wings(c, l, tp, "#5a5070", flapping ? (Math.floor(t * 8) % 2 ? 2 : 1) : 0);
      },
    },
  },
  legendary: {
    name: "Vampire Swarm",
    pitch: "Wide crimson-veined wings unfurl from the sweater and beat slowly while a swarm of bats swirls around you.",
    item: {
      sleeve: "long",
      px: (x, y, z, t) => (torso(z) && x === 7 && y >= 9 && y <= 13 ? (Math.sin(t * 3 - y) > 0 ? "#ff3b4d" : "#8f1426") : sweaterPx({ c: "#14101c" })(x, y, z)),
      under: (c, l, tp, t) => glow(c, l + 7, tp + 11, 16, "#ff3b4d", 0.35 + 0.12 * Math.sin(t * 2)),
      over: (c, l, tp, t) => {
        wings(c, l, tp, "#5a3050", reduced ? 2 : 2 + Math.round((Math.sin(t * 2) + 1) / 2), Math.sin(t * 3) > 0 ? "#ff3b4d" : "#8f1426");
        for (let k = 0; k < 4; k++) {
          const a = t * (1.2 + k * 0.15) + (k * TAU) / 4;
          const x = Math.round(l + 7 + Math.cos(a) * (10 + (k % 2))), y = Math.round(tp + 9 + Math.sin(a * 1.3) * 7);
          const up = Math.floor(t * 9 + k) % 2;
          R(c, x, y, 1, 1, "#0b0614"); R(c, x - 1, y - up, 1, 1, "#0b0614"); R(c, x + 1, y - up, 1, 1, "#0b0614");
        }
      },
    },
  },
});
