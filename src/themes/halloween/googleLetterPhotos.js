// Spots Google's stand-in "photo" for accounts that never set one: a flat
// coloured square with a white first initial. Google's links don't say which
// kind they are, so each Google picture is looked at once (shrunk to 48x48)
// and the answer remembered on this phone. Real photos, even simple logos or
// drawings, are far busier than one colour plus a letter; checked against
// every Google picture on Rankings 2026-10-23 (letters >= 96% two colours,
// the plainest real pictures <= 90%).
const GOOGLE_PHOTO = /^https:\/\/lh\d\.googleusercontent\.com\//;
const STORAGE_KEY = "bvc-halloween-letter-photos";
const SIZE = 48;

// `pixels` is RGBA bytes. Colours are bucketed to 16 levels per channel so
// the letter's anti-aliased edge doesn't count as many colours.
export function looksLikeLetterAvatar(pixels) {
  const counts = new Map();
  for (let k = 0; k < pixels.length; k += 4) {
    const key = ((pixels[k] >> 4) << 8) | ((pixels[k + 1] >> 4) << 4) | (pixels[k + 2] >> 4);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = pixels.length / 4;
  const [first = 0, second = 0] = [...counts.values()].sort((a, b) => b - a);
  return first / total >= 0.88 && (first + second) / total >= 0.94 && counts.size <= 40;
}

let verdicts = new Map();
try {
  verdicts = new Map(Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}));
} catch {
  /* storage unavailable or empty, start fresh */
}
const pending = new Set();
const failed = new Set(); // couldn't load this visit (e.g. Google said "too many requests"); retried next visit
const listeners = new Set();
let version = 0;
let notifyTimer = null;

function remember(url, isLetter) {
  verdicts.set(url, isLetter);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(verdicts)));
  } catch {
    /* storage unavailable, keep it for this visit only */
  }
  // One redraw for a burst of answers (a list of players loads together).
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    version++;
    listeners.forEach((fn) => fn());
  }, 100);
}

async function check(url) {
  pending.add(url);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const ctx = Object.assign(document.createElement("canvas"), { width: SIZE, height: SIZE }).getContext("2d");
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    remember(url, looksLikeLetterAvatar(ctx.getImageData(0, 0, SIZE, SIZE).data));
  } catch {
    // Couldn't load or read it: leave the picture as it is for now.
    failed.add(url);
  } finally {
    pending.delete(url);
  }
}

// true once a Google picture is known to be a letter; false for anything
// else, including Google pictures not checked yet (the check starts here).
export function isGoogleLetterPhoto(url) {
  if (!GOOGLE_PHOTO.test(url)) return false;
  const known = verdicts.get(url);
  if (known !== undefined) return known;
  if (!pending.has(url) && !failed.has(url) && typeof Image !== "undefined") check(url);
  return false;
}

// For useSyncExternalStore in App.jsx: bumps when a check finishes, so
// screens redraw with the monster in place of the letter.
export function subscribeLetterPhotoChecks(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function letterPhotoChecksVersion() {
  return version;
}
