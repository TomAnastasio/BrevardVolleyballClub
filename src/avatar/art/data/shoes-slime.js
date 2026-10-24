// Copied from design/gacha/source/data/shoes-slime.js (branch claude/gacha-avatars-design).
import { R, spr, reduced, TAU, glow, sparkle, fade, darken, lighten, at, hash, CX, OUT, makeGrid, outline, shadedRow, ellipse, addTheme, addSkin } from "../kit.js";

// Slime Kicks: the three options per tier from the Slime Kicks page, as three themes.
(() => {
const SLIMES = [
  { name: "Toxic green", a: "#3fb02f", hi: "#7dff5a", sole: "#2f8a3a", drip: "#5ee84a" },
  { name: "Purple ooze", a: "#7a3fc4", hi: "#c46bff", sole: "#52308a", drip: "#a85cf0" },
  { name: "Orange goo", a: "#e0661a", hi: "#ffa45a", sole: "#a8470a", drip: "#ff7a1a" },
  { name: "Blood red", a: "#a81e30", hi: "#e0384e", sole: "#6e0f1d", drip: "#c42a3e" },
  { name: "Ghost blue", a: "#3ac6d6", hi: "#b8feff", sole: "#2a8a96", drip: "#7dfcff" },
  { name: "Tar black", a: "#231d33", hi: "#4a4060", sole: "#0b0614", drip: "#3a3150" },
];
const TOXIC = SLIMES[0];
const slimePx = (s) => (x, y) => (y === 26 ? s.sole : (x + y) % 3 === 0 ? s.hi : s.a);
function drips(c, left, top, s, t, extra = 0) {
  R(c, left + 3, top + 26, 1, 1, s.drip); R(c, left + 12, top + 26, 1, 1, s.drip);
  const len = Math.round((Math.sin(t * 2) + 1) / 2) + extra;
  R(c, left + 4, top + 25, 1, 1 + len, s.hi); R(c, left + 11, top + 25, 1, 1 + len, s.hi);
}

const OPTIONS = [
  // ---------- Common ----------
  {
    tier: 0, code: "C1", name: "Classic Drip",
    pitch: "The shoes you picked: sneakers made of slime with drips hanging off the toes and a little puddle under each foot.",
    make: (s) => ({ px: slimePx(s), over: (c, l, tp, t) => drips(c, l, tp, s, t) }),
  },
  {
    tier: 0, code: "C2", name: "Goo High-Tops",
    pitch: "High-tops that ooze up over the ankles, with slime running down from the cuff.",
    make: (s) => ({
      high: true,
      px: (x, y) => (y <= 24 ? (y === 23 && (x === 6 || x === 9) ? "#e8dff5" : s.a) : slimePx(s)(x, y)),
      over: (c, l, tp, t) => { drips(c, l, tp, s, t); R(c, l + 6, tp + 23, 1, 1, s.hi); R(c, l + 9, tp + 24, 1, 1, s.hi); },
    }),
  },
  {
    tier: 0, code: "C3", name: "Splattered",
    pitch: "Clean white sneakers that stepped in something: splats of slime across the toes and a puddle underneath.",
    make: (s) => ({
      px: (x, y) => (y === 26 ? "#b9b0d9" : at([[4, 25], [6, 25], [10, 25], [11, 25]], x, y) ? s.a : "#f3efe6"),
      over: (c, l, tp) => { R(c, l + 3, tp + 26, 1, 1, s.drip); R(c, l + 12, tp + 26, 1, 1, s.drip); R(c, l + 7, tp + 26, 2, 1, s.drip); },
    }),
  },
  // ---------- Rare ----------
  {
    tier: 1, code: "R1", name: "Eyeball Goo",
    pitch: "Toxic slime sneakers with an eyeball floating in the goo of each shoe, staring up at whoever's across the net.",
    make: () => ({
      px: (x, y) => (at([[5, 25], [10, 25]], x, y) ? "#ffffff" : at([[4, 25], [11, 25]], x, y) ? "#e8dff5" : slimePx(TOXIC)(x, y)),
      over: (c, l, tp, t) => { drips(c, l, tp, TOXIC, t); R(c, l + 5, tp + 25, 1, 1, "#1a1024"); R(c, l + 10, tp + 25, 1, 1, "#1a1024"); R(c, l + 4, tp + 25, 1, 1, "#ff3b4d"); R(c, l + 11, tp + 25, 1, 1, "#ff3b4d"); },
    }),
  },
  {
    tier: 1, code: "R2", name: "Bug in Jelly",
    pitch: "See-through jelly shoes in pale green with a beetle trapped inside each one.",
    make: () => ({
      px: (x, y) => (at([[5, 25], [10, 25]], x, y) ? "#1a1024" : y === 26 ? "#8ad47a" : "#c8f5b8"),
      over: (c, l, tp) => { R(c, l + 6, tp + 25, 1, 1, "#4a3018"); R(c, l + 9, tp + 25, 1, 1, "#4a3018"); },
    }),
  },
  {
    tier: 1, code: "R3", name: "Biohazard",
    pitch: "Black sneakers with a yellow hazard symbol on the side and soles that glow toxic green.",
    make: () => ({
      px: (x, y) => (y === 26 ? "#5ee84a" : x === 5 || x === 10 ? "#ffd84a" : "#231d33"),
      under: (c, l, tp) => glow(c, l + 7, tp + 26, 7, "#5ee84a", 0.3),
      over: (c, l, tp) => { R(c, l + 5, tp + 24, 1, 1, "#ffd84a"); R(c, l + 10, tp + 24, 1, 1, "#ffd84a"); },
    }),
  },
  // ---------- Epic ----------
  {
    tier: 2, code: "E1", name: "Bubbling",
    pitch: "The slime never settles. Bubbles keep rising off both shoes and popping in the air.",
    make: () => ({
      px: slimePx(TOXIC),
      over: (c, l, tp, t) => {
        drips(c, l, tp, TOXIC, t);
        [[5, 0], [10, 0.33], [6, 0.66], [9, 0.15]].forEach(([x, sp]) => {
          const ph = (t * 0.9 + sp) % 1;
          if (ph < 0.85) R(c, l + x, tp + 24 - Math.round(ph * 6), 1, 1, "#b7ff9e");
          else { R(c, l + x - 1, tp + 19, 1, 1, "#b7ff9e"); R(c, l + x + 1, tp + 19, 1, 1, "#b7ff9e"); }
        });
      },
    }),
  },
  {
    tier: 2, code: "E2", name: "Squishy Jelly",
    pitch: "The shoes are made of wobbly jelly. They squish flat and bounce back up with every step, jiggling as they go.",
    make: () => ({
      px: (x, y, z, t) => {
        const squish = Math.floor(t * 4) % 2;
        if (squish && y === 25 && (x === 6 || x === 9)) return null;
        return slimePx(TOXIC)(x, y);
      },
      over: (c, l, tp, t) => {
        const squish = Math.floor(t * 4) % 2;
        if (squish) { R(c, l + 3, tp + 26, 1, 1, TOXIC.a); R(c, l + 12, tp + 26, 1, 1, TOXIC.a); }
        else { R(c, l + 5, tp + 24, 1, 1, TOXIC.hi); R(c, l + 10, tp + 24, 1, 1, TOXIC.hi); }
      },
    }),
  },
  {
    tier: 2, code: "E3", name: "Slime Trail",
    pitch: "You leave a mess everywhere. Glowing slime footprints appear under each step and slowly fade away.",
    make: () => ({
      px: slimePx(TOXIC),
      under: (c, l, tp, t) => {
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.6 + k / 3) % 1;
          c.save(); c.globalAlpha = 0.8 * (1 - ph);
          const x = l + (k % 2 ? 9 : 2) - Math.round(ph * 4) * (k % 2 ? -1 : 1);
          R(c, x, tp + 27, 3, 1, "#5ee84a");
          c.restore();
        }
      },
      over: (c, l, tp, t) => drips(c, l, tp, TOXIC, t),
    }),
  },
  // ---------- Legendary ----------
  {
    tier: 3, code: "L1", name: "Radioactive",
    pitch: "Glowing nuclear sneakers. They pulse brighter and dimmer, rings of green light ripple across the floor, and sparks fly off the toes.",
    make: () => ({
      px: (x, y, z, t) => {
        const p = Math.sin(t * 4) > 0;
        return y === 26 ? "#2f8a3a" : (x + y) % 2 === 0 ? (p ? "#e0ffd8" : "#b7ff9e") : p ? "#7dff5a" : "#5ee84a";
      },
      under: (c, l, tp, t) => {
        glow(c, l + 7, tp + 25, 10, "#5ee84a", 0.4 + 0.15 * Math.sin(t * 4));
        const ph = (t * 0.8) % 1;
        c.save(); c.globalAlpha = 0.7 * (1 - ph);
        const w = Math.round(6 + ph * 14);
        R(c, l + 7.5 - w / 2, tp + 27, w, 1, "#7dff5a");
        c.restore();
      },
      over: (c, l, tp, t) => {
        drips(c, l, tp, { drip: "#b7ff9e", hi: "#e0ffd8" }, t);
        for (let k = 0; k < 2; k++) {
          const ph = (t * 1.3 + k / 2) % 1;
          if (ph < 0.3) sparkle(c, l + (k ? 13 : 2), tp + 23 - Math.round(ph * 6), "#e0ffd8", false);
        }
      },
    }),
  },
  {
    tier: 3, code: "L2", name: "Slime Critters",
    pitch: "Each shoe is a little slime monster. They blink, look around, stick out their tongues, and drool on the floor.",
    make: () => ({
      px: slimePx(TOXIC),
      over: (c, l, tp, t) => {
        const blink = t % 3.2 > 3.0;
        const look = Math.round(Math.sin(t * 1.3));
        for (const [ex, dir] of [[5, -1], [10, 1]]) {
          R(c, l + ex, tp + 24, 1, 1, TOXIC.a); R(c, l + ex + dir, tp + 24, 1, 1, TOXIC.a);
          if (!blink) { R(c, l + ex, tp + 24, 1, 1, "#ffffff"); R(c, l + ex + dir, tp + 24, 1, 1, "#ffffff"); R(c, l + ex + (look === dir ? dir : 0), tp + 24, 1, 1, "#1a1024"); }
          const tongue = Math.floor(t * 2) % 4 === 0;
          R(c, l + (dir < 0 ? 3 : 12), tp + 26, 1, 1, tongue ? "#ff6fb5" : "#1a1024");
        }
        const len = Math.round((Math.sin(t * 2) + 1) / 2);
        R(c, l + 4, tp + 26, 1, 1 + len, "#b7ff9e"); R(c, l + 11, tp + 26, 1, 1 + len, "#b7ff9e");
      },
    }),
  },
  {
    tier: 3, code: "L3", name: "Slime Jets",
    pitch: "Rocket boots powered by toxic goo. Green jets blast out of the soles, you hover a couple of pixels off the floor, and the slime splashes up where it hits.",
    lift: 2,
    make: () => ({
      px: (x, y) => (y === 26 ? "#4a4060" : x === 5 || x === 10 ? "#7dff5a" : "#3a3646"),
      under: (c, l, tp, t) => glow(c, l + 7, tp + 28, 9, "#5ee84a", 0.45 + 0.15 * Math.sin(t * 15)),
      over: (c, l, tp, t) => {
        const COLS = ["#ffffff", "#b7ff9e", "#5ee84a", "#2f8a3a"];
        for (const cx of [5, 10]) {
          for (let k = 0; k < 3; k++) {
            const ph = (t * 4 + k / 3 + cx) % 1;
            R(c, l + cx + Math.round(Math.sin(t * 20 + k) * 0.6), tp + 27 + Math.round(ph * 2), 1, 1, COLS[Math.min(3, Math.floor(ph * 4))]);
          }
        }
        for (let k = 0; k < 4; k++) {
          const ph = (t * 2 + k / 4) % 1;
          c.save(); c.globalAlpha = 1 - ph;
          R(c, l + 7.5 + (k % 2 ? 1 : -1) * (2 + ph * 6), tp + 28 - Math.sin(ph * Math.PI) * 3, 1, 1, "#7dff5a");
          c.restore();
        }
      },
    }),
  },
];

const toe = (x) => x === 4 || x === 11;
const pick = (tier, code) => OPTIONS.find((o) => o.tier === tier && o.code === code);
const asTier = (o) => ({ name: o.name, pitch: o.pitch, item: o.lift ? { ...o.make(TOXIC), lift: o.lift } : o.make(TOXIC) });
[["Slime Kicks", "1"], ["Slime Kicks II", "2"], ["Slime Kicks III", "3"]].forEach(([name, n]) => {
  const c = pick(0, "C" + n);
  addTheme("shoes", {
    name,
    pitch: `Option set ${n} from the Slime Kicks page: ${c.name}, ${pick(1, "R" + n).name}, ${pick(2, "E" + n).name} and ${pick(3, "L" + n).name}.`,
    common: { pitch: c.pitch, colors: SLIMES, make: c.make },
    rare: asTier(pick(1, "R" + n)),
    epic: asTier(pick(2, "E" + n)),
    legendary: asTier(pick(3, "L" + n)),
  });
});
})();
