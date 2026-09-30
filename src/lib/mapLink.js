export function isIOS() {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function buildMapUrl(address) {
  const query = encodeURIComponent(address);
  return isIOS()
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function copyAddressAndOpenMap(address) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(address).catch(() => {});
  }
  window.open(buildMapUrl(address), "_blank", "noopener,noreferrer");
}
