// Builds the item catalog (every pullable item, with the permanent key the
// database and the app's art both use) from the design data.
// usage: node catalog.mjs > catalog.json
import fs from "fs";
import vm from "vm";

const here = new URL(".", import.meta.url).pathname;
const read = (f) => fs.readFileSync(here + f, "utf8");
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Load the drawing code with just enough browser stubbed in to define items.
const ctx = vm.createContext({ matchMedia: () => ({ matches: false }), Math, console });
vm.runInContext(
  [read("engine.js"), read("xcore.js"), ...["head", "shirt", "pants", "shoes", "shoes-slime", "xe1", "xe2", "xl1", "xl2"].map((f) => read(`data/${f}.js`)),
    "this.THEMES = THEMES; this.SKINS2 = SKINS2;"].join("\n;\n"),
  ctx,
);
const { THEMES, SKINS2 } = ctx;

// Same numbering and cuts as the review pages (boot.js / xpage.js).
const CUT = new Set([161, 162, 163, 164, 177, 178, 179, 180, 209, 210, 211, 212, 249, 250, 251, 252, 370]);
const TIERS = ["common", "rare", "epic", "legendary"];
const items = [];
const add = (key, slot, tier, name, extra = {}) => items.push({ key, slot, tier, name, halloween: true, ...extra });

// Sets picked earlier on pages 03, 05, 07, 09 (see PLAN.md).
const PICKED = [
  { slot: "head", theme: "Witch Hat", page: "03", commons: { Ringed: ["Midnight", "Witch purple", "Swamp green", "Pumpkin", "Moonlit blue", "Blood red"] },
    rare: ["Candy Corn"], epic: ["Jack-o'-Lantern Band", "Bat Perch"], legendary: ["Ghostfire", "Living Hat"] },
  { slot: "head", theme: "Pumpkin Helmet", page: "05",
    commons: { "Classic Carve": ["Orange", "Ghost white", "Gourd green", "Blue heirloom", "Cinderella red", "Rotten"], "Grumpy Carve": ["Orange", "Ghost white", "Gourd green", "Blue heirloom", "Cinderella red", "Rotten"] },
    rare: ["Pumpkin King"], epic: ["Chomper"], legendary: ["Headless Horseman", "Possessed"] },
  { slot: "shirt", theme: "Skeleton Tee", page: "07", commons: { "Classic Ribcage": ["Black", "Charcoal", "Witch purple", "Blood red", "Swamp green", "Midnight blue"] },
    rare: ["Glow Bones"], epic: ["Beating Heart"], legendary: ["Lich Armor", "Ectoplasm", "Rave Bones"] },
  { slot: "pants", theme: "Witch Stockings", page: "09", commons: { "Classic Stripes": ["Witch purple", "Pumpkin", "Slime", "Blood", "Bone", "Candy"] },
    rare: ["Mismatched"], epic: ["Marquee Stripes", "Potion Belt"], legendary: ["Bubbling Brew", "Flame Stockings"] },
];
for (const p of PICKED) {
  const base = `${p.slot}/${slug(p.theme)}`;
  for (const [design, colors] of Object.entries(p.commons))
    for (const c of colors) add(`${base}/common/${slug(design)}-${slug(c)}`, p.slot, "common", `${p.theme}: ${design} (${c.toLowerCase()})`, { page: p.page });
  for (const tier of ["rare", "epic", "legendary"])
    for (const n of p[tier]) add(`${base}/${tier}/${slug(n)}`, p.slot, tier, n, { page: p.page });
}

// The wardrobe batch (page 13).
let num = 101;
for (const slot of ["head", "shirt", "pants", "shoes"]) {
  for (const th of THEMES[slot]) {
    for (const tier of TIERS) {
      const d = th[tier];
      if (!d) continue;
      const n = num++;
      if (CUT.has(n)) continue;
      const base = `${slot}/${slug(th.name)}/${tier}`;
      if (tier === "common") for (const c of d.colors) add(`${base}/${slug(c.name)}`, slot, tier, `${th.name} (${c.name.toLowerCase()})`, { card: n });
      else add(`${base}/${slug(d.name)}`, slot, tier, d.name, { card: n });
    }
  }
}

// Monsters (page 14): Legendary from 301, then Epic.
let xnum = 301;
for (const tier of ["legendary", "epic"]) for (const s of SKINS2[tier]) {
  const n = xnum++;
  if (CUT.has(n)) continue;
  add(`transformation/${tier}/${slug(s.name)}`, "transformation", tier, s.name, { card: n });
}

const keys = new Set();
for (const it of items) { if (keys.has(it.key)) throw new Error("duplicate key " + it.key); keys.add(it.key); }
process.stdout.write(JSON.stringify(items, null, 1) + "\n");
