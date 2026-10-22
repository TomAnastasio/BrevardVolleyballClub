import { Button } from "@heroui/react";
import LoadingMeteor from "../LoadingMeteor.jsx";
import MenuCard from "../game/MenuCard.jsx";
import { useTournamentList } from "../../hooks/useTournament.js";
import { formatEventDate, STATUS_LABELS } from "./tournamentFormat.js";

const STATUS_ICONS = { draft: "📝", published: "📋", live: "🔴", complete: "👑" };

export default function TournamentListView({ isAdmin, onOpen, onCreate }) {
  const { tournaments, loading } = useTournamentList();

  return (
    <div className="flex flex-col gap-2 px-3 pb-6">
      {isAdmin && (
        <Button variant="primary" onPress={onCreate} className="mb-2 min-h-12 w-full font-extrabold">
          + New tournament
        </Button>
      )}
      {loading ? (
        <div className="flex flex-col items-center gap-3 p-6">
          <LoadingMeteor />
          <p className="m-0 text-center text-muted">Loading tournaments…</p>
        </div>
      ) : tournaments.length === 0 ? (
        <p className="p-6 text-center text-muted">No tournaments yet. Check back soon!</p>
      ) : (
        tournaments.map((t) => (
          <MenuCard
            key={t.id}
            icon={STATUS_ICONS[t.status]}
            label={t.name}
            subtitle={`${formatEventDate(t.event_date)} · ${STATUS_LABELS[t.status]}`}
            onClick={() => onOpen(t.id)}
          />
        ))
      )}
    </div>
  );
}
