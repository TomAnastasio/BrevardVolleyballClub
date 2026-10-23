import { useState } from "react";
import MenuCard from "../game/MenuCard.jsx";
import AddManualProfileView from "./AddManualProfileView.jsx";
import RecomputeEloView from "./RecomputeEloView.jsx";
import MergeProfilesView from "./MergeProfilesView.jsx";
import SignUpQrCodeView from "./SignUpQrCodeView.jsx";

const SCREEN_META = {
  menu: "Admin Panel",
  "signup-qr": "Sign-Up QR Code",
  "add-profile": "Add Manual Profile",
  "recompute-elo": "Recompute Elo Ratings",
  "merge-profiles": "Merge Profiles",
};

const BACK_MAP = { "signup-qr": "menu","add-profile": "menu", "recompute-elo": "menu", "merge-profiles": "menu" };

export default function AdminPanelView({ onBack }) {
  const [screen, setScreen] = useState("menu");
  const isMenu = screen === "menu";

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={() => (isMenu ? onBack() : setScreen(BACK_MAP[screen] || "menu"))}
          aria-label={isMenu ? "Back to main menu" : "Back to admin menu"}
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {isMenu ? "Menu" : "Back"}
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">
          {SCREEN_META[screen]}
        </h2>
      </header>

      {screen === "menu" && (
        <div className="flex flex-col gap-2 px-3 pb-6">
          <MenuCard
            icon="📱"
            label="Sign-Up QR Code"
            subtitle="Let a new player scan to sign up with Google"
            onClick={() => setScreen("signup-qr")}
          />
          <MenuCard
            icon="👤"
            label="Add Manual Profile"
            subtitle="Create a player profile without a Google account"
            onClick={() => setScreen("add-profile")}
          />
          <MenuCard
            icon="♻️"
            label="Recompute Elo Ratings"
            subtitle="Reset and replay every ranked game's rating from scratch"
            onClick={() => setScreen("recompute-elo")}
          />
          <MenuCard
            icon="🔗"
            label="Merge Profiles"
            subtitle="Combine a manual profile into its matching Google profile"
            onClick={() => setScreen("merge-profiles")}
          />
        </div>
      )}
      {screen === "signup-qr" && <SignUpQrCodeView />}
      {screen === "add-profile" && <AddManualProfileView onDone={() => setScreen("menu")} />}
      {screen === "recompute-elo" && <RecomputeEloView />}
      {screen === "merge-profiles" && <MergeProfilesView />}
    </main>
  );
}
