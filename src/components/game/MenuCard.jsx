const cardClass =
  "flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-200";
const interactiveClass =
  "cursor-pointer active:scale-[0.98] hover:border-accent/40 hover:bg-white/[0.08] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2";

export function MenuCardContent({ icon, label, subtitle, showChevron }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-2xl"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[1.05rem] font-bold leading-tight">{label}</span>
        <span className="text-sm text-muted">{subtitle}</span>
      </span>
      {showChevron && (
        <span aria-hidden="true" className="flex-none text-xl text-muted">
          ›
        </span>
      )}
    </>
  );
}

export default function MenuCard({ icon, label, subtitle, onClick, disabled }) {
  if (disabled) {
    return (
      <div aria-disabled="true" className={`${cardClass} cursor-not-allowed opacity-40`}>
        <MenuCardContent icon={icon} label={label} subtitle={subtitle} showChevron={false} />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${cardClass} ${interactiveClass}`}>
      <MenuCardContent icon={icon} label={label} subtitle={subtitle} showChevron />
    </button>
  );
}

export { cardClass, interactiveClass };
