// ---------- Shoes: 10 themes ----------
// Shoe zones: f/F rows 25-26 (left x 4-6, right x 9-11, toes outward at x 4 and 11), socks w rows 23-24.
// The two feet mirror across x -> 15 - x.
const SH_M = (x) => 15 - x;
const shToe = (x) => x === 4 || x === 11;
const shLace = (x) => x === 5 || x === 10;
// draw a pixel on both feet (left coordinate given)
const both = (c, l, tp, x, y, col) => { R(c, l + x, tp + y, 1, 1, col); R(c, l + SH_M(x), tp + y, 1, 1, col); };

// ---------- 1. Pumpkin Sneakers ----------
addTheme("shoes", {
  name: "Pumpkin Sneakers",
  pitch: "Chunky sneakers that look like two little pumpkins, with black laces and a green stem on each toe.",
  common: {
    pitch: "Pumpkin sneakers with a stem on the toe.",
    colors: [
      { name: "Orange", a: "#ff7a1a", sole: "#8f3c06" },
      { name: "Ghost white", a: "#e8e0d0", sole: "#9a8f78" },
      { name: "Gourd green", a: "#5a8a3a", sole: "#2f4a1e" },
      { name: "Blue heirloom", a: "#7a98aa", sole: "#3f5662" },
      { name: "Cinderella red", a: "#c4402a", sole: "#6e1e12" },
      { name: "Rotten", a: "#8a845a", sole: "#4a462c" },
    ],
    make: (col) => ({
      px: (x, y) => (y === 26 ? col.sole : shLace(x) ? "#1a1024" : col.a),
      over: (c, l, tp) => both(c, l, tp, 4, 24, "#4a7a28"),
    }),
  },
  rare: {
    name: "Jack-o'-Kicks",
    pitch: "Each sneaker is carved like a jack-o'-lantern, with glowing triangle eyes across the toe.",
    item: {
      px: (x, y) => (y === 26 ? "#1a1024" : x === 4 || x === 6 || x === 9 || x === 11 ? "#ffd84a" : "#ff7a1a"),
      over: (c, l, tp) => both(c, l, tp, 5, 24, "#4a7a28"),
    },
  },
  epic: {
    name: "Candlelit Kicks",
    pitch: "The carved faces flicker like there's a candle inside each shoe, throwing warm light on the floor.",
    item: {
      under: (c, l, g, t) => glow(c, l + 7, g + 26, 9, "#ff9a3a", 0.3 + 0.12 * Math.sin(t * 9)),
      px: (x, y, z, t) => {
        if (y === 26) return "#1a1024";
        if (x === 4 || x === 6 || x === 9 || x === 11) return Math.sin(t * 9) + Math.sin(t * 5.1 + x) > -0.5 ? "#fff3a0" : "#ffd84a";
        return "#ff7a1a";
      },
      over: (c, l, tp) => both(c, l, tp, 5, 24, "#4a7a28"),
    },
  },
  legendary: {
    name: "Hellfire Pumpkins",
    pitch: "Pumpkin sneakers on fire: the faces blaze white-hot, flames lick up around the ankles and embers drift away.",
    item: {
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 13, "#ff7a1a", 0.4 + 0.15 * Math.sin(t * 11)),
      px: (x, y, z, t) => (y === 26 ? "#3a1004" : x === 4 || x === 6 || x === 9 || x === 11 ? (Math.floor(t * 12) % 3 ? "#ffffff" : "#fff3a0") : "#d9541a"),
      over: (c, l, tp, t) => {
        const COLS = ["#ffffff", "#fff3a0", "#ffd84a", "#ff7a1a", "#c4300a"];
        for (const fx of [4, 5, 6, 9, 10, 11]) {
          for (let k = 0; k < 2; k++) {
            const ph = (t * 2.4 + k / 2 + fx * 0.17) % 1;
            fade(c, 1 - ph * 0.6, () => R(c, l + fx + Math.round(Math.sin(t * 9 + fx + k) * ph), tp + 24 - ph * 5, 1, 1, COLS[Math.min(4, Math.floor(ph * 5))]));
          }
        }
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.5 + k / 3) % 1;
          fade(c, 1 - ph, () => R(c, l + 2 + k * 5 + Math.round(Math.sin(t * 2 + k) * 2), tp + 24 - ph * 12, 1, 1, "#ffd84a"));
        }
      },
    },
  },
});

