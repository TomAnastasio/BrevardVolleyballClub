// Display name for each rank badge. Bronze/Gold/Diamond read as the tier
// plus a Roman-numeral division (division 3 = top of the tier, most pips).
// The top3 crests are named per place — division 3 is #1 (gold wings),
// 2 is #2 (violet), 1 is #3 (green) — and last place is "Platinum" (the
// platinum stink badge; owner's call, it's a joke).
const NUMERALS = { 1: "I", 2: "II", 3: "III" };
const TIER_NAMES = { bronze: "Bronze", gold: "Gold", diamond: "Diamond" };
const TOP3_NAMES = { 1: "Emerald", 2: "Amethyst", 3: "Champion" };

export function rankTitle(tier, division = 3) {
  if (tier === "unranked") return "Unranked";
  if (tier === "lastplace") return "Platinum";
  if (tier === "top3") return TOP3_NAMES[division] ?? null;
  if (!TIER_NAMES[tier] || !NUMERALS[division]) return null;
  return `${TIER_NAMES[tier]} ${NUMERALS[division]}`;
}
