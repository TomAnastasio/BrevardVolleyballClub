// Alpha-stage build marker: version from package.json plus the deployed
// commit's short SHA (injected at build time, see vite.config.js), so we can
// tell which release a screenshot or bug report came from. Faded so it's
// there to find but doesn't read as a real UI element. It sits in the
// bottom-left corner of the page, not the screen (owner's call, 2026-10-24):
// on a page that scrolls, it's at the very bottom. Rendered last in the app
// shell; the zero-height `mt-auto` wrapper pins it to the shell's bottom even
// when the page is shorter than the screen. Anything may overlap it.
export default function VersionBadge() {
  return (
    <div aria-hidden="true" className="relative mt-auto h-0">
      <div
        className="pointer-events-none absolute left-2 z-40 select-none whitespace-nowrap text-[10px] leading-none text-muted opacity-35"
        style={{ bottom: "calc(0.5rem + var(--safe-bottom))" }}
      >
        v{__APP_VERSION__} · {__BUILD_SHA__}
      </div>
    </div>
  );
}
