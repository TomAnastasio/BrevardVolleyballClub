import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import RankBadge from "./RankBadge.jsx";
import ProfilePhotoEditor from "./ProfilePhotoEditor.jsx";
import { usePlayerGames } from "../hooks/usePlayerGames.js";
import { usePlayerTournaments } from "../hooks/useTournament.js";
import { formatEventDate, placeLabel, TITLE_LABELS } from "./tournament/tournamentFormat.js";
import { useAuth } from "../hooks/useAuth.js";
import { supabase } from "../lib/supabaseClient.js";
import CopyableText from "./CopyableText.jsx";

function PlayerAvatar({ src }) {
  if (!src) {
    return <span aria-hidden="true" className="h-16 w-16 flex-none rounded-full border border-white/10 bg-white/5" />;
  }
  return <img src={src} alt="" aria-hidden="true" className="h-16 w-16 flex-none rounded-full border border-white/10 object-cover" />;
}

function GameRow({ game }) {
  const result = game.ownScore > game.oppScore ? "win" : game.ownScore < game.oppScore ? "loss" : "tie";
  return (
    <li>
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
          </span>
        </div>
      </Card>
    </li>
  );
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

// Admin-only: the sign-in email and everything else on file for this player
// (admin_profile_details() refuses anyone who isn't an admin).
function AdminDetails({ profileId }) {
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

export default function PlayerProfileView({ player, onBack }) {
  const { games, loading } = usePlayerGames(player?.id);
  const tournaments = usePlayerTournaments(player?.id);
  const titles = tournaments.filter((e) => e.title);
  const { user, isAdmin } = useAuth();
  const isOwnProfile = Boolean(user) && user.id === player.id;
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url);
  const [photoSaved, setPhotoSaved] = useState(false);

  const wins = games.filter((g) => g.ownScore > g.oppScore).length;
  const losses = games.filter((g) => g.ownScore < g.oppScore).length;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to rankings"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Rankings
        </button>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-6">
        <div className="flex items-center gap-3">
          {isOwnProfile ? (
            <ProfilePhotoEditor
              avatarUrl={avatarUrl}
              onSaved={(url) => {
                setAvatarUrl(url);
                setPhotoSaved(true);
              }}
            />
          ) : (
            <PlayerAvatar src={avatarUrl} />
          )}
          <span className="min-w-0 flex-1 truncate text-lg font-bold">
            {player.display_name}
            {titles.length > 0 && (
              <span className="ml-1" aria-label={titles.map((e) => `${e.title} of ${e.tournament.name}`).join(", ")}>
                {titles.map((e) => (e.title === "queen" ? "👑" : "👸")).join("")}
              </span>
            )}
          </span>
          {player.tier && <RankBadge tier={player.tier} division={player.division} size={38} />}
        </div>

        {photoSaved && (
          <p role="status" className="m-0 text-sm font-semibold text-success">
            ✓ Profile photo updated
          </p>
        )}

        {player.elo_games_played > 0 && (
          <p className="m-0 text-sm text-muted">
            {player.elo_rating} Elo · {wins}W – {losses}L
          </p>
        )}

        {isAdmin && <AdminDetails profileId={player.id} />}

        {tournaments.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Tournaments</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {tournaments.map((e) => (
                <li key={e.id}>
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
            {games.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
