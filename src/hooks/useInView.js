import { useEffect, useRef, useState } from "react";

// True once the element has scrolled at least `threshold` into view, and
// stays true — for one-time entrance animations like the Elo chart drawing.
export function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  // No dependency list on purpose: the element may not exist on the first
  // render (EloChart renders nothing until its data loads), so keep checking
  // each render until it is attached and seen.
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  return [ref, inView];
}
