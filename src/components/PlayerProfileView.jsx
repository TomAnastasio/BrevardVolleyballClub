import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import RankBadge, { rankBadgeHeight } from "./RankBadge.jsx";
import { rankTitle } from "../lib/rankTitle.js";
import ProfilePhotoEditor from "./ProfilePhotoEditor.jsx";
import { partnerStats, usePlayerGames, winLossRecords } from "../hooks/usePlayerGames.js";
import { usePlayerElo } from "../hooks/usePlayerElo.js";
import EloChart from "./EloChart.jsx";
import PartnersAndRivals from "./PartnersAndRivals.jsx";
import { usePlayerTournaments } from "../hooks/useTournament.js";
import { formatEventDate, placeLabel, TITLE_LABELS } from "./tournament/tournamentFormat.js";
import { useAuth } from "../hooks/useAuth.js";
import { supabase } from "../lib/supabaseClient.js";
import CopyableText from "./CopyableText.jsx";
import TournamentGameTag from "./TournamentGameTag.jsx";
import { stagger } from "../lib/motion.js";
import { useCountUp } from "../hooks/useCountUp.js";
import { sanitizeName } from "../lib/sanitizeName.js";
import { playerPhoto } from "../themes/playerPhoto.js";

function PlayerAvatar({ src }) {
  if (!src) {
    return <span aria-hidden="true" className="h-16 w-16 flex-none rounded-full border border-white/10 bg-white/5" />;
  }
  return <img src={src} alt="" aria-hidden="true" className="h-16 w-16 flex-none rounded-full border border-white/10 object-cover" />;
}