// ---------- 2. Witch Boots ----------
const curls = (c, l, tp, col) => { both(c, l, tp, 3, 25, col); both(c, l, tp, 2, 24, col); };
addTheme("shoes", {
  name: "Witch Boots",
  pitch: "Pointy boots that climb up over the ankles, with buckles and toes that curl up at the tips.",
  common: {
    pitch: "Ankle boots with curled toes and a buckle.",
    colors: [
      { name: "Black", a: "#231d33", sole: "#0b0614", buckle: "#ffd84a" },
      { name: "Witch purple", a: "#4a2f7a", sole: "#1f1236", buckle: "#ffd84a" },
      { name: "Swamp green", a: "#2f4a2a", sole: "#141f12", buckle: "#c9c2d9" },
      { name: "Blood red", a: "#7a1422", sole: "#2e070d", buckle: "#ffd84a" },
      { name: "Midnight blue", a: "#1c2a5c", sole: "#0a1028", buckle: "#c9c2d9" },
      { name: "Pumpkin", a: "#c4550a", sole: "#4a1f04", buckle: "#1a1024" },
    ],
    make: (col) => ({
      high: true,
      px: (x, y) => (y === 24 && shLace(x) ? col.buckle : y === 26 ? col.sole : col.a),
      over: (c, l, tp) => curls(c, l, tp, col.a),
    }),
  },
  rare: {
    name: "Spiderweb Boots",
    pitch: "Black boots stitched with a silver cobweb pattern and silver buckles, with a red spider on one toe.",
    item: {
      high: true,
      px: (x, y) => (y === 24 && shLace(x) ? "#c9c2d9" : y === 26 ? "#0b0614" : (x + y) % 3 === 0 ? "#d8d0ec" : "#231d33"),
      over: (c, l, tp) => { curls(c, l, tp, "#231d33"); R(c, l + 11, tp + 25, 1, 1, "#ff3b4d"); },
    },
  },
  epic: {
    name: "Starlit Boots",
    pitch: "Deep purple boots whose gold buckles twinkle, with little stars blinking on the curled toe tips.",
    item: {
      high: true,
      px: (x, y, z, t) => (y === 24 && shLace(x) ? (Math.sin(t * 5 + x) > 0.4 ? "#ffffff" : "#ffd84a") : y === 26 ? "#1f1236" : "#4a2f7a"),
      over: (c, l, tp, t) => {
        curls(c, l, tp, "#4a2f7a");
        if (Math.sin(t * 4) > 0.3) R(c, l + 2, tp + 23, 1, 1, "#fff1b0");
        if (Math.sin(t * 4 + 2) > 0.3) R(c, l + 13, tp + 23, 1, 1, "#fff1b0");
      },
    },
  },
  legendary: {
    name: "Broomflight Boots",
    pitch: "Enchanted boots that lift you off the floor on a swirl of purple magic, curled toes glowing and sparkles trailing behind.",
    item: {
      high: true,
      lift: 3,
      under: (c, l, g, t) => {
        glow(c, l + 7, g + 26, 12, "#c46bff", 0.45 + 0.12 * Math.sin(t * 3));
        for (let k = 0; k < 6; k++) {
          const a = t * 3 + (k * TAU) / 6;
          fade(c, 0.8, () => R(c, l + 7.5 + Math.cos(a) * 6, g + 27 + Math.sin(a) * 1.2, 1, 1, k % 2 ? "#c46bff" : "#f0d8ff"));
        }
      },
      px: (x, y) => (y === 24 && shLace(x) ? "#ffd84a" : y === 26 ? "#3a1f66" : "#231d33"),
      over: (c, l, tp, t) => {
        curls(c, l, tp, Math.sin(t * 5) > 0 ? "#e0b0ff" : "#c46bff");
        for (let k = 0; k < 3; k++) {
          const ph = (t * 1.2 + k / 3) % 1;
          if (ph < 0.3) sparkle(c, l + [1, 14, 7][k], tp + [26, 26, 28][k] + Math.round(ph * 4), "#f0d8ff", ph < 0.15);
        }
      },
    },
  },
});

