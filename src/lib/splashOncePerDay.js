// The BVC splash plays on the first open of the day only; any other open
// that day goes straight to the app. Days are the phone's local calendar
// days. If storage can't be read or written (private mode, blocked), the
// splash is skipped rather than shown every time.

const STORAGE_KEY = "bvc-splash-last-shown";

export function localDateKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Decides and records in one go: true means "show it now" (and today is
// remembered, so later opens today skip it).
export function claimSplashToday(storage, now = new Date()) {
  try {
    const today = localDateKey(now);
    if (storage.getItem(STORAGE_KEY) === today) return false;
    storage.setItem(STORAGE_KEY, today);
    return true;
  } catch {
    return false;
  }
}
