import { describe, expect, it } from "vitest";
import { drawAvatar, SKIN_TONES } from "./engine.js";
import { ART } from "./art/index.js";

// A canvas context that records every 1x1 pixel drawn: "x,y" -> color.
function pixels(gear) {
  const out = new Map();
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {
      fillRect(x, y, w, h) {
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.set(`${x + i},${y + j}`, this.fillStyle);
      },
    },
    { get: (t, p) => (p in t ? t[p] : p === "createRadialGradient" || p === "createLinearGradient" ? () => gradient : () => {}) },
  );
  drawAvatar(ctx, gear, 20, 40, 0);
  return out;
}
const colors = (px) => new Set(px.values());

describe("avatar look", () => {
  it("draws Avatar 2 with different hair than Avatar 1", () => {
    const a1 = pixels({ look: { avatar: 1, skin: 2 } });
    const a2 = pixels({ look: { avatar: 2, skin: 2 } });
    expect([...a2.keys()].filter((k) => !a1.has(k)).length).toBeGreaterThan(0);
  });

  it("draws the default look when none is given", () => {
    expect(pixels(null)).toEqual(pixels({ look: { avatar: 1, skin: 2 } }));
  });

  it("paints all skin in the chosen skin color, items included", () => {
    const other = SKIN_TONES.map((t) => [t.s, t.S]);
    for (let skin = 1; skin <= 4; skin++) {
      const wrong = other.filter((_, i) => i !== skin - 1).flat();
      for (const { slot, item } of ART.values()) {
        if (slot === "transformation") continue;
        const seen = colors(pixels({ [slot]: item, look: { avatar: 2, skin } }));
        expect(wrong.filter((c) => seen.has(c)), `${slot} item, skin ${skin}`).toEqual([]);
      }
      expect(colors(pixels({ look: { avatar: 1, skin } })).has(SKIN_TONES[skin - 1].s)).toBe(true);
    }
  });
});
