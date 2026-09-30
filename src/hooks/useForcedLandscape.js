import { useEffect, useState } from "react";

function computeState(isActive) {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const forced = isActive && isPortrait;
  return {
    forced,
    width: forced ? window.innerHeight : window.innerWidth,
    height: forced ? window.innerWidth : window.innerHeight,
  };
}

/**
 * When the scoreboard forces a rotated landscape presentation (see
 * .force-landscape in index.css), the real viewport stays portrait-shaped —
 * so any code reading window/media dimensions directly (vw/vh, media
 * queries, matchMedia) sees the wrong, unrotated numbers. This returns the
 * "effective" width/height the user actually sees post-rotation, so
 * responsive sizing matches true landscape exactly.
 */
export function useForcedLandscape(isActive) {
  const [state, setState] = useState(() => computeState(isActive));

  useEffect(() => {
    const update = () => setState(computeState(isActive));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [isActive]);

  return state;
}
