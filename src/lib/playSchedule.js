export const PLAY_LOCATIONS = [
  "Paradise Beach Park",
  "Ballard Park Courts",
  "Wells Park",
  "Kiwanis Island Park",
  "Cocoa Beach Pier Courts",
  "Jetty Park",
  "Rotary Park",
];

export const PLAY_TIME_SLOTS = [
  { label: "Morning Open Gym", time: "9:00 AM – 11:00 AM" },
  { label: "Evening Open Gym", time: "6:00 PM – 8:00 PM" },
];

export function generateWeekSchedule(today = new Date()) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const gyms = [
      {
        label: PLAY_TIME_SLOTS[0].label,
        time: PLAY_TIME_SLOTS[0].time,
        location: PLAY_LOCATIONS[i % PLAY_LOCATIONS.length],
      },
      {
        label: PLAY_TIME_SLOTS[1].label,
        time: PLAY_TIME_SLOTS[1].time,
        location: PLAY_LOCATIONS[(i + 3) % PLAY_LOCATIONS.length],
      },
    ];

    days.push({
      isToday: i === 0,
      heading: (i === 0 ? "Today · " : "") + weekday + ", " + dateLabel,
      gyms,
    });
  }
  return days;
}
