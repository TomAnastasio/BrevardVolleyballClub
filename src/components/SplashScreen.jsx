import { useEffect, useState } from "react";
import LoadingMeteor from "./LoadingMeteor.jsx";

export default function SplashScreen({ onReveal }) {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 400 : 2500;
    const t = setTimeout(() => {
      setHide(true);
      onReveal();
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 400);
    return () => clearTimeout(t);
  }, [hide]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black transition-opacity duration-[400ms] ${
        hide ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <LoadingMeteor size={320} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
        <svg
          viewBox="0 0 400 160"
          role="img"
          aria-label="BVC"
          className="relative h-auto w-[min(70vw,420px)] overflow-visible"
        >
          <text x="70" y="130" textAnchor="middle" className="splash-letter" style={{ animationDelay: "0s" }}>
            B
          </text>
          <text x="200" y="130" textAnchor="middle" className="splash-letter" style={{ animationDelay: "0.12s" }}>
            V
          </text>
          <text x="330" y="130" textAnchor="middle" className="splash-letter" style={{ animationDelay: "0.24s" }}>
            C
          </text>
        </svg>
      </div>
    </div>
  );
}
