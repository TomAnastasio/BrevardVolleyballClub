import { useId } from "react";

// Original medal artwork (not Riot's), source SVGs in src/assets/badge-*.svg.
// Gradient/pattern ids are scoped with useId() since many badges of the
// same tier render on one leaderboard page — unscoped ids would collide.

function BronzeBadge({ size, className }) {
  const uid = useId();
  const face = `bronze-face-${uid}`;
  const ring = `bronze-ring-${uid}`;
  return (
    <svg viewBox="0 0 200 220" width={size} height={(size * 220) / 200} role="img" aria-label="Bronze rank" className={className}>
      <defs>
        <radialGradient id={face} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e3b083" />
          <stop offset="55%" stopColor="#b9713f" />
          <stop offset="100%" stopColor="#814e28" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a06434" />
          <stop offset="100%" stopColor="#5c3217" />
        </linearGradient>
      </defs>

      <path d="M82 150 L70 200 L100 182 L130 200 L118 150 Z" fill="#6b3a22" />
      <circle cx="100" cy="95" r="68" fill={`url(#${ring})`} />
      <circle cx="100" cy="95" r="56" fill={`url(#${face})`} stroke="#5c3217" strokeWidth="3" />

      <g transform="translate(100,94)">
        <circle r="27" fill="#5c3217" opacity="0.9" />
        <g fill="none" stroke="#e8c39a" strokeWidth="4.5" strokeLinecap="round">
          <path d="M0,-24 Q14,0 0,20 Q-14,0 0,-24 Z" />
          <path d="M0,-24 Q14,0 0,20 Q-14,0 0,-24 Z" transform="rotate(120)" />
          <path d="M0,-24 Q14,0 0,20 Q-14,0 0,-24 Z" transform="rotate(240)" />
        </g>
      </g>
    </svg>
  );
}

function GoldBadge({ size, className }) {
  const uid = useId();
  const face = `gold-face-${uid}`;
  const ring = `gold-ring-${uid}`;
  const leaf = `gold-leaf-${uid}`;
  return (
    <svg viewBox="0 0 200 220" width={size} height={(size * 220) / 200} role="img" aria-label="Gold rank" className={className}>
      <defs>
        <radialGradient id={face} cx="35%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#f3c23d" />
          <stop offset="100%" stopColor="#b9821a" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="50%" stopColor="#caa23c" />
          <stop offset="100%" stopColor="#8a6416" />
        </linearGradient>
        <g id={leaf}>
          <path d="M0 0 q-12 8 -8 22 q7 3 12 -4 q2 9 12 10 q-4 -11 2 -18 q-10 2 -18 -10 Z" fill="#d9ad45" />
        </g>
      </defs>

      <path d="M80 152 L67 202 L100 183 L133 202 L120 152 Z" fill="#1f6fb2" />
      <circle cx="100" cy="96" r="76" fill={`url(#${ring})`} />
      <circle cx="100" cy="96" r="62" fill={`url(#${face})`} stroke="#8a6416" strokeWidth="3" />

      <g opacity="0.95">
        <use href={`#${leaf}`} x="18" y="70" />
        <use href={`#${leaf}`} x="10" y="92" />
        <use href={`#${leaf}`} x="14" y="114" />
      </g>
      <g opacity="0.95" transform="translate(200,0) scale(-1,1)">
        <use href={`#${leaf}`} x="18" y="70" />
        <use href={`#${leaf}`} x="10" y="92" />
        <use href={`#${leaf}`} x="14" y="114" />
      </g>

      <g transform="translate(100,95)">
        <circle r="31" fill="#b9821a" />
        <g fill="none" stroke="#fff3c4" strokeWidth="5" strokeLinecap="round">
          <path d="M0,-27 Q16,0 0,23 Q-16,0 0,-27 Z" />
          <path d="M0,-27 Q16,0 0,23 Q-16,0 0,-27 Z" transform="rotate(120)" />
          <path d="M0,-27 Q16,0 0,23 Q-16,0 0,-27 Z" transform="rotate(240)" />
        </g>
      </g>
    </svg>
  );
}