// ---------- 3. Skeleton Feet ----------
function bonesItem(bone, joint, extra = {}) {
  return {
    high: true,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y <= 24) return x === 6 || x === 9 ? bone : null;
      if (y === 25) return x === 6 || x === 9 ? bone : joint;
      return shToe(x) || shLace(x) ? bone : null;
    },
    under: extra.under,
    over: (c, l, tp, t) => { both(c, l, tp, 3, 26, bone); if (extra.over) extra.over(c, l, tp, t); },
  };
}
addTheme("shoes", {
  name: "Skeleton Feet",
  pitch: "No shoes, just bones: bare skeleton ankles and long bony toes.",
  common: {
    pitch: "Bare bony feet.",
    colors: [
      { name: "Bone white", bone: "#ece6d6", joint: "#c9c2b0" },
      { name: "Ash grey", bone: "#b9b2c9", joint: "#8a8494" },
      { name: "Old ivory", bone: "#e0cf9a", joint: "#b8a670" },
      { name: "Charred", bone: "#4a4060", joint: "#2a2433" },
      { name: "Moss", bone: "#b8c99a", joint: "#7d9a5a" },
      { name: "Blood-stained", bone: "#e8c8c0", joint: "#a8424a" },
    ],
    make: (col) => bonesItem(col.bone, col.joint),
  },
  rare: {
    name: "Painted Toenails",
    pitch: "Bony feet with a fresh coat of black-purple polish on every long toe tip.",
    item: bonesItem("#ece6d6", "#c9c2b0", { over: (c, l, tp) => { both(c, l, tp, 3, 26, "#6b3fa8"); both(c, l, tp, 4, 26, "#4a2f7a"); } }),
  },
  epic: {
    name: "Tapping Toes",
    pitch: "Impatient skeleton feet: the toes keep tapping up and down, one foot then the other, with a tiny click of dust.",
    item: bonesItem("#ece6d6", "#c9c2b0", {
      px: (x, y, z, t) => {
        const leftUp = Math.floor(t * 4) % 4 === 0, rightUp = Math.floor(t * 4) % 4 === 2;
        if (y === 26 && ((x === 4 && leftUp) || (x === 11 && rightUp))) return null;
        return undefined;
      },
      over: (c, l, tp, t) => {
        const leftUp = Math.floor(t * 4) % 4 === 0, rightUp = Math.floor(t * 4) % 4 === 2;
        if (leftUp) { R(c, l + 3, tp + 26, 1, 1, "#140a26"); R(c, l + 3, tp + 25, 1, 1, "#ece6d6"); R(c, l + 4, tp + 25, 1, 1, "#ece6d6"); }
        if (rightUp) { R(c, l + 12, tp + 26, 1, 1, "#140a26"); R(c, l + 12, tp + 25, 1, 1, "#ece6d6"); R(c, l + 11, tp + 25, 1, 1, "#ece6d6"); }
      },
    }),
  },
  legendary: {
    name: "Soul Fire Feet",
    pitch: "Skeleton feet wreathed in cold blue spirit-fire that licks up the ankle bones, with glowing sparks floating off.",
    item: bonesItem("#e0f4ff", "#9fd4ff", {
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 12, "#4fb2ff", 0.4 + 0.12 * Math.sin(t * 9)),
      over: (c, l, tp, t) => {
        const COLS = ["#ffffff", "#b8feff", "#4fb2ff", "#2a4a8f"];
        for (const fx of [5, 6, 7, 8, 9, 10]) {
          for (let k = 0; k < 2; k++) {
            const ph = (t * 2 + k / 2 + fx * 0.23) % 1;
            fade(c, 1 - ph * 0.7, () => R(c, l + fx + Math.round(Math.sin(t * 8 + fx) * ph), tp + 26 - ph * 7, 1, 1, COLS[Math.min(3, Math.floor(ph * 4))]));
          }
        }
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.6 + k / 2) % 1;
          fade(c, 1 - ph, () => R(c, l + (k ? 12 : 3), tp + 24 - ph * 10, 1, 1, "#b8feff"));
        }
      },
    }),
  },
});

// ---------- 4. Monster Slippers ----------
const EYES = [4, 6];
function slipperItem(col, extra = {}) {
  return {
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return shToe(x) || shLace(x) ? "#f3efe6" : col.sole;
      return (x + y) % 3 === 0 ? col.hi : col.a;
    },
    under: extra.under,
    over: (c, l, tp, t) => {
      if (extra.eyes !== false) {
        const blink = !reduced && t % 3.5 > 3.3;
        for (const ex of EYES) both(c, l, tp, ex, 24, blink ? col.a : extra.eyeCol || "#ffffff");
        if (!blink) { both(c, l, tp, 5, 24, col.a); }
      }
      if (extra.over) extra.over(c, l, tp, t);
    },
  };
}
addTheme("shoes", {
  name: "Monster Slippers",
  pitch: "Fuzzy monster slippers with googly eyes on top and a row of tiny teeth around the toe.",
  common: {
    pitch: "Fuzzy slippers with blinking eyes and little teeth.",
    colors: [
      { name: "Grape", a: "#6b3fa8", hi: "#7a4ad9", sole: "#52308a" },
      { name: "Lime", a: "#3fb02f", hi: "#5ee84a", sole: "#2f8a3a" },
      { name: "Tangerine", a: "#e0661a", hi: "#ff7a1a", sole: "#a8470a" },
      { name: "Sky", a: "#3a7ac4", hi: "#4f9aff", sole: "#24538f" },
      { name: "Bubblegum", a: "#e05a9a", hi: "#ff8fb8", sole: "#a83a6e" },
      { name: "Dust bunny", a: "#8a8494", hi: "#a49db0", sole: "#5a5468" },
    ],
    make: (col) => slipperItem(col),
  },
  rare: {
    name: "Cyclops Slippers",
    pitch: "Each slipper has one big red-pupiled eye and a little horn sticking up behind it.",
    item: slipperItem({ a: "#2f6b3a", hi: "#3f8a4a", sole: "#1f4a28" }, {
      eyes: false,
      over: (c, l, tp) => { both(c, l, tp, 4, 24, "#ffffff"); both(c, l, tp, 5, 24, "#ff3b4d"); both(c, l, tp, 6, 23, "#e8dcc0"); },
    }),
  },
  epic: {
    name: "Chomp Slippers",
    pitch: "The slippers are hungry: their toothy mouths snap open and shut while their eyes blink.",
    item: slipperItem({ a: "#c4402a", hi: "#e0644a", sole: "#8f2a1a" }, {
      px: (x, y, z, t) => {
        const open = Math.floor(t * 5) % 2 === 0 && t % 2.5 < 1.2;
        if (open && y === 25 && (x === 4 || x === 5 || x === 10 || x === 11)) return "#1a1024";
        return undefined;
      },
      over: (c, l, tp, t) => {
        const open = Math.floor(t * 5) % 2 === 0 && t % 2.5 < 1.2;
        if (open) { both(c, l, tp, 4, 26, "#f3efe6"); both(c, l, tp, 5, 25, "#ff6fb5"); }
      },
    }),
  },
  legendary: {
    name: "Shadow Beasts",
    pitch: "Two pitch-black little beasts with glowing red eyes that look around, smoke curling off their fur, growling in a red haze.",
    item: slipperItem({ a: "#14101c", hi: "#2a2433", sole: "#0b0614" }, {
      eyes: false,
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 12, "#ff3b4d", 0.35 + 0.12 * Math.sin(t * 3)),
      over: (c, l, tp, t) => {
        const look = Math.round(Math.sin(t * 1.4));
        const blink = t % 4 > 3.85;
        if (!blink) {
          both(c, l, tp, 5 + look, 24, "#ff3b4d");
          both(c, l, tp, 4 + Math.max(0, look), 24, "#ff8a8a");
        }
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.7 + k / 4) % 1;
          fade(c, 0.7 * (1 - ph), () => R(c, l + [4, 6, 9, 11][k] + Math.round(Math.sin(t * 2 + k) * 2 * ph), tp + 24 - ph * 9, ph > 0.5 ? 2 : 1, 1, "#4a4060"));
        }
      },
    }),
  },
});

