// Shown when the item art couldn't be downloaded. A network blip is fixed by
// trying again; after the site has been updated the old file is gone, and
// only reloading the app gets the new one.
export default function ArtLoadError({ onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="m-0 text-muted">
        Couldn't load the item pictures. Check your connection and try again. If the app was just updated, reload it.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-accent px-4 py-2.5 font-bold text-accent-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/20 px-4 py-2.5 font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Reload app
        </button>
      </div>
    </div>
  );
}