function GameRow({ game, index, eloDelta, onOpenGame, onOpenTournament }) {
  const result = game.ownScore > game.oppScore ? "win" : game.ownScore < game.oppScore ? "loss" : "tie";
  // Same stretched-button card as Past Games (HistoryView), so the
  // tournament tag stays its own button.
  return (
    <li className={`animate-rise-in relative transition-transform duration-150 has-[>button:active]:scale-[0.98]`} style={stagger(index)}>
      <Card className="gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">{game.date}</span>
          <span className="flex-none text-lg font-bold [font-variant-numeric:tabular-nums]">
            <span className={result === "win" ? "text-success" : result === "loss" ? "text-danger" : ""}>
              {game.ownScore}
            </span>
            <span className="text-muted"> – </span>
            <span>{game.oppScore}</span>
          </span>
        </div>
        <TournamentGameTag tag={game.tournament} onOpen={onOpenTournament} />
        <div className="flex items-center justify-between gap-2">
          {game.oppName ? (
            <p className="m-0 min-w-0 truncate text-xs text-muted">vs {game.oppName}</p>
          ) : (
            <span />
          )}
          <span className="flex flex-none items-center gap-1 text-[0.65rem] font-bold text-muted">
            <span>
              {game.format === "indoor"
                ? "🏐 Indoor"
                : game.teamSize
                  ? `${game.teamSize}v${game.teamSize} 🏖️ Beach`
                  : "🏖️ Beach"}
            </span>
            <span>·</span>
            <span className={game.mode === "ranked" ? "text-accent" : ""}>
              {game.mode === "ranked" ? "🏆 Ranked" : "🎲 Casual"}
            </span>
            {/* This player's Elo change for the game; signed-in viewers only
                (elo_history is members-only), ranked games only. */}
            {eloDelta != null && (
              <span
                className={`rounded-full px-1.5 py-0.5 [font-variant-numeric:tabular-nums] ${
                  eloDelta > 0 ? "bg-success/15 text-success" : eloDelta < 0 ? "bg-danger/15 text-danger" : "bg-white/10 text-muted"
                }`}
              >
                {eloDelta > 0 ? `+${eloDelta}` : eloDelta} Elo
              </span>
            )}
          </span>
        </div>
      </Card>
      <button
        type="button"
        onClick={() => onOpenGame(game.id)}
        aria-label={`Game details: ${game.ownScore} to ${game.oppScore}${game.oppName ? ` vs ${game.oppName}` : ""}, ${game.date}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      />
    </li>
  );
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

// Admin-only: rename this player. admin_set_display_name() re-checks admin
// and cleans the name server-side too. Old games keep the name they were
// saved with (see that migration).
function AdminNameEditor({ profileId, name, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cleaned = sanitizeName(draft, "");

  async function handleSave(e) {
    e.preventDefault();
    if (!cleaned || saving) return;
    if (cleaned === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: err } = await supabase.rpc("admin_set_display_name", {
      p_profile_id: profileId,
      p_display_name: cleaned,
    });
    setSaving(false);
    if (err) {
      console.error("Failed to rename player:", err);
      setError("Couldn't save the new name. Please try again.");
      return;
    }
    onRenamed(data);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex-none text-xs font-bold text-muted">Display name</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate">{name || "—"}</span>
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              setDraft(name || "");
              setError("");
              setEditing(true);
            }}
            aria-label="Edit display name"
            className="flex-none font-bold"
          >
            ✏️ Edit
          </Button>
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2">
      <span className="text-xs font-bold text-muted">Display name</span>
      <input
        type="text"
        value={draft}
        maxLength={24}
        autoFocus
        aria-label="New display name"
        onChange={(e) => setDraft(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base font-bold text-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <p className="m-0 text-xs text-muted">
        Changes their name everywhere, except the team names on games already played.
      </p>
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-red-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onPress={() => setEditing(false)} isDisabled={saving}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" isDisabled={!cleaned || saving} className="font-bold">
          {saving ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}

// Admin-only: the sign-in email and everything else on file for this player
// (admin_profile_details() refuses anyone who isn't an admin).
function AdminDetails({ profileId, name, onRenamed }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    setError("");
    supabase.rpc("admin_profile_details", { p_profile_id: profileId }).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        console.error("Failed to load admin profile details:", err);
        setError("Couldn't load this player's details.");
      } else setDetails(data?.[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const row = (label, value, copyable) => (
    <div className="flex items-baseline justify-between gap-2">
      <span className="flex-none text-xs font-bold text-muted">{label}</span>
      {copyable && value ? (
        <CopyableText value={value} label={label} className="justify-end text-right" />
      ) : (
        <span className="min-w-0 break-all text-right">{value || "—"}</span>
      )}
    </div>
  );

  return (
    <Card className="gap-2 border border-warning/40 p-3 text-sm">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-warning">Admin only · not visible to players</p>
      {error && <p className="m-0 text-red-400">{error}</p>}
      {!details && !error && <p className="m-0 text-muted">Loading…</p>}
      <AdminNameEditor profileId={profileId} name={name} onRenamed={onRenamed} />
      {details && (
        <>
          {details.is_manual ? (
            <p className="m-0 text-muted">Manual profile: no sign-in account, so no sign-in email.</p>
          ) : (
            <>
              {row("Sign-in email", details.email, true)}
              {details.auth_phone && row("Account phone", details.auth_phone, true)}
              {row("Signs in with", details.sign_in_provider)}
              {row("Signed up", formatWhen(details.signed_up_at))}
              {row("Last sign-in", formatWhen(details.last_sign_in_at))}
            </>
          )}
          {row("Admin", details.is_admin ? "Yes" : "No")}
          {details.tournament_contacts.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 border-t border-white/10 pt-2">
              <span className="text-xs font-bold text-muted">From {c.tournament} registration</span>
              {row("Email", c.email, true)}
              {row("Phone", c.phone, true)}
            </div>
          ))}
          {row("Profile ID", profileId, true)}
        </>
      )}
    </Card>
  );
}

export default function PlayerProfileView({
  player,
  onBack,
  backLabel = "Rankings",
  refreshKey,
  onOpenGame,
  onOpenPlayer,
  onOpenTournament,
}) {
  const { games, loading } = usePlayerGames(player?.id, refreshKey);
  const tournaments = usePlayerTournaments(player?.id);
  const titles = tournaments.filter((e) => e.title);
  const { user, isAdmin, refreshProfile } = useAuth();
  const { series: eloSeries } = usePlayerElo(player?.id, Boolean(user), refreshKey);
  const eloDeltaByGame = new Map(eloSeries.map((p) => [p.gameId, p.delta]));
  const isOwnProfile = Boolean(user) && user.id === player.id;
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [displayName, setDisplayName] = useState(player.display_name);

  const records = winLossRecords(games);
  // Starts most of the way there: a quick tick up to their rating, not a
  // count from zero.
  const shownElo = useCountUp(player.elo_rating, { from: Math.round((player.elo_rating ?? 0) * 0.9) });
  const hasRanked = player.elo_games_played > 0;
  // 3x the Rankings badge (owner's pick).
  const badgeSize = 114;
  const badgeHeight = player.tier ? rankBadgeHeight(player.tier, badgeSize) : 0;

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel === "Rankings" ? "Back to rankings" : backLabel === "Menu" ? "Back to main menu" : "Back"}
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {backLabel}
        </button>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-6">
        {/* The rank badge sits big in the top-right corner, its top level
            with the profile photo's; the name and stats keep clear of it. */}
        <div
          className="relative flex flex-col gap-3"
          style={player.tier ? { paddingRight: badgeSize + 8, minHeight: badgeHeight } : undefined}
        >
          {player.tier && (
            <div className="absolute top-0 right-0 flex">
              <RankBadge tier={player.tier} division={player.division} size={badgeSize} />
            </div>
          )}
          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <ProfilePhotoEditor
                avatarUrl={playerPhoto(avatarUrl, player.id)}
                onSaved={(url) => {
                  setAvatarUrl(url);
                  setPhotoSaved(true);
                }}
              />
            ) : (
              <PlayerAvatar src={playerPhoto(avatarUrl, player.id)} />
            )}
            <span className="min-w-0 flex-1 truncate text-lg font-bold">
              {displayName}
              {titles.length > 0 && (
                <span className="ml-1" aria-label={titles.map((e) => `${e.title} of ${e.tournament.name}`).join(", ")}>
                  {titles.map((e) => (e.title === "queen" ? "👑" : "👸")).join("")}
                </span>
              )}
            </span>
          </div>

          {photoSaved && (
            <p role="status" className="animate-pop-in m-0 origin-left text-sm font-semibold text-success">
              ✓ Profile photo updated
            </p>
          )}

          {(hasRanked || (!loading && games.length > 0)) && (
            <div className="flex flex-col gap-0.5 text-sm text-muted">
              {hasRanked && (
                <p className="m-0 font-semibold text-foreground">
                  <span className="[font-variant-numeric:tabular-nums]">{shownElo}</span> Elo
                  {player.tier && <span className="font-normal text-muted"> · {rankTitle(player.tier, player.division)}</span>}
                </p>
              )}
              {/* Overall first, ranked right under it (owner's call). The
                  ranked line only appears once they've played a ranked game. */}
              {!loading && games.length > 0 && (
                <dl className="m-0 grid w-max grid-cols-[auto_auto] gap-x-4 [font-variant-numeric:tabular-nums]">
                  <dt>Overall</dt>
                  <dd className="m-0">
                    {records.overall.wins}W – {records.overall.losses}L
                  </dd>
                  {hasRanked && (
                    <>
                      <dt>Ranked</dt>
                      <dd className="m-0">
                        {records.ranked.wins}W – {records.ranked.losses}L
                      </dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          )}
        </div>

        {hasRanked &&
          (user ? (
            <EloChart series={eloSeries} />
          ) : (
            <p className="m-0 text-xs text-muted">Sign in to see Elo over time.</p>
          ))}

        {!loading && <PartnersAndRivals stats={partnerStats(games)} onOpenPlayer={onOpenPlayer} />}

        {isAdmin && (
          <AdminDetails
            profileId={player.id}
            name={displayName}
            onRenamed={(name) => {
              setDisplayName(name);
              if (isOwnProfile) refreshProfile();
            }}
          />
        )}

        {tournaments.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Tournaments</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {tournaments.map((e, index) => (
                <li key={e.id} className="animate-rise-in" style={stagger(index)}>
                  <Card className={`gap-0.5 p-3 ${e.title ? "border border-accent/40" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-bold">{e.tournament.name}</span>
                      <span className="flex-none text-sm font-bold text-accent">
                        {e.title ? TITLE_LABELS[e.title] : e.final_place ? placeLabel(e.final_place) : ""}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {formatEventDate(e.tournament.event_date)}
                      {e.division?.name ? ` · ${e.division.name}` : ""}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <LoadingMeteor />
            <p className="m-0 text-center text-muted">Loading games…</p>
          </div>
        ) : games.length === 0 ? (
          <p className="p-6 text-center text-muted">No games played yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {games.map((game, index) => (
              <GameRow key={game.id} game={game} index={index} eloDelta={eloDeltaByGame.get(game.id)} onOpenGame={onOpenGame} onOpenTournament={onOpenTournament} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
