import { useEffect, useRef } from "react";
import { reduced } from "./art/kit.js";

// One animation loop shared by every pixel canvas on screen (the Locker can
// show dozens of item tiles at once).
const subscribers = new Set();
const start = performance.now();
function loop(now) {
  const t = (now - start) / 1000;
  for (const fn of subscribers) fn(now, t);
  if (subscribers.size) requestAnimationFrame(loop);
}
function subscribe(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) requestAnimationFrame(loop);
  return () => subscribers.delete(fn);
}

// A canvas `width` x `height` art pixels, stretched by CSS with crisp pixels.
// `paint(ctx, t)` draws one frame (t in seconds); it runs only while the
// canvas is on screen, at most `fps` times a second, and once (t = 0) for
// people who prefer reduced motion.
export default function PixelCanvas({ width, height, paint, fps = 60, className = "", style, label }) {
  const ref = useRef(null);
  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const draw = (t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      paintRef.current(ctx, t);
    };
    draw(0);
    if (reduced) return undefined;
    let visible = true;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          });
    observer?.observe(canvas);
    let last = 0;
    const unsubscribe = subscribe((now, t) => {
      if (!visible || now - last < 1000 / fps - 4) return;
      last = now;
      draw(t);
    });
    return () => {
      unsubscribe();
      observer?.disconnect();
    };
  }, [width, height, fps]);

  // Reduced motion: still redraw when what's shown changes.
  useEffect(() => {
    if (!reduced) return;
    const ctx = ref.current.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    paint(ctx, 0);
  }, [paint, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`block ${className}`}
      style={{ imageRendering: "pixelated", aspectRatio: `${width} / ${height}`, ...style }}
    />
  );
}
