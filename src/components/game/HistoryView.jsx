import { Card } from "@heroui/react";

export default function HistoryView({ history }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 pt-3 pb-6">
      {history.length === 0 ? (
        <p className="p-6 text-center text-muted">No games saved yet. Finish a game to see it here.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {history.map((game) => (
            <li key={game.id}>
              <Card className="gap-1 p-3">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span className={`min-w-0 break-words ${game.a > game.b ? "text-success" : ""}`}>
                    {game.nameA}
                  </span>
                  <span className="flex-none text-lg [font-variant-numeric:tabular-nums]">
                    {game.a} – {game.b}
                  </span>
                  <span className={`min-w-0 break-words text-right ${game.b > game.a ? "text-success" : ""}`}>
                    {game.nameB}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {game.date} at {game.time}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
