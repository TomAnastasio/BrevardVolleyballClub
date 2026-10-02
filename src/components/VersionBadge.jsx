// Alpha-stage build marker: version from package.json plus the deployed
// commit's short SHA (injected at build time, see vite.config.js), so we can
// tell which release a screenshot or bug report came from. Faded and
// corner-pinned so it's there to find but doesn't read as a real UI element.
export default function VersionBadge() {
  return (
    <div
      className="pointer-events-none fixed left-2 z-40 select-none text-[10px] leading-none text-muted opacity-35"
      style={{ bottom: "calc(0.5rem + var(--safe-bottom))" }}
    >
      v{__APP_VERSION__} · {__BUILD_SHA__}
    </div>
  );
}
