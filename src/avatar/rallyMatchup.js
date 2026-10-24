// Who plays in the home screen's rally (owner's call, 2026-10-24): you vs
// your rival. Your rival is your toughest opponent (partnerStats); if you
// don't have one yet (too few games, or no losses), it's the #1 ranked
// player, or #2 if you're #1. Signed out, it's #1 vs #2.
//
// `ranked` is ranked players highest Elo first ({ id, display_name }).
// Returns { left, right }, each { id, name } or null (a plain, nameless
// player, e.g. before anyone has played a ranked game).
export function rallyMatchup({ user, toughestOpponent, ranked }) {
  const asPlayer = (p) => (p ? { id: p.id, name: p.display_name } : null);
  if (!user) return { left: asPlayer(ranked[0]), right: asPlayer(ranked[1]) };
  const fallback = ranked.find((p) => p.id !== user.id);
  return {
    left: { id: user.id, name: user.name },
    right: toughestOpponent ? { id: toughestOpponent.id, name: toughestOpponent.name } : asPlayer(fallback),
  };
}
