export const TEAM_COLORS = [
  { hex: "#facc15", fg: "#000000" }, // yellow
  { hex: "#fb923c", fg: "#000000" }, // orange
  { hex: "#ef4444", fg: "#ffffff" }, // red
  { hex: "#ec4899", fg: "#ffffff" }, // pink
  { hex: "#a855f7", fg: "#ffffff" }, // purple
  { hex: "#6366f1", fg: "#ffffff" }, // indigo
  { hex: "#3b82f6", fg: "#ffffff" }, // blue
  { hex: "#22d3ee", fg: "#000000" }, // cyan
  { hex: "#22c55e", fg: "#000000" }, // green
  { hex: "#d1d5db", fg: "#000000" }, // silver
];

export const DEFAULT_COLOR_A = TEAM_COLORS[0].hex;
export const DEFAULT_COLOR_B = TEAM_COLORS[6].hex;

export function colorForeground(hex) {
  const match = TEAM_COLORS.find((c) => c.hex.toLowerCase() === (hex || "").toLowerCase());
  return match ? match.fg : "#ffffff";
}
