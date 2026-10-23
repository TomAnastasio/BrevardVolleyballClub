// Inline style for a list row using .animate-rise-in: each row waits a
// little longer than the one above. Capped so a long list (Past Games)
// doesn't make anyone wait for row 40 — rows past the cap, off screen
// anyway, all come in together.
export function stagger(index, step = 40, cap = 10) {
  return { "--rise-delay": `${Math.min(index, cap) * step}ms` };
}
