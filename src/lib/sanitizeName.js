export function sanitizeName(text, fallback) {
  let cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > 24) cleaned = cleaned.slice(0, 24);
  return cleaned;
}
