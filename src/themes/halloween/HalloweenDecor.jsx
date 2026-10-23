// Halloween night behind every screen: moon, stars, bats, a ghost and a
// graveyard with pumpkins. Pure decoration (aria-hidden, no pointer events),
// fixed behind the app; styled and animated in halloween.css.

const SPRITES = {
  bat: ["x...........x", "xx..x...x..xx", "xxx.xxxxx.xxx", "xxxxxrxrxxxxx", "....xxxxx....", "......x......"],
  ghost: [
    "...wwwwww...",
    "..wwwwwwww..",
    ".wwwwwwwwww.",
    ".wwkkwwkkww.",
    "wwwkkwwkkwww",
    "wwwwwwwwwwww",
    "wwwwwkkwwwww",
    "wwwwwkkwwwww",
    "wwwwwwwwwwww",
    "wwwwwwwwwwww",
    "wwwwwwwwwwww",
    "ww.www.www.w",
    "w...w...w...",
  ],
  pumpkin: [
    "......g......",
    "...oodgdoo...",
    ".oooodoodoooo",
    "oooooodoooooo",
    "ooyyooodooyyo",
    "ooyyooodooyyo",
    "oooooyyyooooo",
    "ooyyoooooyyoo",
    "oooyyyyyyyooo",
    ".ooooodoooo..",
    "..ooooooooo..",
  ],
};
const COLORS = { x: "#05020a", r: "#ff3b4d", w: "#f6f0ff", k: "#07040f", o: "#ff7a1a", d: "#b8420a", g: "#1f8a3b", y: "#ffe14d" };

function PixelSprite({ rows, scale, className }) {
  const width = Math.max(...rows.map((r) => r.length));
  const rects = [];
  rows.forEach((row, y) => {
    // One rect per run of same-colored pixels keeps the SVG small.
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (COLORS[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={COLORS[ch]} />);
      x = end;
    }
  });
  return (
    <svg
      className={className}
      width={width * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
    >
      {rects}
    </svg>
  );
}

// Fixed positions so the sky looks the same on every visit.
const STARS = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 78}%`,
  delay: `${(i % 7) * 0.45}s`,
  big: i % 6 === 0,
}));

export default function HalloweenDecor() {
  return (
    <div aria-hidden="true" className="hw-decor">
      {STARS.map((s, i) => (
        <span key={i} className={s.big ? "hw-star hw-star-big" : "hw-star"} style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
      ))}
      <span className="hw-moon" />
      <PixelSprite rows={SPRITES.bat} scale={3} className="hw-bat hw-bat-1" />
      <PixelSprite rows={SPRITES.bat} scale={2} className="hw-bat hw-bat-2" />
      <PixelSprite rows={SPRITES.bat} scale={2} className="hw-bat hw-bat-3" />
      <PixelSprite rows={SPRITES.ghost} scale={3} className="hw-ghost" />
      <div className="hw-ground">
        <span className="hw-grave hw-grave-1" />
        <span className="hw-grave hw-grave-2" />
        <PixelSprite rows={SPRITES.pumpkin} scale={2} className="hw-pumpkin hw-pumpkin-1" />
        <PixelSprite rows={SPRITES.pumpkin} scale={3} className="hw-pumpkin hw-pumpkin-2" />
      </div>
    </div>
  );
}