function PlatinumBadge({ size, className }) {
  const uid = useId();
  const face = `plat-face-${uid}`;
  const ring = `plat-ring-${uid}`;
  const wingL = `plat-wing-l-${uid}`;
  const wingR = `plat-wing-r-${uid}`;
  const leaf = `plat-leaf-${uid}`;
  const sparkle = `plat-sparkle-${uid}`;
  return (
    <svg viewBox="0 0 220 240" width={size} height={(size * 240) / 220} role="img" aria-label="Platinum rank" className={className}>
      <defs>
        <radialGradient id={face} cx="35%" cy="24%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#d3edf9" />
          <stop offset="70%" stopColor="#86bdd8" />
          <stop offset="100%" stopColor="#3f6f8c" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3fbff" />
          <stop offset="50%" stopColor="#a9d8ec" />
          <stop offset="100%" stopColor="#4c7f9e" />
        </linearGradient>
        <linearGradient id={wingL} x1="1" y1="0" x2="0" y2="0.3">
          <stop offset="0%" stopColor="#eaf6ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9fd1ea" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={wingR} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#eaf6ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9fd1ea" stopOpacity="0.1" />
        </linearGradient>
        <g id={leaf}>
          <path d="M0 0 q-14 9 -9 25 q8 3 14 -5 q2 10 14 11 q-5 -13 2 -21 q-11 2 -21 -10 Z" fill="#bfe0f0" />
        </g>
        <g id={sparkle}>
          <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill="#f3fbff" />
        </g>
      </defs>

      <path d="M118 108 C78 84 34 92 12 72 C32 114 66 126 108 122 Z" fill={`url(#${wingL})`} />
      <path d="M102 108 C142 84 186 92 208 72 C188 114 154 126 112 122 Z" fill={`url(#${wingR})`} />

      <path d="M86 168 L71 224 L110 203 L149 224 L134 168 Z" fill="#2b4a63" />

      <circle cx="110" cy="108" r="92" fill={`url(#${ring})`} />
      <circle cx="110" cy="108" r="92" fill="none" stroke="#f3fbff" strokeWidth="2" opacity="0.65" />
      <circle cx="110" cy="108" r="74" fill={`url(#${face})`} stroke="#4c7f9e" strokeWidth="3" />

      <g opacity="0.95">
        <use href={`#${leaf}`} x="22" y="78" />
        <use href={`#${leaf}`} x="12" y="104" />
        <use href={`#${leaf}`} x="16" y="130" />
        <use href={`#${leaf}`} x="28" y="152" />
      </g>
      <g opacity="0.95" transform="translate(220,0) scale(-1,1)">
        <use href={`#${leaf}`} x="22" y="78" />
        <use href={`#${leaf}`} x="12" y="104" />
        <use href={`#${leaf}`} x="16" y="130" />
        <use href={`#${leaf}`} x="28" y="152" />
      </g>

      <g transform="translate(110,104)">
        <circle r="34" fill="#eaf6ff" />
        <g fill="none" stroke="#4c7f9e" strokeWidth="5.5" strokeLinecap="round">
          <path d="M0,-29 Q17,0 0,25 Q-17,0 0,-29 Z" />
          <path d="M0,-29 Q17,0 0,25 Q-17,0 0,-29 Z" transform="rotate(120)" />
          <path d="M0,-29 Q17,0 0,25 Q-17,0 0,-29 Z" transform="rotate(240)" />
        </g>
      </g>

      <use href={`#${sparkle}`} x="42" y="46" />
      <use href={`#${sparkle}`} x="178" y="58" transform="scale(0.8)" />
      <use href={`#${sparkle}`} x="172" y="162" transform="scale(0.7)" />
      <use href={`#${sparkle}`} x="36" y="168" transform="scale(0.6)" />
    </svg>
  );
}

const BADGES = {
  bronze: BronzeBadge,
  gold: GoldBadge,
  platinum: PlatinumBadge,
};

export default function RankBadge({ tier, size = 40, className = "" }) {
  const Badge = BADGES[tier];
  if (!Badge) return null;
  return <Badge size={size} className={className} />;
}
