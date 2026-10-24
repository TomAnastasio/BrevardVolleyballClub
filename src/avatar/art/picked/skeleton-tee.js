// Ported from design/gacha/pages/07-skeleton-tee-tiers.html (branch claude/gacha-avatars-design).
import { R, spr, glow, sparkle, darken, at } from "../kit.js";

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- Skeleton Tee, parameterised ----------
const BONE = "#ece6d6";
const isSpine = (x, y) => x === 7 && y >= 9;
const isRib = (x, y) => (y === 9 || y === 11 || y === 13) && x >= 4 && x <= 10 && x !== 7 && !(y === 13 && (x < 5 || x > 9));
const isCage = (x, y) => isSpine(x, y) || isRib(x, y);
const isArmBone = (x, y) => ((x === 3 || x === 12) && y >= 10 && y <= 13) || ((x === 2 || x === 13) && y === 9);

const TEES = [
  { name: "Black", base: "#231d33", sh: "#16121f" },
  { name: "Charcoal", base: "#3a3646", sh: "#28252f" },
  { name: "Witch purple", base: "#4a2f7a", sh: "#33205a" },
  { name: "Blood red", base: "#7a1422", sh: "#520c17" },
  { name: "Swamp green", base: "#2f4a2a", sh: "#1f331c" },
  { name: "Midnight blue", base: "#1c2a5c", sh: "#121c40" },
];
const BLACK = TEES[0];
const teeCol = (tee, z) => (z === "T" || z === "l" ? tee.sh : tee.base);

// C1 Classic Ribcage
const ribcage = (tee) => ({ sleeve: "short", px: (x, y, z) => (z !== "u" && isCage(x, y) ? BONE : teeCol(tee, z)) });

// R1 Glow Bones
const glowBones = {
  sleeve: "short", px: (x, y, z) => (z !== "u" && isCage(x, y) ? "#7dff5a" : teeCol(BLACK, z)),
  under: (c, left, top) => glow(c, left + 7, top + 11, 9, "#5ee84a", 0.35),
};

// E1 Beating Heart
const beating = (t) => { const ph = t % 1.1; return ph < 0.12 || (ph > 0.24 && ph < 0.36); };
const beatingHeart = {
  sleeve: "short",
  px: (x, y, z, t) => {
    if (z === "u") return teeCol(BLACK, z);
    const beat = beating(t);
    const heart = beat ? [[7, 10], [8, 10], [9, 10], [10, 10], [7, 11], [8, 11], [9, 11], [10, 11], [8, 12], [9, 12]] : [[8, 10], [9, 10], [8, 11], [9, 11]];
    if (at(heart, x, y)) return beat ? "#ff3b4d" : "#c42a3e";
    return isCage(x, y) ? BONE : teeCol(BLACK, z);
  },
  under: (c, left, top, t) => {
    const beat = beating(t);
    glow(c, left + 8, top + 11, beat ? 10 : 6, "#ff3b4d", beat ? 0.5 : 0.15);
  },
};

// L1 Lich Armor
const lichArmor = {
  sleeve: "long",
  px: (x, y, z, t) => {
    const tee = TEES[2];
    if (z === "u" || z === "l") return isArmBone(x, y) ? "#e8c45a" : teeCol(tee, z);
    if (isCage(x, y)) return x === 7 ? "#fff1b0" : "#e8c45a";
    if (y >= 10 && y <= 12 && x >= 5 && x <= 9) {
      const f = Math.sin(t * 9 + x * 1.7 + y * 2.3);
      if (f > 0.2) return f > 0.8 ? "#f0d8ff" : "#c46bff";
    }
    return teeCol(tee, z);
  },
  under: (c, left, top, t) => glow(c, left + 7, top + 10, 14, "#c46bff", 0.35 + 0.1 * Math.sin(t * 5)),
  over: (c, left, top, t) => {
    for (const sx of [1, 11]) spr(c, [".bbb.", "bkbkb", ".bbb."], { b: "#e8c45a", k: "#3a1f66" }, left + sx, top + 7);
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.8 + k / 4) % 1;
      c.save(); c.globalAlpha = 1 - ph;
      R(c, left + 5 + k + Math.round(Math.sin(t * 4 + k) * ph * 2), top + 7 - ph * 8, 1, 1, k % 2 ? "#c46bff" : "#f0d8ff");
      c.restore();
    }
  },
};

// L2 Ectoplasm
const ectoplasm = {
  sleeve: "short",
  px: (x, y, z, t) => {
    if (z !== "u" && isCage(x, y)) return Math.sin(t * 3 + y) > 0.5 ? "#ffffff" : "#e0ffd8";
    const f = Math.sin(t * 2.5 + x * 0.9 + y * 0.6);
    const col = f > 0.6 ? "#5ee84a" : f > -0.2 ? "#3fb02f" : "#2f8a3a";
    return z === "T" ? darken(col, 0.8) : col;
  },
  under: (c, left, top, t) => glow(c, left + 7, top + 12, 14, "#5ee84a", 0.35 + 0.1 * Math.sin(t * 3)),
  over: (c, left, top, t) => {
    for (const [dx, sp] of [[5, 0], [7, 0.37], [9, 0.71], [10, 0.2]]) {
      const ph = (t * 0.7 + sp) % 1;
      const y = ph < 0.5 ? 15 + Math.round(ph * 2) : 16 + Math.round((ph - 0.5) * 2 * 12);
      c.save(); c.globalAlpha = ph < 0.5 ? 1 : 1 - (ph - 0.5) * 2;
      R(c, left + dx, top + 15, 1, 1, "#3fb02f");
      R(c, left + dx, top + y, 1, ph < 0.5 ? 1 : 2, "#7dff5a");
      c.restore();
    }
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.5 + k / 2) % 1, sx = k ? 12 : 2;
      c.save(); c.globalAlpha = 0.8 * (1 - ph);
      R(c, left + sx + Math.round(Math.sin(t * 3 + k) * 1.5), top + 8 - ph * 10, 1, 2, "#b7ff9e");
      c.restore();
    }
  },
};

// L3 Rave Bones
const raveBones = {
  sleeve: "long",
  px: (x, y, z, t) => {
    const bone = z === "u" || z === "l" ? isArmBone(x, y) : isCage(x, y);
    if (!bone) return teeCol(BLACK, z);
    const hue = Math.round((t * 120 + y * 25 + Math.abs(x - 7) * 30) % 360);
    return `hsl(${hue} 100% 65%)`;
  },
  under: (c, left, top, t) => glow(c, left + 7, top + 11, 14, `hsl(${Math.round((t * 120) % 360)} 100% 60%)`, 0.35),
  over: (c, left, top, t) => {
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.1 + k / 3) % 1;
      if (ph < 0.3) sparkle(c, left + [1, 13, 7][k], top + [9, 12, 16][k], `hsl(${(k * 120 + t * 200) % 360} 100% 75%)`, ph < 0.15);
    }
  },
};

export default {
  ...Object.fromEntries(TEES.map((tee) => [`shirt/skeleton-tee/common/classic-ribcage-${slug(tee.name)}`, ribcage(tee)])),
  "shirt/skeleton-tee/rare/glow-bones": glowBones,
  "shirt/skeleton-tee/epic/beating-heart": beatingHeart,
  "shirt/skeleton-tee/legendary/lich-armor": lichArmor,
  "shirt/skeleton-tee/legendary/ectoplasm": ectoplasm,
  "shirt/skeleton-tee/legendary/rave-bones": raveBones,
};