// ---------- 5. Coffin Clogs ----------
function coffinItem(col, extra = {}) {
  const lift = extra.lift || 1;
  return {
    lift,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return col.sole;
      return shLace(x) ? col.cross : col.wood;
    },
    over: (c, l, tp, t) => {
      R(c, l + 4, tp + 27, 3, 1, col.sole); R(c, l + 9, tp + 27, 3, 1, col.sole);
      both(c, l, tp, 5, 24, col.cross);
      if (extra.over) extra.over(c, l, tp, t);
    },
  };
}
addTheme("shoes", {
  name: "Coffin Clogs",
  pitch: "Platform shoes carved like tiny coffins with a cross on each one. Adds a pixel of height.",
  common: {
    pitch: "Coffin platforms with a cross.",
    colors: [
      { name: "Oak", wood: "#5a3428", sole: "#2a1712", cross: "#c9c2d9" },
      { name: "Ebony", wood: "#231d33", sole: "#0b0614", cross: "#c9c2d9" },
      { name: "Red lacquer", wood: "#8f1426", sole: "#3a0810", cross: "#ffd84a" },
      { name: "Bone white", wood: "#e8e0d0", sole: "#9a8f78", cross: "#1a1024" },
      { name: "Mossy", wood: "#3d5a2a", sole: "#1a2a12", cross: "#c9c2d9" },
      { name: "Royal purple", wood: "#4a2f7a", sole: "#1f1236", cross: "#ffd84a" },
    ],
    make: (col) => coffinItem(col),
  },
  rare: {
    name: "Gilded Coffins",
    pitch: "Black lacquered coffins trimmed in gold, with golden crosses and handles.",
    item: coffinItem({ wood: "#14101c", sole: "#b8860b", cross: "#ffd84a" }, {
      px: (x, y) => (y === 25 && shToe(x) ? "#ffc53a" : undefined),
    }),
  },
  epic: {
    name: "Creaking Lids",
    pitch: "Every few seconds the coffin lids creak open a crack and two glowing eyes peer out, then slam shut.",
    item: coffinItem({ wood: "#5a3428", sole: "#2a1712", cross: "#c9c2d9" }, {
      px: (x, y, z, t) => {
        const open = t % 3 > 2;
        if (open && y === 25) return x === 4 || x === 11 ? "#0b0614" : shLace(x) ? "#ffd84a" : "#0b0614";
        return undefined;
      },
      over: (c, l, tp, t) => { if (t % 3 > 2) { both(c, l, tp, 4, 24, "#5a3428"); both(c, l, tp, 5, 24, "#5a3428"); both(c, l, tp, 6, 24, "#7a4a38"); } },
    }),
  },
  legendary: {
    name: "Vampire's Rest",
    pitch: "Black coffins that float on rolling red mist. The lids lift, bats flutter out, and a blood-red glow pours from inside.",
    item: coffinItem({ wood: "#14101c", sole: "#0b0614", cross: "#c42a3e" }, {
      lift: 3,
      under: (c, l, g, t) => {
        glow(c, l + 7, g + 25, 13, "#c42a3e", 0.4 + 0.12 * Math.sin(t * 3));
        for (let k = 0; k < 5; k++) fade(c, 0.35, () => R(c, l + ((k * 4 + t * 4) % 20) - 3, g + 26, 3, 1, "#e0a0a8"));
      },
      px: (x, y, z, t) => (y === 25 && t % 2.6 > 1.6 && !shToe(x) ? "#c42a3e" : undefined),
      over: (c, l, tp, t) => {
        const ph = (t % 2.6) / 2.6;
        if (ph > 0.6) {
          const p = (ph - 0.6) / 0.4;
          const flap = Math.floor(t * 10) % 2;
          for (const [sx, dir] of [[5, -1], [10, 1]]) {
            const bx = l + sx + dir * Math.round(p * 6), by = tp + 24 - Math.round(p * 10);
            fade(c, 1 - p * 0.5, () => spr(c, flap ? ["k.k", ".k."] : [".k.", "k.k"], { k: "#0b0614" }, bx - 1, by));
          }
        }
      },
    }),
  },
});

