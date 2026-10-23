import { useState, useSyncExternalStore } from "react";
import SplashScreen from "./components/SplashScreen.jsx";
import LandingView from "./components/LandingView.jsx";
import PlayTodayView from "./components/PlayTodayView.jsx";
import LeaderboardView from "./components/LeaderboardView.jsx";
import PlayerProfileView from "./components/PlayerProfileView.jsx";
import PlayerProfileById from "./components/PlayerProfileById.jsx";
import MyProfileView from "./components/MyProfileView.jsx";
import GameDetailView from "./components/GameDetailView.jsx";
import EditGamePage from "./components/game/EditGamePage.jsx";
import GameTrackingShell from "./components/game/GameTrackingShell.jsx";
import WelcomeView from "./components/WelcomeView.jsx";
import AdminPanelView from "./components/admin/AdminPanelView.jsx";
import TournamentsShell from "./components/tournament/TournamentsShell.jsx";
import VersionBadge from "./components/VersionBadge.jsx";
import HalloweenDecor from "./themes/halloween/HalloweenDecor.jsx";
import { activeTheme } from "./themes/activeTheme.js";
import { letterPhotoChecksVersion, subscribeLetterPhotoChecks } from "./themes/halloween/googleLetterPhotos.js";
import { AuthProvider } from "./hooks/AuthContext.jsx";
import { hasPendingGameTracking } from "./lib/pendingGameTracking.js";

let nextPageKey = 1;

export default function App({ joinRequested, justJoined, tournamentId, myProfileRequested }) {
  // A sign-up QR scan skips the splash so the visitor goes straight to Google.
  const [appReady, setAppReady] = useState(joinRequested);
  // The Google OAuth sign-in redirect reloads the page from scratch, which
  // would otherwise always reset to "landing". Jump straight back into game
  // tracking so a signed-in user lands right back where they asked to sign
  // in from, instead of having to re-navigate from the top.
  const [view, setView] = useState(() => {
    if (joinRequested || justJoined) return "welcome";
    if (tournamentId) return "tournaments";
    if (myProfileRequested) return "my-profile";
    return hasPendingGameTracking() ? "game" : "landing";
  });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  // Redraw once a Google letter-circle "photo" is spotted, so it turns into
  // a Halloween monster (themes/halloween/googleLetterPhotos.js).
  useSyncExternalStore(subscribeLetterPhotoChecks, letterPhotoChecksVersion);
  // Only the first visit to Tournaments opens the linked tournament directly.
  const [linkedTournamentId, setLinkedTournamentId] = useState(tournamentId);

  // Game details, profiles opened from a game, and Edit Game open as pages
  // stacked on top of the current view, which stays mounted (just hidden)
  // underneath. So Back always returns exactly where you were, e.g. Past
  // Games -> game -> player -> one of their games -> Back, Back, Back.
  const [pages, setPages] = useState([]);
  // Bumped after an admin edits or deletes a game, so lists showing games
  // (Past Games, profiles, game details) refetch.
  const [gamesVersion, setGamesVersion] = useState(0);
  const topPage = pages[pages.length - 1];

  function pushPage(page) {
    const scrollY = window.scrollY;
    setPages((prev) => [...prev, { ...page, key: nextPageKey++, scrollY }]);
    window.scrollTo(0, 0);
  }

  function popPages(count = 1) {
    const restoreTo = pages[pages.length - count]?.scrollY ?? 0;
    setPages((prev) => prev.slice(0, Math.max(0, prev.length - count)));
    requestAnimationFrame(() => window.scrollTo(0, restoreTo));
  }

  const openGame = (gameId) => pushPage({ type: "game", gameId });
  const openPlayer = (playerId) => pushPage({ type: "player", playerId });

  // A tournament game's 👑 tag (Past Games, profiles, game details) opens that tournament.
  function openTournament(id) {
    setPages([]);
    setLinkedTournamentId(id);
    setView("tournaments");
  }

  return (
    <AuthProvider>
      {!joinRequested && <SplashScreen onReveal={() => setAppReady(true)} />}
      {appReady && (
        <div data-app-shell className="flex min-h-dvh flex-col bg-background text-foreground [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif]">
          <VersionBadge />
          {activeTheme === "halloween" && <HalloweenDecor />}
          <div className={topPage ? "hidden" : "contents"}>
            {view === "landing" && (
              <LandingView
                onPlayToday={() => setView("play")}
                onGameTracking={() => setView("game")}
                onLeaderboard={() => setView("leaderboard")}
                onTournaments={() => setView("tournaments")}
                onAdminPanel={() => setView("admin")}
                onMyProfile={() => setView("my-profile")}
              />
            )}
            {view === "my-profile" && (
              <MyProfileView
                onBack={() => setView("landing")}
                refreshKey={gamesVersion}
                onOpenGame={openGame}
                onOpenPlayer={openPlayer}
                onOpenTournament={openTournament}
              />
            )}
            {view === "welcome" && (
              <WelcomeView
                joinRequested={joinRequested}
                onProfileReady={(player) => {
                  setSelectedPlayer(player);
                  setView("profile");
                }}
                onRankings={() => setView("leaderboard")}
                onHome={() => setView("landing")}
              />
            )}
            {view === "play" && <PlayTodayView onBack={() => setView("landing")} />}
            {view === "leaderboard" && (
              <LeaderboardView
                onBack={() => setView("landing")}
                onSelectPlayer={(player) => {
                  setSelectedPlayer(player);
                  setView("profile");
                }}
              />
            )}
            {view === "profile" && selectedPlayer && (
              <PlayerProfileView
                player={selectedPlayer}
                onBack={() => setView("leaderboard")}
                refreshKey={gamesVersion}
                onOpenGame={openGame}
                onOpenPlayer={openPlayer}
                onOpenTournament={openTournament}
              />
            )}
            {view === "game" && (
              <GameTrackingShell
                onBack={() => setView("landing")}
                onOpenGame={openGame}
                onOpenTournament={openTournament}
                gamesVersion={gamesVersion}
              />
            )}
            {view === "admin" && <AdminPanelView onBack={() => setView("landing")} />}
            {view === "tournaments" && (
              <TournamentsShell
                initialTournamentId={linkedTournamentId}
                onBack={() => {
                  setLinkedTournamentId(null);
                  setView("landing");
                }}
              />
            )}
          </div>

          {topPage?.type === "game" && (
            <GameDetailView
              key={topPage.key}
              gameId={topPage.gameId}
              refreshKey={gamesVersion}
              onBack={() => popPages()}
              onOpenPlayer={openPlayer}
              onOpenTournament={openTournament}
              onEdit={(gameId) => pushPage({ type: "edit", gameId })}
            />
          )}
          {topPage?.type === "player" && (
            <PlayerProfileById
              key={topPage.key}
              playerId={topPage.playerId}
              onBack={() => popPages()}
              refreshKey={gamesVersion}
              onOpenGame={openGame}
              onOpenPlayer={openPlayer}
              onOpenTournament={openTournament}
            />
          )}
          {topPage?.type === "edit" && (
            <EditGamePage
              key={topPage.key}
              gameId={topPage.gameId}
              onBack={() => popPages()}
              onSaved={() => {
                setGamesVersion((v) => v + 1);
                popPages();
              }}
              // The game is gone, so skip its details page too.
              onDeleted={() => {
                setGamesVersion((v) => v + 1);
                popPages(2);
              }}
            />
          )}
        </div>
      )}
    </AuthProvider>
  );
}
