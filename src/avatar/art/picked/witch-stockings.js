// Ported from design/gacha/pages/09-witch-stockings-tiers.html (branch claude/gacha-avatars-design).
import { R, glow, darken } from "../kit.js";

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- Witch Stockings, parameterised ----------
// A short skirt (rows 15-17, flaring at 17-18) over stockings that run from row 18 into the shoes.
const SCHEMES = [
  { name: "Witch purple", a: "#6b3fa8", b: "#14101c", skirt: "#231d33" },
  { name: "Pumpkin", a: "#ff7a1a", b: "#14101c", skirt: "#231d33" },
  { name: "Slime", a: "#5ee84a", b: "#14101c", skirt: "#231d33" },
  { name: "Blood", a: "#c42a3e", b: "#14101c", skirt: "#231d33" },
  { name: "Bone", a: "#ece6d6", b: "#14101c", skirt: "#231d33" },
  { name: "Candy", a: "#ff7a1a", b: "#6b3fa8", skirt: "#3d2470" },
];
// base skirt hem, drawn over the hips
function skirt(c, left, top, col, hem = "flat") {
  R(c, left + 4, top + 17, 8, 1, darken(col, 0.75));
  if (hem === "flat") { R(c, left + 4, top + 18, 1, 1, darken(col, 0.75)); R(c, left + 11, top + 18, 1, 1, darken(col, 0.75)); }
  if (hem === "jagged") [4, 7, 8, 11].forEach((x) => R(c, left + x, top + 18, 1, 1, darken(col, 0.75)));
}
function witch(o) {
  const item = {
    long: true, socks: true,
    px(x, y, z, t) {
      if (y <= 17) return o.skirtPx ? o.skirtPx(x, y, z, t) : z === "P" || x === 10 ? darken(o.skirt, 0.75) : o.skirt;
      return o.leg(x, y, z, t);
    },
    over(c, left, top, t) { skirt(c, left, top, o.skirt, o.hem); if (o.over) o.over(c, left, top, t); },
  };
  if (o.under) item.under = o.under;
  return item;
}

// C1 Classic Stripes
const classicStripes = (s) => witch({ skirt: s.skirt, leg: (x, y) => (y % 2 ? s.a : s.b) });

// R2 Mismatched
const mismatched = witch({
  skirt: "#2a2433",
  skirtPx: (x, y) => (x >= 8 && x <= 9 && y >= 15 && y <= 16 ? "#5a8a3a" : x === 10 ? "#1a1622" : "#2a2433"),
  leg: (x, y) => (x <= 6 ? (y % 2 ? "#6b3fa8" : "#14101c") : y % 2 ? "#ff7a1a" : "#3f6b3a"),
});

// E1 Marquee Stripes
const marquee = witch({
  skirt: "#231d33",
  leg: (x, y, z, t) => (Math.floor(y / 2 + t * 4) % 2 ? "#d18bff" : "#2a1a4a"),
  under: (c, left, top, t) => glow(c, left + 7, top + 21, 9, "#c46bff", 0.25 + 0.08 * Math.sin(t * 4)),
});

// E3 Potion Belt
const potionBelt = witch({
  skirt: "#231d33",
  leg: (x, y) => (y % 2 ? "#6b3fa8" : "#14101c"),
  over: (c, left, top, t) => {
    R(c, left + 4, top + 15, 8, 1, "#6b4a28");
    [[4, "#5ee84a"], [7, "#c46bff"], [10, "#ff7a1a"]].forEach(([x, col], i) => {
      R(c, left + x, top + 14, 1, 1, "#d8d0ec");
      R(c, left + x, top + 15, 1, 2, col);
      const ph = (t * 1.2 + i * 0.33) % 1;
      if (ph < 0.5) R(c, left + x, top + 13 - Math.round(ph * 4), 1, 1, col);
    });
  },
});

// L2 Bubbling Brew
const bubblingBrew = witch({
  skirt: "#241d33",
  skirtPx: (x, y, z, t) => (y === 15 ? (Math.sin(t * 6 + x) > 0.3 ? "#b7ff9e" : "#5ee84a") : x === 10 ? "#1a1622" : "#2f2742"),
  leg: (x, y, z, t) => {
    const f = Math.sin(y * 1.1 - t * 8 + x);
    return f > 0.6 ? "#b7ff9e" : f > -0.3 ? "#5ee84a" : "#2f8a3a";
  },
  under: (c, left, top, t) => glow(c, left + 7, top + 18, 12, "#5ee84a", 0.3 + 0.1 * Math.sin(t * 5)),
  over: (c, left, top, t) => {
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.9 + k / 4) % 1;
      c.save(); c.globalAlpha = 1 - ph;
      R(c, left + 5 + k * 2 + Math.round(Math.sin(t * 3 + k)), top + 14 - ph * 7, 1, 1, ph < 0.3 ? "#b7ff9e" : "#a99bc9");
      c.restore();
    }
  },
});

// L3 Flame Stockings
const flameStockings = witch({
  skirt: "#2a1410",
  leg: (x, y, z, t) => {
    const f = Math.sin(y * 1.3 + t * 9 + x * 0.8);
    return f > 0.7 ? "#fff3a0" : f > 0.1 ? "#ffd84a" : f > -0.5 ? "#ff7a1a" : "#8f2a0a";
  },
  under: (c, left, top, t) => glow(c, left + 7, top + 21, 12, "#ff7a1a", 0.3 + 0.12 * Math.sin(t * 11)),
  over: (c, left, top, t) => {
    [4, 6, 9, 11].forEach((x, i) => R(c, left + x, top + 17, 1, 1, Math.sin(t * 10 + i) > 0 ? "#ff7a1a" : "#c4300a"));
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.7 + k / 4) % 1;
      c.save(); c.globalAlpha = 1 - ph;
      R(c, left + 4 + k * 2 + Math.round(Math.sin(t * 2 + k) * 2), top + 22 - ph * 14, 1, 1, "#ffd84a");
      c.restore();
    }
  },
});

export default {
  ...Object.fromEntries(SCHEMES.map((s) => [`pants/witch-stockings/common/classic-stripes-${slug(s.name)}`, classicStripes(s)])),
  "pants/witch-stockings/rare/mismatched": mismatched,
  "pants/witch-stockings/epic/marquee-stripes": marquee,
  "pants/witch-stockings/epic/potion-belt": potionBelt,
  "pants/witch-stockings/legendary/bubbling-brew": bubblingBrew,
  "pants/witch-stockings/legendary/flame-stockings": flameStockings,
};