// ---------- 6. Ghost Sneakers ----------
function ghostItem(col, extra = {}) {
  return {
    high: extra.high,
    lift: extra.lift,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return col.sole;
      if (y === 25 && shLace(x)) return "#1a1024";
      return col.a;
    },
    over: (c, l, tp, t) => {
      for (const [x, d] of [[7, 1], [8, -1]]) {
        const ph = (t * 0.9 + (d > 0 ? 0 : 0.5)) % 1;
        fade(c, 0.6 * (1 - ph), () => R(c, l + x + Math.round(d * ph * 2), tp + 25 - Math.round(ph * 3), 1, 1, col.trail || "#e8e0f0"));
      }
      if (extra.over) extra.over(c, l, tp, t);
    },
  };
}
addTheme("shoes", {
  name: "Ghost Sneakers",
  pitch: "Sneakers with a little ghost face on each side and a misty trail floating off the heels.",
  common: {
    pitch: "Ghost-face sneakers with a misty trail.",
    colors: [
      { name: "Sheet white", a: "#f3efe6", sole: "#b9b0d9" },
      { name: "Mint", a: "#c8f5d8", sole: "#7ab894", trail: "#e0fff0" },
      { name: "Lavender", a: "#d8c8f0", sole: "#9a86c0" },
      { name: "Pale blue", a: "#c8e0f8", sole: "#7a9ac0", trail: "#e0f0ff" },
      { name: "Peach", a: "#f8d8c8", sole: "#c0947a" },
      { name: "Fog grey", a: "#b9b2c9", sole: "#7d7591" },
    ],
    make: (col) => ghostItem(col),
  },
  rare: {
    name: "Sheet Kicks",
    pitch: "Ghost high-tops with a wavy little bedsheet hem over the ankles and big round O-mouths.",
    item: ghostItem({ a: "#f3efe6", sole: "#b9b0d9" }, {
      high: true,
      px: (x, y) => {
        if (y === 23) return x === 5 || x === 10 ? null : "#f3efe6";
        if (y === 24) return "#e8e0f0";
        if (y === 25 && shToe(x)) return "#1a1024";
        return undefined;
      },
    }),
  },
  epic: {
    name: "Fading Kicks",
    pitch: "Now you see them, now you don't: the shoes slowly fade to see-through and back while the faces keep watching.",
    item: {
      under: (c, l, g, t) => glow(c, l + 7, g + 26, 8, "#e8e0f0", 0.2),
      px: (x, y, z, t) => {
        const a = (Math.sin(t * 1.6) + 1) / 2;
        if (y === 25 && shLace(x)) return "#1a1024";
        if (a < 0.3) return y === 26 ? "#3a3150" : "#5a5078";
        if (a < 0.65) return y === 26 ? "#7d7591" : "#b9b0d9";
        return y === 26 ? "#b9b0d9" : "#f3efe6";
      },
    },
  },
  legendary: {
    name: "Poltergeist",
    pitch: "The sneakers float off the floor while tiny ghosts swirl around your ankles in a glowing white haze.",
    item: ghostItem({ a: "#f3efe6", sole: "#b9b0d9" }, {
      lift: 3,
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 13, "#e8e0f0", 0.35 + 0.1 * Math.sin(t * 2)),
      over: (c, l, tp, t) => {
        for (let k = 0; k < 3; k++) {
          const a = t * 2 + (k * TAU) / 3;
          const x = Math.round(l + 7.5 + Math.cos(a) * 7), y = Math.round(tp + 25 + Math.sin(a) * 2);
          if (Math.sin(a) < -0.3) continue;
          spr(c, [".w.", "wkw", "w.w"], { w: "#f3efe6", k: "#1a1024" }, x - 1, y - 1);
        }
      },
    }),
  },
});

