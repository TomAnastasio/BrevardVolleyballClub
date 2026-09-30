import SocialLinks from "./SocialLinks.jsx";

function LandingCard({ icon, label, subtitle, onClick, delay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: delay }}
      className="animate-landing-in group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-200 active:scale-[0.98] hover:border-accent/40 hover:bg-white/[0.08] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-2xl transition-colors group-hover:border-accent/40 group-hover:bg-accent/20"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[1.05rem] font-bold leading-tight">{label}</span>
        <span className="text-sm text-muted">{subtitle}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex-none text-xl text-muted transition-all group-hover:translate-x-1 group-hover:text-accent"
      >
        ›
      </span>
    </button>
  );
}

export default function LandingView({ onPlayToday, onGameTracking }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-6 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="animate-landing-in relative flex flex-col items-center gap-2">
        <span className="text-lg font-black tracking-[0.3em] text-accent">BVC</span>
        <span className="h-px w-10 bg-accent/40" />
        <p className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-muted">Brevard Volleyball Club</p>
      </div>
      <div className="relative flex w-full max-w-96 flex-col gap-3">
        <LandingCard
          icon="📍"
          label="Where to play volleyball today"
          subtitle="Find open gyms near you right now"
          onClick={onPlayToday}
          delay="80ms"
        />
        <LandingCard
          icon="🏐"
          label="Game tracking"
          subtitle="Score and track live matches"
          onClick={onGameTracking}
          delay="160ms"
        />
      </div>
      <div className="animate-landing-in relative" style={{ animationDelay: "240ms" }}>
        <SocialLinks />
      </div>
    </main>
  );
}
