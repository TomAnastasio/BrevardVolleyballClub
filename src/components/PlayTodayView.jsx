import { useMemo } from "react";
import { Card } from "@heroui/react";
import { generateWeekSchedule } from "../lib/playSchedule.js";

function DayGroup({ day }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`m-0 font-bold ${day.isToday ? "text-[1.15rem] text-accent" : "text-base text-muted"}`}>
        {day.heading}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {day.gyms.map((gym) => (
          <li key={gym.label}>
            <Card
              variant="secondary"
              className={`gap-0.5 rounded-xl p-3 ${day.isToday ? "border-l-4 border-accent" : ""}`}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-muted">{gym.label}</div>
              <div className="text-base font-bold">{gym.location}</div>
              <div className="text-sm text-muted">{gym.time}</div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PlayTodayView({ onBack }) {
  const days = useMemo(() => generateWeekSchedule(), []);
  const [today, ...upcoming] = days;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Menu
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">
          Where to Play Today
        </h2>
      </header>

      <div className="flex flex-col px-3 pb-6">
        <div className="mb-8 border-b-2 border-dashed border-white/15 pb-6">
          <DayGroup day={today} />
        </div>
        <div className="flex flex-col gap-4">
          {upcoming.map((day) => (
            <DayGroup key={day.heading} day={day} />
          ))}
        </div>
      </div>
    </main>
  );
}
