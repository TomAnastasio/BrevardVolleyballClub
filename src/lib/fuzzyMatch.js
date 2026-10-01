// Lightweight fuzzy matching: no dependency needed at this app's scale
// (100-500 profiles, see TODO.md). Scores prefix/substring matches highest,
// falls back to an in-order character subsequence match (typos/skipped
// letters still match), and rejects anything that isn't a subsequence at all.
function fuzzyScore(query, target) {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;

  let qi = 0;
  let score = 0;
  let lastMatchIndex = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatchIndex === ti - 1 ? 5 : 1;
      lastMatchIndex = ti;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export function fuzzyFilter(query, items, getText, limit = 6) {
  if (!query.trim()) return [];
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
