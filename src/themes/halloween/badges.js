// Halloween stand-ins for every rank badge, used by RankBadge.jsx only while
// the Halloween theme is on. The classic art in src/assets/badges/ is never
// changed. Same shapes as the classic files: tiers are tall (5:7), top3 and
// last place square, so rows don't shift.
import bronze1 from "./badges/bronze-1.svg";
import bronze2 from "./badges/bronze-2.svg";
import bronze3 from "./badges/bronze-3.svg";
import gold1 from "./badges/gold-1.svg";
import gold2 from "./badges/gold-2.svg";
import gold3 from "./badges/gold-3.svg";
import diamond1 from "./badges/diamond-1.svg";
import diamond2 from "./badges/diamond-2.svg";
import diamond3 from "./badges/diamond-3.svg";
import top3_1 from "./badges/top3-1.svg";
import top3_2 from "./badges/top3-2.svg";
import top3_3 from "./badges/top3-3.svg";
import lastplace from "./badges/lastplace.svg";
import unranked from "./badges/unranked.svg";

// Pumpkins (Bronze), ghosts (Gold), skulls (Diamond); Frankenstein (#3),
// Witch (#2) and Vampire king (#1); a haunted RIP tombstone with a zombie
// hand for last place; a plain tombstone for unranked.
export const HALLOWEEN_BADGES = {
  bronze: { 1: bronze1, 2: bronze2, 3: bronze3 },
  gold: { 1: gold1, 2: gold2, 3: gold3 },
  diamond: { 1: diamond1, 2: diamond2, 3: diamond3 },
  top3: { 1: top3_1, 2: top3_2, 3: top3_3 },
  lastplace: { 1: lastplace, 2: lastplace, 3: lastplace },
};
export const HALLOWEEN_UNRANKED = unranked;
