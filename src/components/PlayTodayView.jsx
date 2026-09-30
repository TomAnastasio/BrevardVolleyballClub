import { useMemo, useState } from "react";
import { Card } from "@heroui/react";
import { generateWeekSchedule } from "../lib/playSchedule.js";
import { copyAddressAndOpenMap } from "../lib/mapLink.js";

function LocationButton({ address, stopPropagation }) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e) => {
    if (stopPropagation) e.stopPropagation();
    copyAddressAndOpenMap(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-fit rounded text-left text-sm text-muted underline decoration-dotted underline-offset-2 focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      {copied ? "Copied! Opening maps…" : address}
    </button>
  );
}

function MeetupCard({ meetup, isToday, onSelect }) {
  const hasDetails = Boolean(meetup.details);
  const content = (
    <>
      <div className="text-xs font-bold uppercase tracking-wide text-muted">{meetup.group}</div>
      <div className="text-base font-bold">{meetup.time}</div>
      <div className="text-sm text-muted">
        {meetup.format} · {meetup.notes}
      </div>
      <LocationButton address={meetup.location} stopPropagation={hasDetails} />
    </>
  );

  if (!hasDetails) {
    return (
      <Card variant="secondary" className={`gap-0.5 rounded-xl p-3 ${isToday ? "border-l-4 border-accent" : ""}`}>
        {content}
      </Card>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(meetup)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(meetup);
        }
      }}
      className="w-full cursor-pointer rounded-xl text-left focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <Card
        variant="secondary"
        className={`gap-0.5 rounded-xl p-3 ${isToday ? "border-l-4 border-accent" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 flex-col gap-0.5">{content}</div>
          <span aria-hidden="true" className="pt-1 text-lg text-muted">
            &rsaquo;
          </span>
        </div>
      </Card>
    </div>
  );
}

function DayGroup({ day, onSelectMeetup }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`m-0 font-bold ${day.isToday ? "text-[1.15rem] text-accent" : "text-base text-muted"}`}>
        {day.heading}
      </h3>
      {day.meetups.length === 0 ? (
        <p className="m-0 text-sm text-muted">No meetups scheduled.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {day.meetups.map((meetup) => (
            <li key={meetup.id}>
              <MeetupCard meetup={meetup} isToday={day.isToday} onSelect={onSelectMeetup} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MeetupDetailView({ meetup, onBack }) {
  const { details } = meetup;
  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to schedule"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Back
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">{meetup.group}</h2>
      </header>

      <div className="flex flex-col gap-4 px-3 pb-6">
        <Card variant="secondary" className="gap-0.5 rounded-xl p-3">
          <div className="text-base font-bold">{meetup.time}</div>
          <div className="text-sm text-muted">
            {meetup.format} · {meetup.notes}
          </div>
          <LocationButton address={meetup.location} />
        </Card>

        {details.intro && <p className="m-0 whitespace-pre-line text-sm">{details.intro}</p>}

        {details.sections?.map((section) => (
          <section key={section.heading} className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">{section.heading}</h3>
            <p className="m-0 whitespace-pre-line text-sm text-muted">{section.body}</p>
          </section>
        ))}

        {details.reminder && (
          <p className="m-0 whitespace-pre-line text-sm font-bold underline">{details.reminder}</p>
        )}

        {details.contacts?.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">Contacts</h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-muted">
              {details.contacts.map((contact) => (
                <li key={contact.name}>
                  {contact.name}: {contact.phone}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

export default function PlayTodayView({ onBack }) {
  const days = useMemo(() => generateWeekSchedule(), []);
  const [today, ...upcoming] = days;
  const [selectedMeetup, setSelectedMeetup] = useState(null);

  if (selectedMeetup) {
    return <MeetupDetailView meetup={selectedMeetup} onBack={() => setSelectedMeetup(null)} />;
  }

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
          <DayGroup day={today} onSelectMeetup={setSelectedMeetup} />
        </div>
        <div className="flex flex-col gap-4">
          {upcoming.map((day) => (
            <DayGroup key={day.heading} day={day} onSelectMeetup={setSelectedMeetup} />
          ))}
        </div>
      </div>
    </main>
  );
}
