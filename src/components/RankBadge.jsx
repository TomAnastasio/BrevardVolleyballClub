import bronze1 from "../assets/badges/bronze-1.png";
import bronze2 from "../assets/badges/bronze-2.png";
import bronze3 from "../assets/badges/bronze-3.png";
import gold1 from "../assets/badges/gold-1.png";
import gold2 from "../assets/badges/gold-2.png";
import gold3 from "../assets/badges/gold-3.png";
import diamond1 from "../assets/badges/diamond-1.png";
import diamond2 from "../assets/badges/diamond-2.png";
import diamond3 from "../assets/badges/diamond-3.png";
import top3_1 from "../assets/badges/top3-1.png";
import top3_2 from "../assets/badges/top3-2.png";
import top3_3 from "../assets/badges/top3-3.png";

// Badge artwork (not Riot's) at 200x280, one PNG per tier/division. Bronze,
// Gold, and Diamond divisions mark a player's bottom-30%/middle-40%/top-30%
// position within their tier; top3 is reserved for the literal #1/#2/#3
// ranked players. See useLeaderboard.js for the percentile math.
const BADGES = {
  bronze: { 1: bronze1, 2: bronze2, 3: bronze3 },
  gold: { 1: gold1, 2: gold2, 3: gold3 },
  diamond: { 1: diamond1, 2: diamond2, 3: diamond3 },
  top3: { 1: top3_1, 2: top3_2, 3: top3_3 },
};

const LABELS = {
  bronze: "Bronze",
  gold: "Gold",
  diamond: "Diamond",
  top3: "Top 3",
};

function UnrankedBadge({ size, className }) {
  return (
    <svg
      viewBox="0 0 200 280"
      width={size}
      height={(size * 280) / 200}
      role="img"
      aria-label="Unranked"
      className={className}
    >
      <path
        d="M100 50 L160 110 L100 170 L40 110 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path
        d="M100 90 L124 110 L100 130 L76 110 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RankBadge({ tier, division = 3, size = 40, className = "" }) {
  if (tier === "unranked") return <UnrankedBadge size={size} className={className} />;

  const src = BADGES[tier]?.[division];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`${LABELS[tier]} rank, division ${division}`}
      width={size}
      height={(size * 280) / 200}
      className={className}
    />
  );
}
