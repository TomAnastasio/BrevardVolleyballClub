import { useEffect, useRef, useState } from "react";

const HEIGHT = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

function formatDay(date) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Round the y-range out to a tidy step so there are 2–4 gridlines.
function niceTicks(min, max) {
  const span = Math.max(max - min, 20);
  const step = [10, 25, 50, 100, 200].find((s) => span / s <= 3) || 500;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

// A player's Elo after every ranked game, one evenly spaced step per game
// (owner's call, 2026-10-22: by game, all time), starting from their rating
// before their first ranked game. One series, so no legend: the heading
// names it. Touch, hover or arrow keys move a crosshair with a readout.
export default function EloChart({ series }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState(null);

  // Re-attached once there's data: the wrapper doesn't exist while empty.
  const hasData = series.length > 0;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasData]);

  if (!hasData) return null;

  // Point 0 is the starting rating; point i is the rating after game i.
  const points = [
    { label: "Start", rating: series[0].before, delta: null },
    ...series.map((p) => ({ label: `Game ${p.game} · ${formatDay(p.date)}`, rating: p.rating, delta: p.delta })),
  ];
  const values = points.map((p) => p.rating);
  const { lo, hi, ticks } = niceTicks(Math.min(...values), Math.max(...values));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (points.length === 1 ? plotW : (i / (points.length - 1)) * plotW);
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  const shown = active ?? null;

  function indexFromPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - PAD.left) / plotW) * (points.length - 1));
    return Math.min(last, Math.max(0, i));
  }

  function handleKey(e) {
    if (e.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? last - 1) + 1));
    else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? last + 1) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const first = points[0].rating;
  const current = points[last].rating;
  const readout = shown == null ? null : points[shown];
  const tipLeft = shown == null ? 0 : Math.min(Math.max(x(shown), 70), width - 70);

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Elo over time</h3>
        <span className="text-xs text-muted [font-variant-numeric:tabular-nums]">
          {series.length} ranked {series.length === 1 ? "game" : "games"}
        </span>
      </div>
      <div ref={wrapRef} className="relative">
        {readout && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-surface px-2 py-1 text-xs shadow-lg [font-variant-numeric:tabular-nums]"
            style={{ left: tipLeft }}
          >
            <span className="text-muted">{readout.label}</span>
            <span className="ml-2 font-bold text-foreground">{readout.rating}</span>
            {readout.delta != null && (
              <span className="ml-1 text-muted">
                ({readout.delta > 0 ? `+${readout.delta}` : readout.delta})
              </span>
            )}
          </div>
        )}
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          tabIndex={0}
          aria-label={`Elo over ${series.length} ranked games, from ${first} to ${current}. Use the arrow keys to step through games.`}
          className="block touch-pan-y rounded-lg focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
          onPointerMove={(e) => setActive(indexFromPointer(e))}
          onPointerDown={(e) => setActive(indexFromPointer(e))}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-white/10" strokeWidth="1" />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] [font-variant-numeric:tabular-nums]">
                {t}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={HEIGHT - 6} className="fill-muted text-[10px]">
            Start
          </text>
          <text x={width - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-muted text-[10px]">
            Game {series.length}
          </text>
          <path d={path} fill="none" className="stroke-accent" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {shown != null && (
            <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-white/30" strokeWidth="1" />
          )}
          <circle
            cx={x(shown ?? last)}
            cy={y(points[shown ?? last].rating)}
            r="4.5"
            className="fill-accent stroke-background"
            strokeWidth="2"
          />
        </svg>
      </div>
      <table className="sr-only">
        <caption>Elo after each ranked game</caption>
        <thead>
          <tr>
            <th>Game</th>
            <th>Date</th>
            <th>Elo</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.gameId}>
              <td>{p.game}</td>
              <td>{p.date}</td>
              <td>{p.rating}</td>
              <td>{p.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
