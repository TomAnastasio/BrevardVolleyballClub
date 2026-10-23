import { describe, expect, it } from "vitest";
import { isGoogleLetterPhoto, looksLikeLetterAvatar } from "./googleLetterPhotos.js";

// 48x48 RGBA test pictures
function picture(colorAt) {
  const px = new Uint8ClampedArray(48 * 48 * 4);
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const [r, g, b] = colorAt(x, y);
      px.set([r, g, b, 255], (y * 48 + x) * 4);
    }
  return px;
}

describe("looksLikeLetterAvatar", () => {
  it("spots a flat colour with a white letter", () => {
    const inLetter = (x, y) => x >= 18 && x < 30 && y >= 14 && y < 34 && (x < 21 || y < 17 || (y > 22 && y < 25));
    expect(looksLikeLetterAvatar(picture((x, y) => (inLetter(x, y) ? [255, 255, 255] : [0, 120, 200])))).toBe(true);
  });

  it("leaves a busy photo alone", () => {
    expect(looksLikeLetterAvatar(picture((x, y) => [(x * 37 + y * 11) % 256, (x * 7 + y * 29) % 256, (x * y) % 256]))).toBe(false);
  });

  it("leaves a simple drawing on a dark background alone", () => {
    // ~82% one colour, like the palm-tree picture on Rankings
    expect(looksLikeLetterAvatar(picture((x, y) => (x > 10 && x < 30 && y > 5 && y < 25 ? [230, 40, 120 + ((x + y) % 4) * 30] : [0, 0, 0])))).toBe(false);
  });
});

describe("isGoogleLetterPhoto", () => {
  it("never treats uploaded photos as letter circles", () => {
    expect(isGoogleLetterPhoto("https://example.supabase.co/storage/v1/object/public/profile-photos/me.jpg")).toBe(false);
  });
});