// ---------- 7. Frankenstein Stompers ----------
function stomperItem(col, extra = {}) {
  return {
    high: true,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return col.sole;
      if (y <= 24) return col.a;
      return col.toe;
    },
    over: (c, l, tp, t) => {
      both(c, l, tp, 3, 25, col.toe); both(c, l, tp, 3, 26, col.sole);
      both(c, l, tp, 2, 24, col.bolt);
      if (extra.over) extra.over(c, l, tp, t);
    },
  };
}
addTheme("shoes", {
  name: "Frankenstein Stompers",
  pitch: "Huge, clunky boots a size too big, with thick soles and steel bolts sticking out of the sides.",
  common: {
    pitch: "Oversized boots with bolts.",
    colors: [
      { name: "Black", a: "#2a2433", toe: "#3a3646", sole: "#0b0614", bolt: "#a49db0" },
      { name: "Gunmetal", a: "#4a4a5a", toe: "#5a5a6e", sole: "#1a1a24", bolt: "#d8d0ec" },
      { name: "Monster green", a: "#2f4a26", toe: "#456b36", sole: "#141f10", bolt: "#a49db0" },
      { name: "Mud brown", a: "#4a3020", toe: "#6b4a30", sole: "#1f140c", bolt: "#c9c2d9" },
      { name: "Navy", a: "#1c2440", toe: "#2a3660", sole: "#0a0f1c", bolt: "#c9c2d9" },
      { name: "Lab white", a: "#c9c2d9", toe: "#e8e0f0", sole: "#5a5468", bolt: "#6b6380" },
    ],
    make: (col) => stomperItem(col),
  },
  rare: {
    name: "Stitched Stompers",
    pitch: "Green patchwork boots sewn together from mismatched leather with big black stitches.",
    item: stomperItem({ a: "#456b36", toe: "#6b4a30", sole: "#141f10", bolt: "#a49db0" }, {
      px: (x, y) => (y === 24 && (x === 5 || x === 9) ? "#1a1024" : y === 25 && shLace(x) ? "#1a1024" : undefined),
    }),
  },
  epic: {
    name: "Stomp Quake",
    pitch: "Every few steps the boots stomp down hard: the floor cracks, dust puffs out and everything shakes for a moment.",
    item: (() => {
      const base = stomperItem({ a: "#2a2433", toe: "#3a3646", sole: "#0b0614", bolt: "#a49db0" });
      return {
        ...base,
        under: (c, l, g, t) => {
          const ph = t % 2.2;
          if (ph < 0.6) {
            const p = ph / 0.6;
            fade(c, 1 - p, () => { R(c, l + 1 - p * 3, g + 26, 2, 1, "#8a8494"); R(c, l + 13 + p * 3, g + 26, 2, 1, "#8a8494"); });
            R(c, l + 7, g + 27, 2, 1, "#0b0614"); R(c, l + 6, g + 27, 1, 1, "#0b0614");
          }
        },
        over: (c, l, tp, t) => {
          const ph = t % 2.2;
          const dx = ph < 0.3 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
          base.over(c, l + dx, tp, t);
        },
      };
    })(),
  },
  legendary: {
    name: "Lightning Stompers",
    pitch: "The bolts crackle with electricity: lightning arcs between the boots, sparks fly, and a blue glow flickers like a lab experiment.",
    item: stomperItem({ a: "#2a2433", toe: "#3a3646", sole: "#0b0614", bolt: "#9fd4ff" }, {
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 13, "#4fb2ff", 0.3 + (Math.floor(t * 9) % 5 === 0 ? 0.3 : 0)),
      over: (c, l, tp, t) => {
        const step = Math.floor(t * 8);
        if (step % 3 === 2) return;
        let seed = step * 9301 + 49297;
        const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        let y = tp + 24;
        for (let x = 6; x <= 9; x++) { R(c, l + x, y, 1, 1, x % 2 ? "#ffffff" : "#9fd4ff"); y += rnd() > 0.5 ? 1 : -1; y = Math.max(tp + 22, Math.min(tp + 25, y)); }
        for (let k = 0; k < 2; k++) sparkle(c, l + (k ? 14 : 1), tp + 22 + Math.round(rnd() * 3), "#ffffff", false);
        R(c, l + 2, tp + 24, 1, 1, "#ffffff"); R(c, l + 13, tp + 24, 1, 1, "#ffffff");
      },
    }),
  },
});

// ---------- 8. Vampire Loafers ----------
function loaferItem(col, extra = {}) {
  return {
    lift: extra.lift,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return col.sole;
      if (y === 25 && shLace(x)) return col.buckle;
      return x === 4 || x === 9 ? col.shine : col.a;
    },
    over: (c, l, tp, t) => { if (extra.over) extra.over(c, l, tp, t); },
  };
}
addTheme("shoes", {
  name: "Vampire Loafers",
  pitch: "Shiny dress shoes with blood-red soles and a little buckle. Formal wear for the undead.",
  common: {
    pitch: "Polished loafers with a buckle.",
    colors: [
      { name: "Patent black", a: "#14101c", shine: "#4a4060", sole: "#c42a3e", buckle: "#c9c2d9" },
      { name: "Oxblood", a: "#4a0c16", shine: "#8f2a3a", sole: "#1a0408", buckle: "#ffd84a" },
      { name: "Midnight", a: "#121c40", shine: "#2e4488", sole: "#c42a3e", buckle: "#c9c2d9" },
      { name: "Bone patent", a: "#e8e0d0", shine: "#ffffff", sole: "#8f1426", buckle: "#1a1024" },
      { name: "Velvet purple", a: "#33205a", shine: "#5d4688", sole: "#14101c", buckle: "#ffd84a" },
      { name: "Grave grey", a: "#3a3646", shine: "#6b6380", sole: "#14101c", buckle: "#c9c2d9" },
    ],
    make: (col) => loaferItem(col),
  },
  rare: {
    name: "Bat Buckle",
    pitch: "Black patent loafers with a silver bat spreading its wings across each toe, and red soles.",
    item: loaferItem({ a: "#14101c", shine: "#4a4060", sole: "#c42a3e", buckle: "#c9c2d9" }, {
      over: (c, l, tp) => { both(c, l, tp, 4, 24, "#c9c2d9"); both(c, l, tp, 6, 24, "#c9c2d9"); both(c, l, tp, 5, 24, "#14101c"); },
    }),
  },
  epic: {
    name: "Blood Drip",
    pitch: "The red soles never dry. A drop of blood slowly gathers under each heel, falls and splats on the floor.",
    item: loaferItem({ a: "#14101c", shine: "#4a4060", sole: "#c42a3e", buckle: "#c9c2d9" }, {
      over: (c, l, tp, t) => {
        for (const [x, sp] of [[6, 0], [9, 0.5]]) {
          const ph = (t * 0.6 + sp) % 1;
          if (ph < 0.6) R(c, l + x, tp + 27, 1, 1, "#c42a3e");
          else if (ph < 0.8) R(c, l + x, tp + 27 + 1, 1, 1, "#e0384e");
          else fade(c, 1 - (ph - 0.8) * 5, () => R(c, l + x - 1, tp + 28, 3, 1, "#8f1426"));
        }
      },
    }),
  },
  legendary: {
    name: "Mist Form",
    pitch: "Your feet dissolve into blood-red mist: the loafers flicker in and out as a swarm of tiny bats swirls around your ankles.",
    item: loaferItem({ a: "#14101c", shine: "#8f1426", sole: "#c42a3e", buckle: "#ff3b4d" }, {
      lift: 1,
      under: (c, l, g, t) => {
        glow(c, l + 7, g + 25, 14, "#c42a3e", 0.45 + 0.15 * Math.sin(t * 3));
        for (let k = 0; k < 6; k++) fade(c, 0.35, () => R(c, l + ((k * 3 + t * 5) % 18) - 2, g + 25 + (k % 2), 3, 1, "#e0606e"));
      },
      px: (x, y, z, t) => (Math.sin(t * 3 + x * 0.7) > 0.6 ? (y === 26 ? "#8f1426" : "#c42a3e") : undefined),
      over: (c, l, tp, t) => {
        const flap = Math.floor(t * 10) % 2;
        for (let k = 0; k < 4; k++) {
          const a = t * 2.2 + (k * TAU) / 4;
          const x = Math.round(l + 7.5 + Math.cos(a) * 8), y = Math.round(tp + 24 + Math.sin(a) * 2);
          spr(c, flap ? ["k.k", ".k."] : [".k.", "k.k"], { k: "#0b0614" }, x - 1, y);
        }
      },
    }),
  },
});

