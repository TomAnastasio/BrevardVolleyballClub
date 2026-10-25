import { useEffect, useRef } from "react";
import { backNavigation } from "../lib/backNavigation.js";

// Lets the phone's Back button run this screen's own Back (see
// src/lib/backNavigation.js). `depth` is how many Back presses this screen
// is from its root; `priority` orders nested screens (higher = on top).
export function useBackLayer(priority, depth, onBack) {
  const backRef = useRef(onBack);
  const depthRef = useRef(depth);
  const idRef = useRef(null);
  useEffect(() => {
    backRef.current = onBack;
  });

  useEffect(() => {
    const nav = backNavigation();
    if (!nav) return undefined;
    const id = nav.add(priority, depthRef.current, () => backRef.current());
    idRef.current = id;
    return () => {
      nav.remove(id);
      idRef.current = null;
    };
  }, [priority]);

  useEffect(() => {
    depthRef.current = depth;
    if (idRef.current != null) backNavigation()?.update(idRef.current, depth);
  }, [depth]);
}
