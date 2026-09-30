import { cardVariants } from "@heroui/react";

const cardBase = cardVariants({ variant: "secondary" }).base;

function LandingCard({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cardBase({
        className:
          "w-full flex-col items-center gap-2 p-7 text-[1.05rem] font-bold transition-transform active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2",
      })}
    >
      <span aria-hidden="true" className="text-3xl">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function LandingView({ onPlayToday, onGameTracking }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <p className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-muted">Brevard Volleyball Club</p>
      <div className="flex w-full max-w-96 flex-col gap-4">
        <LandingCard icon="📍" label="Where to play volleyball today" onClick={onPlayToday} />
        <LandingCard icon="🏐" label="Game tracking" onClick={onGameTracking} />
      </div>
    </main>
  );
}
