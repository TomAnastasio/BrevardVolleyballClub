// Every item's art, by the permanent key the database uses
// (cosmetic_items.key). The keys are worked out exactly the way the design
// branch's catalog.mjs made them for the migration: the wardrobe cards were
// numbered from 101 and the monsters from 301 in page order, and the cut
// numbers were skipped. So the order of the imports below, and of the
// themes inside each file, must never change.
//
// This module is big, so the app loads it on demand (see ../itemArt.js).
import { THEMES, SKINS2 } from "./kit.js";
import "./data/head.js";
import "./data/shirt.js";
import "./data/pants.js";
import "./data/shoes.js";
import "./data/shoes-slime.js";
import "./data/xe1.js";
import "./data/xe2.js";
import "./data/xl1.js";
import "./data/xl2.js";
import witchHat from "./picked/witch-hat.js";
import pumpkinHelmet from "./picked/pumpkin-helmet.js";
import skeletonTee from "./picked/skeleton-tee.js";
import witchStockings from "./picked/witch-stockings.js";

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const TIERS = ["common", "rare", "epic", "legendary"];
// Cards the owner cut from pages 13 and 14 (2026-10-24).
const CUT = new Set([161, 162, 163, 164, 177, 178, 179, 180, 209, 210, 211, 212, 249, 250, 251, 252, 370]);

// key -> { key, slot, tier, item }. `item` is what drawAvatar takes for that
// slot (a transformation's item is the whole-body monster).
export const ART = new Map();
const add = (key, slot, tier, item) => ART.set(key, { key, slot, tier, item });

// The first four sets (pages 03, 05, 07, 09) were ported by hand.
for (const set of [witchHat, pumpkinHelmet, skeletonTee, witchStockings])
  for (const [key, item] of Object.entries(set)) {
    const [slot, , tier] = key.split("/");
    add(key, slot, tier, item);
  }

// The wardrobe batch (page 13).
let num = 101;
for (const slot of ["head", "shirt", "pants", "shoes"])
  for (const th of THEMES[slot])
    for (const tier of TIERS) {
      const d = th[tier];
      if (!d) continue;
      if (CUT.has(num++)) continue;
      const base = `${slot}/${slug(th.name)}/${tier}`;
      if (tier === "common") for (const c of d.colors) add(`${base}/${slug(c.name)}`, slot, tier, d.make(c));
      else add(`${base}/${slug(d.name)}`, slot, tier, d.item);
    }

// Monsters (page 14): Legendary from 301, then Epic.
let xnum = 301;
for (const tier of ["legendary", "epic"])
  for (const s of SKINS2[tier]) {
    if (CUT.has(xnum++)) continue;
    add(`transformation/${tier}/${slug(s.name)}`, "transformation", tier, s);
  }
