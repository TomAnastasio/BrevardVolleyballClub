import { useEffect, useState } from "react";

function computeState() {
  return {
    isPortrait: window.matchMedia("(orientation: portrait)").matches,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Live viewport size and orientation. The scoreboard picks its layout from
 * this — PortraitGameView held upright, GameView (TeamPanel) in landscape —
 * and TeamPanel sizes its text/buttons from the width/height.
 */
export function useViewport() {
  const [state, setState] = useState(computeState);

  useEffect(() => {
    const update = () => setState(computeState());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}
