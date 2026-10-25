import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useBackLayer } from "../../hooks/useBackLayer.js";
import { setTournamentParam } from "../../lib/tournamentLink.js";
import TournamentListView from "./TournamentListView.jsx";
import TournamentView from "./TournamentView.jsx";
import TournamentScoreScreen from "./TournamentScoreScreen.jsx";
import TournamentDetailsForm from "./admin/TournamentDetailsForm.jsx";
import TournamentManageView from "./admin/TournamentManageView.jsx";

// Screens: list -> view (public live page) -> score (one game), plus the
// admin-only new/manage screens. The open tournament's id is mirrored into
// the address bar (?t=<id>) so the page can be reloaded or shared as-is.
export default function TournamentsShell({ initialTournamentId, onBack }) {
  const { isAdmin } = useAuth();
  const [screen, setScreen] = useState(initialTournamentId ? "view" : "list");
  const [tournamentId, setTournamentId] = useState(initialTournamentId || null);
  const [matchId, setMatchId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setTournamentParam(screen === "list" || screen === "new" ? null : tournamentId);
  }, [screen, tournamentId]);

  useEffect(() => () => setTournamentParam(null), []);

  function openTournament(id) {
    setTournamentId(id);
    setNotice("");
    setScreen("view");
  }

  const titles = {
    list: "Tournaments",
    view: "Tournament",
    score: "Keep Score",
    new: "New Tournament",
    manage: "Manage Tournament",
  };

  function goBack() {
    if (screen === "list") onBack();
    else if (screen === "view" || screen === "new") setScreen("list");
    else setScreen("view");
  }
  // The phone's Back walks the same path: Keep Score / Manage -> the
  // tournament -> the list (src/lib/backNavigation.js).
  useBackLayer(1, screen === "list" ? 0 : screen === "view" || screen === "new" ? 1 : 2, goBack);

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label={screen === "list" ? "Back to main menu" : "Back"}
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {screen === "list" ? "Menu" : "Back"}
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">{titles[screen]}</h2>
      </header>

      {screen === "list" && (
        <TournamentListView isAdmin={isAdmin} onOpen={openTournament} onCreate={() => setScreen("new")} />
      )}
      {screen === "new" && isAdmin && (
        <TournamentDetailsForm
          onSaved={(t) => {
            setTournamentId(t.id);
            setScreen("manage");
          }}
        />
      )}
      {screen === "view" && tournamentId && (
        <TournamentView
          tournamentId={tournamentId}
          notice={notice}
          onDismissNotice={() => setNotice("")}
          onScoreMatch={(id) => {
            setMatchId(id);
            setScreen("score");
          }}
          onManage={() => setScreen("manage")}
        />
      )}
      {screen === "score" && tournamentId && matchId && (
        <TournamentScoreScreen
          tournamentId={tournamentId}
          matchId={matchId}
          onDone={(message) => {
            setNotice(message || "");
            setScreen("view");
          }}
        />
      )}
      {screen === "manage" && tournamentId && isAdmin && (
        <TournamentManageView
          tournamentId={tournamentId}
          onDeleted={() => {
            setTournamentId(null);
            setScreen("list");
          }}
        />
      )}
    </main>
  );
}