// ---------- 9. Candy Corn High-Tops ----------
function candyItem(col, extra = {}) {
  return {
    high: true,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 23) return col.top;
      if (y === 24) return col.mid;
      if (y === 26) return col.sole;
      return shToe(x) ? col.toe : col.mid;
    },
    over: extra.over,
  };
}
addTheme("shoes", {
  name: "Candy Corn High-Tops",
  pitch: "High-top sneakers striped like candy corn, light at the toe, bright in the middle and a band at the ankle cuff.",
  common: {
    pitch: "Three-band candy high-tops.",
    colors: [
      { name: "Classic corn", top: "#ffd84a", mid: "#ff7a1a", toe: "#ffffff", sole: "#d9cfb8" },
      { name: "Harvest corn", top: "#8a5a2a", mid: "#c4550a", toe: "#f3e9d2", sole: "#5a3a1a" },
      { name: "Witch's brew", top: "#5ee84a", mid: "#6b3fa8", toe: "#ffffff", sole: "#33205a" },
      { name: "Mint corn", top: "#7dfcff", mid: "#5ee84a", toe: "#ffffff", sole: "#2f8a3a" },
      { name: "Bloody corn", top: "#ff7a1a", mid: "#c42a3e", toe: "#ffffff", sole: "#6e0f1d" },
      { name: "Midnight corn", top: "#c46bff", mid: "#231d33", toe: "#ffffff", sole: "#0b0614" },
    ],
    make: (col) => candyItem(col),
  },
  rare: {
    name: "Wrapped Candy",
    pitch: "Each high-top is wrapped like a piece of candy, with twisted wrapper ends poking out of both sides.",
    item: candyItem({ top: "#ffd84a", mid: "#ff7a1a", toe: "#ffffff", sole: "#d9cfb8" }, {
      px: (x, y) => (y === 25 && shLace(x) ? "#fff6e0" : undefined),
      over: (c, l, tp) => { both(c, l, tp, 3, 24, "#e8e0f0"); both(c, l, tp, 2, 23, "#c8c0e0"); both(c, l, tp, 2, 25, "#c8c0e0"); },
    }),
  },
  epic: {
    name: "Sugar Rush",
    pitch: "The candy-corn stripes won't sit still: they scroll up the shoes in a loop, like a barber pole made of sugar.",
    item: candyItem({ top: "#ffd84a", mid: "#ff7a1a", toe: "#ffffff", sole: "#d9cfb8" }, {
      px: (x, y, z, t) => {
        if (y === 26) return undefined;
        const COLS = ["#ffffff", "#ff7a1a", "#ffd84a"];
        return COLS[(((y + Math.floor(t * 6)) % 3) + 3) % 3];
      },
    }),
  },
  legendary: {
    name: "Candy Burst",
    pitch: "Sneakers bursting with sweets: candy corn pops out and rains around your feet, sparkling in a rainbow sugar glow.",
    item: candyItem({ top: "#ffd84a", mid: "#ff7a1a", toe: "#ffffff", sole: "#d9cfb8" }, {
      under: (c, l, g, t) => glow(c, l + 7, g + 25, 13, `hsl(${Math.round((t * 90) % 360)} 100% 60%)`, 0.35),
      over: (c, l, tp, t) => {
        for (let k = 0; k < 5; k++) {
          const ph = (t * 0.9 + k / 5) % 1;
          const dir = k % 2 ? 1 : -1;
          const x = l + 7.5 + dir * (2 + ph * 7), y = tp + 23 - Math.sin(ph * Math.PI) * 8 + ph * 3;
          fade(c, 1 - ph * 0.5, () => { R(c, x, y, 1, 1, "#ffffff"); R(c, x, y + 1, 1, 1, "#ff7a1a"); R(c, x, y + 2, 1, 1, "#ffd84a"); });
        }
        for (let k = 0; k < 2; k++) {
          const ph = (t * 1.3 + k / 2) % 1;
          if (ph < 0.3) sparkle(c, l + (k ? 13 : 2), tp + 21, `hsl(${Math.round((k * 180 + t * 200) % 360)} 100% 75%)`, ph < 0.15);
        }
      },
    }),
  },
});

