import { useEffect, useState } from "react";

// Counts a number up from `from` to `target` on mount (eased, ~0.9s), e.g.
// a profile's Elo. Jumps straight to the target with "reduce motion" on or
// when the target isn't a number.
export function useCountUp(target, { from = 0, duration = 900 } = {}) {
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduce || typeof target !== "number" ? target : from);

  useEffect(() => {
    if (reduce || typeof target !== "number") {
      setValue(target);
      return;
    }
    let frame;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Only re-run when the target itself changes.
  }, [target]);

  return value;
}
