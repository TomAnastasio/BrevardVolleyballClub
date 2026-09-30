// Real recurring weekly meetups. Add more entries here as new sessions are scheduled.
// dayOfWeek: 0 = Sunday, 1 = Monday, ... 6 = Saturday
// `details` is optional — only add it for meetups with enough extra info to warrant
// their own page (rules, formats, contacts, etc). Meetups without `details` just show
// the summary card and aren't clickable.
export const WEEKLY_MEETUPS = [
  {
    id: "paradise-beach",
    dayOfWeek: 0,
    group: "Paradise Beach Volleyball Meet Up",
    format: "4v4 Beach Volleyball",
    notes: "Beginner friendly · Free",
    time: "7:30 AM – 11:00 AM",
    location: "2301 Jimmy Buffett Mem Hwy, Melbourne, FL 32903",
  },
  {
    id: "kiwanis-island-park",
    dayOfWeek: 2,
    group: "Kiwanis Island Park - Kiwanis Community Center",
    format: "Public Pick Up",
    notes: "Moderate · Free",
    time: "5:30 PM – 7:55 PM",
    location: "951 Kiwanis Island Park Rd, Merritt Island, FL 32953",
  },
  {
    id: "viera-community-center",
    dayOfWeek: 2,
    group: "Viera Community Center",
    format: "Public Pick Up",
    notes: "Beginner · $2",
    time: "6:00 PM – 8:00 PM",
    location: "2300 Judge Fran Jamieson Way, Melbourne, FL 32940",
  },
  {
    id: "calvary-chapel-west-melbourne",
    dayOfWeek: 0,
    group: "Calvary Chapel - West Melbourne",
    format: "Public Pick Up",
    notes: "Adults (18+) only · Free · Intermediate",
    time: "1:00 PM – 5:00 PM",
    location: "2955 Minton Rd #6624, West Melbourne, FL 32904",
  },
  {
    id: "mics",
    dayOfWeek: 1,
    group: "MICS",
    format: "Open Play & Structured Play",
    notes:
      "7–8 PM open play · 8 PM pick teams · 8–11 PM structured play · Park in the large lot on the north side of Magnolia Ave and walk across to the gym",
    time: "7:00 PM – 11:00 PM",
    location: "Merritt Island Christian School, 140 Magnolia Ave, Merritt Island, FL 32952",
  },
  {
    id: "tony-rosa-wed",
    dayOfWeek: 3,
    group: "Tony Rosa Indoor Open Play Volleyball Nights",
    format: "Open Play",
    notes: "All skill levels · $2 (Free with membership) · (321) 952-3443",
    time: "6:00 PM – 8:30 PM",
    location: "Tony Rosa Community Center, 1502 Port Malabar Blvd. NE, Palm Bay, FL",
  },
  {
    id: "tony-rosa-fri",
    dayOfWeek: 5,
    group: "Tony Rosa Indoor Open Play Volleyball Nights",
    format: "Open Play",
    notes: "All skill levels · $2 (Free with membership) · (321) 952-3443",
    time: "6:00 PM – 8:30 PM",
    location: "Tony Rosa Community Center, 1502 Port Malabar Blvd. NE, Palm Bay, FL",
  },
  {
    id: "cape-coast-open-gym",
    dayOfWeek: 5,
    group: "Cape Coast Open Gym",
    format: "Open Gym",
    notes: "18+ Adults only · $5 · POC: Connie Denaburg (321) 480-947",
    time: "3:00 PM – 5:00 PM",
    location: "7740 Technology Dr, West Melbourne, FL 32904",
  },
  {
    id: "joseph-n-davis-community-center",
    dayOfWeek: 4,
    group: "Joseph N. Davis Community Center",
    format: "Public Pick Up · Alternating Standard/Power Nights",
    notes: "$3",
    time: "6:00 PM – 9:00 PM",
    location: "2547 Bruce D. Buggs St, Melbourne, FL 32901",
    details: {
      intro:
        "Formerly called Grant. Our format alternates weekly: every other Thursday is a Power volleyball night, with Standard volleyball nights in between. The first Power volleyball night was August 13th, and we plan to keep alternating each week for as long as we have use of the gym.",
      sections: [
        {
          heading: "Standard Volleyball Nights",
          body: "We pick teams at 6:30 PM and use our best efforts to arrange a fair rotation with equal team playing time.",
        },
        {
          heading: "Power Volleyball Nights",
          body: "Players can make up their own teams without going through the standard draft process. Players can show up already having their team set, or figure it out amongst themselves prior to 6:30 PM. Teams can have more than six players. Players who don't form their own teams will be assembled into teams by leadership — which may result in a mini-draft amongst those left.\n\nWe use a \"king of the court\" format where the winning team stays on the court. This results in stronger teams playing more and weaker teams playing less. Depending on the number of teams and dominance of the stronger teams, leadership may set a limit on the number of straight games one team can stay on a court. The number of teams playing that night is also expected to result in oncoming teams having to wait more than one game before they're back on again.",
        },
      ],
      reminder:
        "As a reminder, for every Thursday, you must either be here by 6:30 PM or let one of us know you are coming so that you can be placed on a team during any draft.",
      contacts: [
        { name: "Keith", phone: "(410) 236-3675" },
        { name: "Haley", phone: "(561) 603-2010" },
      ],
    },
  },
];

export function generateWeekSchedule(today = new Date()) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const meetups = WEEKLY_MEETUPS.filter((m) => m.dayOfWeek === d.getDay());

    days.push({
      isToday: i === 0,
      heading: (i === 0 ? "Today · " : "") + weekday + ", " + dateLabel,
      meetups,
    });
  }
  return days;
}
