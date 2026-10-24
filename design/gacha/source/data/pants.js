// =====================================================================
// PANTS: 10 themes, each with Common (6 colors), Rare, Epic, Legendary.
// Legs are x 5-6 (left) and x 9-10 (right); hips rows 15-16 span x 5-10.
// =====================================================================
{
  const isLeg = (x) => x === 5 || x === 6 || x === 9 || x === 10;
  const outer = (x) => x === 5 || x === 10;
  const inner = (x) => x === 6 || x === 9;
  // shade the right side of each leg and the P/Q zones
  const sh = (col, x, z) => (z === "P" || z === "Q" || x === 6 || x === 10 ? darken(col, 0.8) : col);
  const BAT = [["k.k", ".k."], [".k.", "k.k"]];

  // ---------- 1. Skeleton Leggings ----------
  // A thin bone print: femur on the outer thigh, one kneecap pixel, a dimmer shin bone, and two hip points.
  const bonePx = (x, y) => {
    if (y === 15) return x === 6 || x === 9 ? "hip" : null;
    if (!outer(x)) return null;
    if (y === 16 || y === 17) return "bone";
    if (y === 19) return "knee";
    if (y === 21 || y === 22) return "shin";
    return null;
  };
  const skeleton = (base, bone = "#ece6d6", boneDim = "#bdb6a6") => ({
    long: true,
    px(x, y, z) {
      const b = bonePx(x, y);
      if (b === "bone" || b === "knee" || b === "hip") return bone;
      if (b === "shin") return boneDim;
      return sh(base, x, z);
    },
  });
  addTheme("pants", {
    name: "Skeleton Leggings",
    pitch: "Leggings with a thin bone print down each leg, so you look like a skeleton from the waist down.",
    common: {
      pitch: "Leggings with a white bone print.",
      colors: [
        { name: "Black", c: "#231d33" }, { name: "Charcoal", c: "#3a3646" }, { name: "Witch purple", c: "#4a2f7a" },
        { name: "Blood red", c: "#7a1422" }, { name: "Swamp green", c: "#2f4a2a" }, { name: "Midnight blue", c: "#1c2a5c" },
      ],
      make: (col) => skeleton(col.c),
    },
    rare: {
      name: "X-Ray Film",
      pitch: "Looks like a hospital x-ray: dark blue film with glowing cyan bones.",
      item: skeleton("#16264a", "#9fe8ff", "#5ab4d6"),
    },
    epic: {
      name: "Rattle Pulse",
      pitch: "A flash of light runs down the bones from hip to ankle, over and over, like the skeleton is rattling.",
      item: {
        long: true,
        px(x, y, z, t) {
          const b = bonePx(x, y);
          if (!b) return sh("#231d33", x, z);
          const ph = (t * 1.6) % 1, row = 15 + ph * 9;
          return Math.abs(y - row) < 1.2 ? "#ffffff" : b === "shin" ? "#bdb6a6" : "#ece6d6";
        },
      },
    },
    legendary: {
      name: "Bone Lord",
      pitch: "Gold bones on black, with violet soul fire flickering between them and sparkles circling the knees.",
      item: {
        long: true,
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 19, 11, "#c46bff", 0.3 + 0.1 * Math.sin(t * 4)),
        px(x, y, z, t) {
          const b = bonePx(x, y);
          if (b) return b === "shin" ? "#c9a24a" : "#ffd84a";
          if (inner(x) && y >= 16 && y <= 22 && Math.sin(t * 9 + y * 1.9 + x) > 0.4) return "#c46bff";
          return sh("#1a1024", x, z);
        },
        over(c, l, tp, t) {
          for (let k = 0; k < 3; k++) {
            const a = t * 1.5 + (k * TAU) / 3;
            const tw = Math.sin(t * 6 + k) > 0.3;
            sparkle(c, Math.round(l + 7.5 + Math.cos(a) * 6), Math.round(tp + 19 + Math.sin(a) * 2), tw ? "#fff1b0" : "#c46bff", tw);
          }
        },
      },
    },
  });

  // ---------- 2. Jack-o'-Lantern Shorts ----------
  const JACK_EYES = [[5, 16], [6, 16], [9, 16], [10, 16], [6, 17], [9, 17]];
  const jack = (col, face = "#1a1024", mouth = true) => ({
    long: false,
    px(x, y, z, t) {
      const f = typeof face === "function" ? face(t) : face;
      if (at(JACK_EYES, x, y)) return f;
      if (mouth && y === 15 && x >= 6 && x <= 9) return x % 2 ? f : col.base;
      return x === 5 ? col.hi : z === "P" || x === 10 ? col.sh : col.base;
    },
  });
  addTheme("pants", {
    name: "Jack-o'-Lantern Shorts",
    pitch: "Pumpkin shorts with a carved face across the front: eyes on each thigh and a grin at the waist.",
    common: {
      pitch: "Carved pumpkin shorts.",
      colors: [
        { name: "Orange", base: "#ff7a1a", hi: "#ffa45a", sh: "#c4550a" },
        { name: "Ghost white", base: "#e8e0d0", hi: "#fff8ec", sh: "#b8ac98" },
        { name: "Gourd green", base: "#5a8a3a", hi: "#7aac52", sh: "#3d6526" },
        { name: "Blue heirloom", base: "#7a98aa", hi: "#9cb8c8", sh: "#56717f" },
        { name: "Cinderella red", base: "#c4402a", hi: "#e0644a", sh: "#8f2a1a" },
        { name: "Rotten", base: "#8a845a", hi: "#a8a272", sh: "#65603e" },
      ],
      make: (col) => jack(col),
    },
    rare: {
      name: "Vine Belt",
      pitch: "The pumpkin shorts held up by a curly green vine belt with two leaves.",
      item: {
        ...jack({ base: "#ff7a1a", hi: "#ffa45a", sh: "#c4550a" }, "#1a1024", false),
        over(c, l, tp) {
          R(c, l + 4, tp + 15, 8, 1, "#4a7a28");
          R(c, l + 4, tp + 14, 1, 1, "#7aac52"); R(c, l + 11, tp + 14, 1, 1, "#7aac52");
          R(c, l + 8, tp + 14, 1, 1, "#3a6020");
        },
      },
    },
    epic: {
      name: "Candlelit",
      pitch: "A candle burns inside: the carved face flickers yellow and casts a warm, pulsing glow.",
      item: {
        ...jack({ base: "#ff7a1a", hi: "#ffa45a", sh: "#c4550a" }, (t) => (Math.sin(t * 9) + Math.sin(t * 5.1) > -0.6 ? "#fff3a0" : "#ffd84a")),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 16, 9, "#ff9a3a", 0.3 + 0.12 * Math.sin(t * 9)),
      },
    },
    legendary: {
      name: "Inferno Jack",
      pitch: "The shorts are on fire: flames lick up from the hems, the face blazes white-hot, and embers float off.",
      item: {
        ...jack({ base: "#d9541a", hi: "#ff7a1a", sh: "#8f2a0a" }, (t) => (Math.floor(t * 12) % 3 ? "#ffffff" : "#fff3a0")),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 16, 12, "#ff7a1a", 0.35 + 0.12 * Math.sin(t * 11)),
        over(c, l, tp, t) {
          const COLS = ["#ffffff", "#ffd84a", "#ff7a1a", "#c4300a"];
          for (const x of [5, 6, 9, 10]) {
            const ph = (t * 2.4 + x * 0.37) % 1;
            fade(c, 1 - ph * 0.6, () => R(c, l + x, tp + 18 - Math.round(ph * 3), 1, 1, COLS[Math.min(3, Math.floor(ph * 4))]));
          }
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.6 + k / 3) % 1;
            fade(c, 1 - ph, () => R(c, l + 4 + k * 3 + Math.round(Math.sin(t * 2 + k) * 2), tp + 16 - ph * 12, 1, 1, "#ffd84a"));
          }
        },
      },
    },
  });

  // ---------- 3. Mummy Wraps ----------
  const wraps = (col, gap = "#3a3044") => ({
    long: true,
    px(x, y, z) {
      const band = (x + y * 2) % 5;
      if (band === 0) return gap;
      return sh(band === 2 ? col.light : band === 4 ? col.dark : col.mid, x, z);
    },
  });
  const looseEnd = (c, l, tp, t, col) => {
    const fl = reduced ? 0 : Math.round(Math.sin(t * 4));
    R(c, l + 11, tp + 20, 1, 1, col); R(c, l + 12, tp + 21, 1, 1, col); R(c, l + 12 + fl, tp + 22, 1, 1, darken(col, 0.85));
  };
  const CREAM = { light: "#e8e0c8", mid: "#d9cfb2", dark: "#b9ae94" };
  addTheme("pants", {
    name: "Mummy Wraps",
    pitch: "Both legs wrapped in old, layered bandages all the way to the ankles, with a loose strip at one knee.",
    common: {
      pitch: "Layered bandage wraps.",
      colors: [
        { name: "Cream", ...CREAM },
        { name: "Ash grey", light: "#c9c2d0", mid: "#a8a0b0", dark: "#857d8f" },
        { name: "Tea-stained", light: "#d9c094", mid: "#bfa070", dark: "#9a7e52" },
        { name: "Midnight", light: "#4a4060", mid: "#3a3150", dark: "#2a2340" },
        { name: "Moss", light: "#a8b88a", mid: "#8a9a6a", dark: "#6a7a4e" },
        { name: "Rust", light: "#c98a6a", mid: "#a86a4a", dark: "#844e34" },
      ],
      make: (col) => ({ ...wraps(col), over: (c, l, tp, t) => looseEnd(c, l, tp, 0, col.mid) }),
    },
    rare: {
      name: "Ancient Gold",
      pitch: "Royal wraps with gold bands at the hip, knee and ankle, marked with tiny hieroglyphs.",
      item: {
        long: true,
        px(x, y, z) {
          if (y === 15 || y === 19 || y === 22) return (x + y) % 3 === 0 ? "#3a2300" : "#ffc53a";
          return wraps(CREAM).px(x, y, z);
        },
      },
    },
    epic: {
      name: "Unraveling",
      pitch: "The wraps are coming loose: strips flutter off both legs and little puffs of tomb dust drift out.",
      item: {
        ...wraps(CREAM),
        over(c, l, tp, t) {
          looseEnd(c, l, tp, t, "#d9cfb2");
          const fl = reduced ? 0 : Math.round(Math.sin(t * 4 + 1));
          R(c, l + 4, tp + 17, 1, 1, "#d9cfb2"); R(c, l + 3, tp + 18, 1, 1, "#d9cfb2"); R(c, l + 3 + fl, tp + 19, 1, 1, "#b9ae94");
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.5 + k / 3) % 1;
            fade(c, 0.6 * (1 - ph), () => R(c, l + 5 + k * 2 + Math.round(ph * 3), tp + 20 - ph * 6, ph > 0.5 ? 2 : 1, 1, "#c9c2b0"));
          }
        },
      },
    },
    legendary: {
      name: "Cursed Pharaoh",
      pitch: "Dark cursed wraps with green eye-of-the-tomb symbols that light up one by one, green mist at the ankles and glyphs floating up.",
      item: {
        long: true,
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 23, 12, "#5ee84a", 0.3 + 0.1 * Math.sin(t * 3)),
        px(x, y, z, t) {
          const eyes = [[5, 16], [10, 18], [6, 21], [9, 16], [5, 20], [10, 22]];
          const idx = eyes.findIndex(([a, b]) => a === x && b === y);
          if (idx >= 0) return Math.floor(t * 3) % eyes.length === idx ? "#e0ffd8" : "#5ee84a";
          return wraps({ light: "#4a4060", mid: "#3a3150", dark: "#2a2340" }, "#14101c").px(x, y, z);
        },
        over(c, l, tp, t) {
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.6 + k / 4) % 1;
            fade(c, 0.35 * (1 - ph), () => R(c, l + 3 + k * 3, tp + 25 - ph * 2, 3, 1, "#b7ff9e"));
          }
          const GLYPHS = [["g.g", ".g.", "g.g"], [".g.", "ggg", ".g."], ["gg.", ".g.", ".gg"]];
          GLYPHS.forEach((gl, k) => {
            const ph = (t * 0.35 + k / 3) % 1;
            fade(c, 1 - ph, () => spr(c, gl, { g: "#7dff5a" }, l + [1, 11, 6][k], tp + 22 - Math.round(ph * 14)));
          });
        },
      },
    },
  });

  // ---------- 4. Scarecrow Jeans ----------
  const STRAW = ["#ffd84a", "#d9a441", "#f3d27a"];
  const strawCuffs = (c, l, tp) => [[4, 23], [5, 24], [7, 23], [8, 24], [11, 23], [9, 23]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, STRAW[i % 3]));
  const PATCHES = [[5, 18], [6, 18], [5, 21], [10, 17], [9, 17]];
  const scarecrow = (col, patch = (x) => (x > 8 ? "#c4550a" : "#5a8a3a")) => ({
    long: true,
    px(x, y, z, t) {
      if (y === 15) return x === 7 ? "#d9a441" : "#a8792a";
      if (at(PATCHES, x, y)) return patch(x, y, t);
      return sh((x * 3 + y * 5) % 7 === 0 ? col.hi : col.base, x, z);
    },
  });
  addTheme("pants", {
    name: "Scarecrow Jeans",
    pitch: "Faded, patched jeans with a rope belt and straw poking out of both cuffs.",
    common: {
      pitch: "Patched jeans with straw cuffs.",
      colors: [
        { name: "Blue denim", base: "#4a6aa8", hi: "#6f8fc0" },
        { name: "Black denim", base: "#2a2433", hi: "#4a4060" },
        { name: "Faded", base: "#8aa2c8", hi: "#adc0de" },
        { name: "Corduroy brown", base: "#7a5230", hi: "#9a6e44" },
        { name: "Field green", base: "#4a6a3a", hi: "#6a8a52" },
        { name: "Barn red", base: "#8f2a1a", hi: "#ab4a34" },
      ],
      make: (col) => ({ ...scarecrow(col), over: strawCuffs }),
    },
    rare: {
      name: "Crow Perch",
      pitch: "The patched jeans with a little black crow perched on the hip, keeping you company.",
      item: {
        ...scarecrow({ base: "#4a6aa8", hi: "#6f8fc0" }),
        over(c, l, tp) {
          strawCuffs(c, l, tp);
          spr(c, [".kk.", "kkkb", "kgk.", ".k.."], { k: "#4a4060", g: "#8a8298", b: "#ffd84a" }, l + 10, tp + 12);
          R(c, l + 11, tp + 12, 1, 1, "#ff3b4d");
        },
      },
    },
    epic: {
      name: "Windblown",
      pitch: "A breeze keeps blowing through: the straw at the cuffs sways and loose pieces drift away.",
      item: {
        ...scarecrow({ base: "#4a6aa8", hi: "#6f8fc0" }),
        over(c, l, tp, t) {
          const sw = reduced ? 0 : Math.round(Math.sin(t * 3));
          [[4, 23], [5, 24], [7, 23], [8, 24], [11, 23], [9, 23]].forEach(([x, y], i) => R(c, l + x + (y === 24 ? sw : 0), tp + y, 1, 1, STRAW[i % 3]));
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.5 + k / 3) % 1;
            fade(c, 1 - ph, () => R(c, l + 11 + Math.round(ph * 6), tp + 22 - k * 3 - Math.round(Math.sin(ph * Math.PI) * 3), 1, 1, STRAW[k]));
          }
        },
      },
    },
    legendary: {
      name: "Haunted Field",
      pitch: "The patches turn into glowing jack-o'-lantern eyes and a pair of crows circles your legs, cawing.",
      item: {
        ...scarecrow({ base: "#2f3a63", hi: "#4a5a8f" }, (x, y, t) => (Math.sin(t * 8 + x) > -0.3 ? "#ffd84a" : "#ff7a1a")),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 19, 11, "#ff9a3a", 0.25 + 0.08 * Math.sin(t * 8)),
        over(c, l, tp, t) {
          strawCuffs(c, l, tp);
          for (let k = 0; k < 2; k++) {
            const a = t * 1.3 + k * Math.PI;
            const front = Math.sin(a) > 0;
            const x = Math.round(l + 7 + Math.cos(a) * 8), y = Math.round(tp + 19 + Math.sin(a) * 2);
            const flap = Math.floor(t * 8 + k) % 2;
            spr(c, flap ? ["k.k", ".k."] : [".k.", "kkk"], { k: front ? "#6b6380" : "#4a4060" }, x - 1, y - 1);
          }
        },
      },
    },
  });

  // ---------- 5. Werewolf Rips ----------
  const werewolf = (jean, fur = { a: "#7a5230", b: "#5a3a20", c: "#4a3018", tip: "#6b4a28" }) => ({
    long: false,
    px(x, y, z) {
      if (y === 17 && outer(x)) return jean.edge;
      return sh(jean.base, x, z);
    },
    shin(x, y, z) {
      if (y === 18) return x % 2 ? jean.base : fur.tip;
      return (x + y) % 3 === 0 ? fur.c : z === "Q" || x === 6 || x === 10 ? fur.b : fur.a;
    },
    over(c, l, tp) {
      [[4, 18], [11, 18], [4, 21], [11, 20]].forEach(([x, y]) => R(c, l + x, tp + y, 1, 1, fur.tip));
    },
  });
  addTheme("pants", {
    name: "Werewolf Rips",
    pitch: "Jeans torn off at the knee by a full moon, with brown fur bursting out of the legs.",
    common: {
      pitch: "Torn jeans, furry shins.",
      colors: [
        { name: "Blue", base: "#3a4a78", edge: "#8a9ac0" },
        { name: "Black", base: "#231d33", edge: "#5a5070" },
        { name: "Grey", base: "#5a5668", edge: "#9a96a8" },
        { name: "Brown", base: "#5a3a28", edge: "#9a7a5a" },
        { name: "Navy", base: "#1c2a5c", edge: "#5a6a9a" },
        { name: "Olive", base: "#4a5030", edge: "#8a9060" },
      ],
      make: (col) => werewolf(col),
    },
    rare: {
      name: "Silver Wolf",
      pitch: "Black ripped jeans with silver-white fur and three claw slashes across one thigh.",
      item: (() => {
        const w = werewolf({ base: "#231d33", edge: "#5a5070" }, { a: "#d9d2e6", b: "#a9a0bc", c: "#857d8f", tip: "#f3efe6" });
        return { ...w, px: (x, y, z) => (at([[9, 15], [10, 16], [9, 16]], x, y) ? "#c42a3e" : w.px(x, y, z)) };
      })(),
    },
    epic: {
      name: "Full Moon Shift",
      pitch: "The transformation is happening: fur creeps up the legs, bristles, and shrinks back down, over and over.",
      item: (() => {
        const w = werewolf({ base: "#3a4a78", edge: "#8a9ac0" });
        return {
          ...w,
          px(x, y, z, t) {
            const reach = 17 - Math.round(((Math.sin(t * 1.6) + 1) / 2) * 2);
            if (y >= reach && y <= 17 && isLeg(x) && (x + y) % 2 === 0) return "#7a5230";
            return w.px(x, y, z);
          },
          over(c, l, tp, t) {
            w.over(c, l, tp);
            const br = Math.floor(t * 6) % 2;
            if (br) { R(c, l + 4, tp + 19, 1, 1, "#6b4a28"); R(c, l + 11, tp + 21, 1, 1, "#6b4a28"); }
          },
        };
      })(),
    },
    legendary: {
      name: "Moonlit Beast",
      pitch: "Bathed in full-moon light: the fur glows silver-blue, claw marks shine on the thighs, and moon sparkles drift around.",
      item: (() => {
        const w = werewolf({ base: "#14182e", edge: "#5a6a9a" }, { a: "#9fb8e0", b: "#6f88b8", c: "#4a5a8f", tip: "#d8f0ff" });
        return {
          ...w,
          under: (c, l, tp, t) => glow(c, l + 7.5, tp + 20, 12, "#9fd4ff", 0.3 + 0.1 * Math.sin(t * 2)),
          px(x, y, z, t) {
            if (at([[5, 15], [6, 16], [9, 15], [10, 16]], x, y)) return Math.sin(t * 4) > 0 ? "#d8f0ff" : "#9fd4ff";
            return w.px(x, y, z);
          },
          shin(x, y, z, t) {
            const base = w.shin(x, y, z);
            return y > 18 && Math.sin(t * 5 + x + y * 2) > 0.85 ? "#ffffff" : base;
          },
          over(c, l, tp, t) {
            w.over(c, l, tp);
            for (let k = 0; k < 3; k++) {
              const ph = (t * 0.5 + k / 3) % 1;
              const tw = Math.sin(t * 7 + k) > 0.3;
              if (ph < 0.6) sparkle(c, l + [2, 13, 7][k], tp + 24 - Math.round(ph * 10), tw ? "#ffffff" : "#9fd4ff", tw);
            }
          },
        };
      })(),
    },
  });

  // ---------- 6. Ghost Tail ----------
  function tail(c, l, tp, t, o) {
    const sway = reduced ? 0 : Math.sin(t * 2.2) * (o.swayAmt ?? 1);
    for (let y = 15; y <= 26; y++) {
      const k = (y - 15) / 11;
      const half = Math.max(0.5, 3.2 * (1 - k * 0.8));
      const cx = 7.5 + sway * k * k * 3 + (o.curl ? Math.sin(k * 5 + t * 2) * k * 2 : 0);
      const x0 = Math.round(cx - half), x1 = Math.round(cx + half - 1);
      for (let x = x0; x <= x1; x++) {
        const col = x === x1 ? o.edge : y % 4 === 0 ? o.hi : o.base;
        fade(c, o.alpha ? o.alpha(t, y) : 1, () => R(c, l + x, tp + y, 1, 1, col));
      }
    }
  }
  const ghost = (o) => ({ ghost: true, px: () => null, over: (c, l, tp, t) => { if (o.under) o.under(c, l, tp, t); tail(c, l, tp, t, o); if (o.over) o.over(c, l, tp, t); } });
  addTheme("pants", {
    name: "Ghost Tail",
    pitch: "No legs at all: from the waist down you're a wispy ghost tail that sways, floating above the floor.",
    common: {
      pitch: "A swaying ghost tail.",
      colors: [
        { name: "Classic white", base: "#f3efe6", hi: "#ffffff", edge: "#b9b0d9" },
        { name: "Lavender", base: "#d8c8f0", hi: "#ece2ff", edge: "#a08ac8" },
        { name: "Mint", base: "#c8f0dc", hi: "#e2fff0", edge: "#8ac8a8" },
        { name: "Sky", base: "#c8e0f8", hi: "#e2f0ff", edge: "#8aaad0" },
        { name: "Peach", base: "#f8dcc8", hi: "#fff0e2", edge: "#d0a88a" },
        { name: "Smoke", base: "#a9a3b5", hi: "#c9c3d5", edge: "#6b6380" },
      ],
      make: (col) => ghost(col),
    },
    rare: {
      name: "Chained Spirit",
      pitch: "A ghost tail with an iron shackle around it and a chain dragging a ball along the floor.",
      item: ghost({
        base: "#e8e2f0", hi: "#ffffff", edge: "#a9a0bc", swayAmt: 0.5,
        over(c, l, tp) {
          R(c, l + 6, tp + 21, 3, 1, "#5a5668");
          [[9, 22], [10, 23], [11, 24], [12, 25]].forEach(([x, y], i) => R(c, l + x, tp + y, 1, 1, i % 2 ? "#857d8f" : "#5a5668"));
          spr(c, [".kk.", "kkkk", "kkkk", ".kk."], { k: "#3a3646" }, l + 12, tp + 23);
          R(c, l + 13, tp + 24, 1, 1, "#6b6380");
        },
      }),
    },
    epic: {
      name: "Curling Wisp",
      pitch: "The tail curls and uncurls like smoke, and little wisps break off the tip and fade away.",
      item: ghost({
        base: "#f3efe6", hi: "#ffffff", edge: "#b9b0d9", curl: true,
        over(c, l, tp, t) {
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.7 + k / 3) % 1;
            fade(c, 0.8 * (1 - ph), () => R(c, l + 8 + Math.round(Math.sin(t * 2 + k) * 3 + ph * 2), tp + 26 - Math.round(ph * 4) + k, 1, 1, "#e8e0f0"));
          }
        },
      }),
    },
    legendary: {
      name: "Poltergeist",
      pitch: "A glowing, see-through phantom tail that flickers in and out, with spirit orbs circling it.",
      item: ghost({
        base: "#9fd4ff", hi: "#e2f4ff", edge: "#4a72c4",
        alpha: (t, y) => (Math.floor(t * 9) % 7 === 0 ? 0.35 : 0.85 - (y - 15) * 0.03),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 20, 13, "#4fb2ff", 0.35 + 0.1 * Math.sin(t * 3)),
        over(c, l, tp, t) {
          for (let k = 0; k < 3; k++) {
            const a = t * 1.7 + (k * TAU) / 3;
            const x = Math.round(l + 7.5 + Math.cos(a) * 6), y = Math.round(tp + 21 + Math.sin(a) * 3);
            glow(c, x, y, 3, "#b8feff", 0.6);
            R(c, x, y, 1, 1, "#ffffff");
          }
        },
      }),
    },
  });

  // ---------- 7. Slime Pants ----------
  const DRIPS = [[5, 23, 0, 2], [9, 23, 0.4, 1], [6, 21, 0.7, 1], [10, 23, 0.2, 2]];
  const slime = (col) => ({
    long: true,
    px(x, y, z) {
      if (y === 15) return "#3a3044";
      return sh((x + y) % 4 === 0 ? col.hi : col.base, x, z);
    },
  });
  const SLIMES = [
    { name: "Toxic green", base: "#3fb02f", hi: "#7dff5a", drip: "#5ee84a" },
    { name: "Purple ooze", base: "#7a3fc4", hi: "#c46bff", drip: "#a85cf0" },
    { name: "Orange goo", base: "#e0661a", hi: "#ffa45a", drip: "#ff7a1a" },
    { name: "Blood red", base: "#a81e30", hi: "#e0384e", drip: "#c42a3e" },
    { name: "Ghost blue", base: "#3ac6d6", hi: "#b8feff", drip: "#7dfcff" },
    { name: "Tar black", base: "#231d33", hi: "#4a4060", drip: "#3a3150" },
  ];
  addTheme("pants", {
    name: "Slime Pants",
    pitch: "Pants that look dipped in a vat of slime, with gooey drips hanging off the cuffs and knees.",
    common: {
      pitch: "Slime-dipped pants with drips.",
      colors: SLIMES,
      make: (col) => ({ ...slime(col), over: (c, l, tp) => DRIPS.forEach(([x, y, , len]) => R(c, l + x, tp + y, 1, len, col.drip)) }),
    },
    rare: {
      name: "Eyeball Goo",
      pitch: "Toxic slime pants with eyeballs floating in the goo, staring in different directions.",
      item: {
        ...slime(SLIMES[0]),
        px(x, y, z) {
          if (at([[5, 16], [10, 19], [6, 22]], x, y)) return "#ffffff";
          if (at([[6, 16], [9, 19], [5, 22]], x, y)) return "#1a1024";
          return slime(SLIMES[0]).px(x, y, z);
        },
        over: (c, l, tp) => DRIPS.forEach(([x, y, , len]) => R(c, l + x, tp + y, 1, len, "#5ee84a")),
      },
    },
    epic: {
      name: "Dripping",
      pitch: "The slime keeps moving: drips stretch longer and longer until they drop off and splat on the floor.",
      item: {
        ...slime(SLIMES[0]),
        over(c, l, tp, t) {
          DRIPS.forEach(([x, y, sp]) => {
            const ph = (t * 0.6 + sp) % 1;
            if (ph < 0.6) R(c, l + x, tp + y, 1, 1 + Math.round(ph * 4), "#5ee84a");
            else {
              R(c, l + x, tp + y, 1, 1, "#5ee84a");
              const fy = y + 3 + Math.round((ph - 0.6) * 20);
              if (fy < 27) R(c, l + x, tp + fy, 1, 1, "#7dff5a");
              else { R(c, l + x - 1, tp + 26, 3, 1, "#3fb02f"); }
            }
          });
        },
      },
    },
    legendary: {
      name: "Toxic Meltdown",
      pitch: "Glowing radioactive goo that bubbles and churns, drips falling into a spreading puddle, bubbles popping off the hips.",
      item: {
        long: true,
        px(x, y, z, t) {
          if (y === 15) return Math.sin(t * 6 + x) > 0.3 ? "#e0ffd8" : "#7dff5a";
          const f = Math.sin(y * 1.1 - t * 5 + x * 0.8);
          return sh(f > 0.6 ? "#e0ffd8" : f > -0.2 ? "#7dff5a" : "#3fb02f", x, z);
        },
        under(c, l, tp, t) {
          glow(c, l + 7.5, tp + 20, 13, "#5ee84a", 0.4 + 0.12 * Math.sin(t * 4));
          const w = 9 + Math.round(Math.sin(t * 2) * 2);
          R(c, l + 7.5 - w / 2, tp + 27, w, 1, "#3fb02f");
        },
        over(c, l, tp, t) {
          DRIPS.forEach(([x, y, sp]) => {
            const ph = (t * 0.8 + sp) % 1;
            R(c, l + x, tp + y, 1, 1 + Math.round(ph * 3), "#7dff5a");
          });
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.9 + k / 4) % 1;
            if (ph < 0.85) R(c, l + 5 + k * 2, tp + 14 - Math.round(ph * 6), 1, 1, "#b7ff9e");
          }
        },
      },
    },
  });

  // ---------- 8. Haunted Pajamas ----------
  const ghostPrint = (x, y, off = 0) => (x * 5 + y * 3 + off) % 9 === 0;
  const pajamas = (col, printFn = ghostPrint, printCol = "#f3efe6") => ({
    long: true,
    px(x, y, z, t) {
      if (y === 15) return x === 7 || x === 8 ? "#f3efe6" : col.band;
      return printFn(x, y, t) ? printCol : sh(col.base, x, z);
    },
    over: (c, l, tp) => R(c, l + 7, tp + 16, 1, 2, "#f3efe6"),
  });
  addTheme("pants", {
    name: "Haunted Pajamas",
    pitch: "Cozy pajama bottoms covered in tiny ghosts, with a drawstring. For the late-night pickup game.",
    common: {
      pitch: "Pajamas with a tiny ghost print.",
      colors: [
        { name: "Purple", base: "#52308a", band: "#3d2470" },
        { name: "Navy", base: "#1c2a5c", band: "#121c40" },
        { name: "Black", base: "#231d33", band: "#14101c" },
        { name: "Mint", base: "#4a9a7a", band: "#357a5e" },
        { name: "Pink", base: "#b8507a", band: "#8f3a5c" },
        { name: "Orange", base: "#c4550a", band: "#8f3c06" },
      ],
      make: (col) => pajamas(col),
    },
    rare: {
      name: "Moon and Stars",
      pitch: "Navy pajamas printed with gold moons and stars instead of ghosts.",
      item: pajamas({ base: "#1c2a5c", band: "#121c40" }, (x, y) => (x * 5 + y * 3) % 7 === 0, "#ffd84a"),
    },
    epic: {
      name: "Wandering Ghosts",
      pitch: "The little ghosts on the fabric aren't printed: they slowly float up the legs and vanish at the waistband.",
      item: pajamas({ base: "#52308a", band: "#3d2470" }, (x, y, t) => ghostPrint(x, y, Math.floor(t * 3))),
    },
    legendary: {
      name: "Sleepwalker",
      pitch: "Dreamy glowing pajamas: Z's float up, a soft lavender glow pulses, and three tiny ghosts circle your legs.",
      item: {
        ...pajamas({ base: "#6b4aa8", band: "#52308a" }, (x, y, t) => ghostPrint(x, y, Math.floor(t * 2)), "#ffffff"),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 19, 13, "#c4a0ff", 0.3 + 0.1 * Math.sin(t * 2)),
        over(c, l, tp, t) {
          R(c, l + 7, tp + 16, 1, 2, "#f3efe6");
          for (let k = 0; k < 2; k++) {
            const ph = (t * 0.4 + k / 2) % 1;
            fade(c, 1 - ph, () => spr(c, ["zzz", ".z.", "zzz"], { z: "#e8e0ff" }, l + 11 + Math.round(ph * 3), tp + 14 - Math.round(ph * 12)));
          }
          for (let k = 0; k < 3; k++) {
            const a = t * 1.2 + (k * TAU) / 3;
            if (Math.sin(a) < -0.3) continue;
            spr(c, [".w.", "www", "w.w"], { w: "#ffffff" }, Math.round(l + 6.5 + Math.cos(a) * 7), Math.round(tp + 20 + Math.sin(a) * 3));
          }
        },
      },
    },
  });

  // ---------- 9. Candy Corn Track Pants ----------
  const cornStripe = (y) => (y >= 21 ? "#ffd84a" : y >= 18 ? "#ff7a1a" : "#fff6e0");
  const track = (col, stripeFn = (x, y) => (outer(x) ? cornStripe(y) : null)) => ({
    long: true,
    px(x, y, z, t) {
      return stripeFn(x, y, t) || sh(col.base, x, z);
    },
  });
  addTheme("pants", {
    name: "Candy Corn Track Pants",
    pitch: "Track pants with a fat candy-corn side stripe, yellow, orange and white from ankle to hip.",
    common: {
      pitch: "Track pants with a candy-corn stripe.",
      colors: [
        { name: "Black", base: "#1f1a2a" }, { name: "Navy", base: "#1c2a5c" }, { name: "Purple", base: "#4a2f7a" },
        { name: "Charcoal", base: "#3a3646" }, { name: "Forest", base: "#2f4a2a" }, { name: "Maroon", base: "#5c1424" },
      ],
      make: (col) => track(col),
    },
    rare: {
      name: "Sprinkles",
      pitch: "The candy-corn track pants covered in colorful candy sprinkles.",
      item: track({ base: "#1f1a2a" }, (x, y) => {
        if (outer(x)) return cornStripe(y);
        const h = hash(x, y, 7);
        return h < 0.22 ? ["#ff6fb5", "#5ee84a", "#4fb2ff", "#ffd84a"][Math.floor(h * 18) % 4] : null;
      }),
    },
    epic: {
      name: "Sugar Rush",
      pitch: "The candy-corn stripe races up the leg, the colors chasing each other from ankle to hip.",
      item: track({ base: "#1f1a2a" }, (x, y, t) => (outer(x) ? ["#ffd84a", "#ff7a1a", "#fff6e0"][Math.floor(y / 2 + t * 6) % 3] : null)),
    },
    legendary: {
      name: "Candy Comet",
      pitch: "The stripes glow like candy neon, little candy corns spin around your legs, and sugar sparkles burst off.",
      item: {
        ...track({ base: "#140f20" }, (x, y, t) => (outer(x) ? ["#ffe14d", "#ff9a3a", "#ffffff"][Math.floor(y / 2 + t * 5) % 3] : null)),
        under: (c, l, tp, t) => glow(c, l + 7.5, tp + 20, 13, "#ff9a3a", 0.3 + 0.1 * Math.sin(t * 5)),
        over(c, l, tp, t) {
          for (let k = 0; k < 3; k++) {
            const a = t * 1.6 + (k * TAU) / 3;
            const x = Math.round(l + 7 + Math.cos(a) * 7), y = Math.round(tp + 20 + Math.sin(a) * 3);
            R(c, x, y, 1, 1, "#ffffff"); R(c, x, y + 1, 1, 1, "#ff7a1a"); R(c, x, y + 2, 1, 1, "#ffd84a");
          }
          const ph = (t * 1.2) % 1;
          if (ph < 0.25) sparkle(c, l + 12, tp + 17, "#fff6e0", ph < 0.12);
        },
      },
    },
  });

  // ---------- 10. Vampire Tux Pants ----------
  const tux = (col, stripe = (x, y) => (outer(x) && y >= 16 ? col.stripe : null)) => ({
    long: true,
    px(x, y, z, t) {
      if (y === 15) return col.waist ?? darken(col.base, 0.75);
      return stripe(x, y, t) || sh(col.base, x, z);
    },
  });
  addTheme("pants", {
    name: "Vampire Tux Pants",
    pitch: "Black formal trousers with a satin red stripe down each side, for a count who still has to play volleyball.",
    common: {
      pitch: "Formal trousers with a satin side stripe.",
      colors: [
        { name: "Black", base: "#14101c", stripe: "#c42a3e" },
        { name: "Midnight blue", base: "#121c40", stripe: "#c42a3e" },
        { name: "Burgundy", base: "#4a0c18", stripe: "#14101c" },
        { name: "Charcoal", base: "#2a2433", stripe: "#8f1426" },
        { name: "Plum", base: "#33205a", stripe: "#c9a24a" },
        { name: "White", base: "#e8e0d0", stripe: "#14101c" },
      ],
      make: (col) => tux(col),
    },
    rare: {
      name: "Bat Cummerbund",
      pitch: "The tux trousers with a blood-red cummerbund at the waist and a little silver bat buckle.",
      item: {
        ...tux({ base: "#14101c", stripe: "#c42a3e", waist: "#8f1426" }),
        over(c, l, tp) {
          R(c, l + 4, tp + 14, 8, 1, "#8f1426"); R(c, l + 4, tp + 15, 1, 1, "#8f1426"); R(c, l + 11, tp + 15, 1, 1, "#8f1426");
          spr(c, ["s.s", ".s."], { s: "#c9c2d9" }, l + 6, tp + 14);
        },
      },
    },
    epic: {
      name: "Blood Drip Stripe",
      pitch: "The satin stripes are wet: drops of blood run down them and drip off at the ankles.",
      item: {
        ...tux({ base: "#14101c", stripe: "#8f1426" }, (x, y, t) => {
          if (!outer(x) || y < 16) return null;
          const ph = (t * 0.8 + (x === 5 ? 0 : 0.5)) % 1;
          return Math.abs(y - (16 + ph * 8)) < 1 ? "#ff3b4d" : "#8f1426";
        }),
        over(c, l, tp, t) {
          for (const [x, sp] of [[5, 0], [10, 0.5]]) {
            const ph = (t * 0.8 + sp) % 1;
            if (ph > 0.9) R(c, l + x, tp + 25 + Math.round((ph - 0.9) * 20), 1, 1, "#c42a3e");
          }
        },
      },
    },
    legendary: {
      name: "Count's Swarm",
      pitch: "The trouser cuffs keep dissolving into a swarm of bats that flutter off into the night, with a red glow and mist at your feet.",
      item: {
        ...tux({ base: "#14101c", stripe: "#c42a3e" }, (x, y, t) => (outer(x) && y >= 16 ? (Math.sin(t * 3 + y) > 0.6 ? "#ff3b4d" : "#c42a3e") : null)),
        under(c, l, tp, t) {
          glow(c, l + 7.5, tp + 23, 12, "#c42a3e", 0.3 + 0.1 * Math.sin(t * 3));
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.3 + k / 3) % 1;
            fade(c, 0.3 * (1 - ph), () => R(c, l + 2 + k * 4 + Math.round(ph * 3), tp + 25, 4, 1, "#a99bc9"));
          }
        },
        over(c, l, tp, t) {
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.7 + k / 4) % 1;
            const sx = [5, 10, 6, 9][k], dir = sx < 8 ? -1 : 1;
            const x = l + sx + Math.round(dir * ph * 8 + Math.sin(t * 6 + k) * 1), y = tp + 23 - Math.round(ph * 14);
            fade(c, 1 - ph * 0.7, () => spr(c, BAT[Math.floor(t * 10 + k) % 2], { k: "#a8243a" }, x - 1, y));
          }
        },
      },
    },
  });
}
