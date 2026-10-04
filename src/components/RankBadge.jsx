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
import lastplaceArt from "../assets/badges/lastplace.svg";

// Badge artwork (not Riot's), one PNG per tier/division. Bronze, Gold, and
// Diamond divisions mark a player's bottom-30%/middle-40%/top-30% position
// within their tier; top3 is reserved for the literal #1/#2/#3 ranked
// players; lastplace is the single lowest-Elo ranked player and has no
// division. See useLeaderboard.js for the percentile math.
const BADGES = {
  bronze: { 1: bronze1, 2: bronze2, 3: bronze3 },
  gold: { 1: gold1, 2: gold2, 3: gold3 },
  diamond: { 1: diamond1, 2: diamond2, 3: diamond3 },
  top3: { 1: top3_1, 2: top3_2, 3: top3_3 },
  lastplace: { 1: lastplaceArt, 2: lastplaceArt, 3: lastplaceArt },
};

const LABELS = {
  bronze: "Bronze",
  gold: "Gold",
  diamond: "Diamond",
  top3: "Top 3",
  lastplace: "Last Place",
};

// Bronze/Gold/Diamond art is a tall 200x280 diamond; top3 and lastplace art
// are square.
const ASPECT = {
  bronze: 280 / 200,
  gold: 280 / 200,
  diamond: 280 / 200,
  top3: 1,
  lastplace: 1,
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

  const alt = tier === "lastplace" ? "Last place" : `${LABELS[tier]} rank, division ${division}`;
  const height = size * ASPECT[tier];

  // The literal #1/#2/#3 players get a shimmer sweep + faint glow (CSS only,
  // same PNG) so the top of the leaderboard reads as a bigger deal. The
  // sweep is masked to this badge's own art via --rank-badge-mask so the
  // light only plays across the actual emblem, not its transparent margin.
  // lastplace gets the same sweep treatment (platinum glow instead of a
  // division color) so it doesn't read as a lesser, unfinished badge.
  if (tier === "top3" || tier === "lastplace") {
    return (
      <span
        className={`relative inline-block rank-badge-${tier} ${className}`}
        data-division={division}
        style={{ width: size, height, "--rank-badge-mask": `url(${src})` }}
      >
        <img src={src} alt={alt} width={size} height={height} />
      </span>
    );
  }

  return <img src={src} alt={alt} width={size} height={height} className={className} />;
}
