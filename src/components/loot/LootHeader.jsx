// The Locker's and Cauldron's top bar: Back on the left, your tokens on the right.
export default function LootHeader({ backLabel, onBack, tokens }) {
  return (
    <header className="flex flex-none items-center justify-between gap-2 px-3 pb-2" style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}>
      <button
        type="button"
        onClick={onBack}
        aria-label={`Back to ${backLabel.toLowerCase()}`}
        className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        &lsaquo; {backLabel}
      </button>
      {tokens != null && (
        <span className="flex items-center gap-2 rounded-full border border-[#ffc53a]/40 bg-[#ffc53a]/10 px-3 py-1 text-sm font-bold [font-variant-numeric:tabular-nums]">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-[#ffc53a] shadow-[0_0_8px_#ffc53a]" />
          {tokens} {tokens === 1 ? "token" : "tokens"}
        </span>
      )}
    </header>
  );
}