// ---------- 10. Bat-Wing Sneakers ----------
// little wings on the outside of each ankle (left wing at x 2-4, mirrored on the right)
function wings(c, l, tp, col, up) {
  if (up) { both(c, l, tp, 4, 24, col); both(c, l, tp, 3, 23, col); both(c, l, tp, 2, 22, col); both(c, l, tp, 3, 22, col); both(c, l, tp, 4, 23, col); }
  else { both(c, l, tp, 4, 24, col); both(c, l, tp, 3, 24, col); both(c, l, tp, 2, 24, col); both(c, l, tp, 3, 23, col); both(c, l, tp, 2, 25, col); }
}
function batItem(col, extra = {}) {
  return {
    lift: extra.lift,
    under: extra.under,
    px: (x, y, z, t) => {
      if (extra.px) { const v = extra.px(x, y, z, t); if (v !== undefined) return v; }
      if (y === 26) return col.sole;
      if (y === 25 && shLace(x)) return col.lace || "#e8dff5";
      return col.a;
    },
    over: (c, l, tp, t) => {
      wings(c, l, tp, col.wing, extra.flap ? extra.flap(t) : true);
      if (extra.over) extra.over(c, l, tp, t);
    },
  };
}
addTheme("shoes", {
  name: "Bat-Wing Sneakers",
  pitch: "Sneakers with little leathery bat wings sprouting from the ankles, like Halloween's version of winged messenger shoes.",
  common: {
    pitch: "Sneakers with bat wings at the ankles.",
    colors: [
      { name: "Black", a: "#231d33", sole: "#e8dff5", wing: "#0b0614" },
      { name: "Purple", a: "#6b3fa8", sole: "#e8dff5", wing: "#2a1a4a" },
      { name: "Red", a: "#c42a3e", sole: "#14101c", wing: "#14101c" },
      { name: "Grey", a: "#8a8494", sole: "#e8dff5", wing: "#2a2433" },
      { name: "Orange", a: "#ff7a1a", sole: "#14101c", wing: "#14101c" },
      { name: "White", a: "#f3efe6", sole: "#b9b0d9", wing: "#4a4060", lace: "#1a1024" },
    ],
    make: (col) => batItem(col),
  },
  rare: {
    name: "Vampire Bat Kicks",
    pitch: "Black sneakers with red-veined bat wings, a blood-red sole and two little white fangs on each toe.",
    item: batItem({ a: "#14101c", sole: "#c42a3e", wing: "#5c0c18", lace: "#c42a3e" }, {
      px: (x, y) => (y === 26 && shToe(x) ? "#ffffff" : undefined),
    }),
  },
  epic: {
    name: "Flapping Wings",
    pitch: "The ankle wings flap every few seconds, like the shoes are thinking about flying away.",
    item: batItem({ a: "#231d33", sole: "#e8dff5", wing: "#2a1a4a" }, {
      flap: (t) => (t % 2.5 < 1 ? Math.floor(t * 10) % 2 === 0 : true),
    }),
  },
  legendary: {
    name: "Night Flight",
    pitch: "The wings flap hard enough to lift you off the floor, a swarm of bats circles your feet and a purple moonlit glow follows you.",
    item: batItem({ a: "#231d33", sole: "#c46bff", wing: "#4a2f7a", lace: "#c46bff" }, {
      lift: 3,
      flap: (t) => Math.floor(t * 9) % 2 === 0,
      under: (c, l, g, t) => {
        glow(c, l + 7, g + 25, 13, "#7a4ad9", 0.4 + 0.12 * Math.sin(t * 2));
        R(c, l + 4, g + 27, 3, 1, "#1a1024"); R(c, l + 9, g + 27, 3, 1, "#1a1024");
      },
      over: (c, l, tp, t) => {
        const flap = Math.floor(t * 10) % 2;
        for (let k = 0; k < 3; k++) {
          const a = -t * 1.8 + (k * TAU) / 3;
          const x = Math.round(l + 7.5 + Math.cos(a) * 9), y = Math.round(tp + 22 + Math.sin(a) * 3);
          spr(c, flap ? ["k.k", ".k."] : [".k.", "k.k"], { k: "#0b0614" }, x - 1, y);
        }
        if (Math.sin(t * 4) > 0.5) sparkle(c, l + 7, tp + 21, "#f0d8ff", false);
      },
    }),
  },
});
