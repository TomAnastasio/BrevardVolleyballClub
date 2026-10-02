import { useEffect, useId, useMemo, useState } from "react";
import { fuzzyFilter } from "../../lib/fuzzyMatch.js";

// Chip-thumbnail broken-image fallback, mirroring the local PlayerAvatar
// helper in NewGameForm.jsx and the dropdown-row handling in
// PlayerSearchField.jsx — small inline helper per file is this codebase's
// established style for this, not a shared abstraction.
function ChipAvatar({ src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setBroken(true)}
        className="h-7 w-7 flex-none rounded-full border border-white/10 object-cover"
      />
    );
  }
  return <span aria-hidden="true" className="h-7 w-7 flex-none rounded-full bg-white/10" />;
}

function DropdownAvatar({ src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setBroken(true)}
        className="h-6 w-6 flex-none rounded-full border border-white/10 object-cover"
      />
    );
  }
  return <span aria-hidden="true" className="h-6 w-6 flex-none rounded-full bg-white/10" />;
}

const MAX_ROSTER_SIZE = 15;

// Multi-select sibling of PlayerSearchField: same fuzzy-matched dropdown
// pattern, but picking a suggestion adds a removable chip to a roster list
// instead of filling a single text field.
export default function TeamRosterPicker({ label, roster, onAdd, onRemove, directory, excludeIds }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const candidates = useMemo(
    () => directory.filter((p) => !excludeIds.includes(p.id)),
    [directory, excludeIds],
  );
  const matches = useMemo(() => fuzzyFilter(query, candidates, (p) => p.display_name), [query, candidates]);
  const atCap = roster.length >= MAX_ROSTER_SIZE;
  const showDropdown = isOpen && !atCap && matches.length > 0;

  function handleSelect(player) {
    onAdd({ id: player.id, name: player.display_name, avatarUrl: player.avatar_url || null });
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative w-full">
        <input
          type="text"
          value={query}
          placeholder={atCap ? `Max ${MAX_ROSTER_SIZE} players` : "Search players…"}
          aria-label={`${label}, search players`}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={atCap}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        />
        {showDropdown && (
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-background shadow-lg"
          >
            {matches.map((player) => (
              <li key={player.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(player)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-white/10"
                >
                  <DropdownAvatar src={player.avatar_url} />
                  {player.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs font-semibold text-muted">
        {roster.length} {roster.length === 1 ? "player" : "players"} — ~8 is typical
      </p>

      {roster.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2">
          {roster.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2"
            >
              <ChipAvatar src={p.avatarUrl} />
              <span className="max-w-[8rem] truncate text-sm font-semibold">{p.name}</span>
              <button
                type="button"
                aria-label={`Remove ${p.name} from ${label}`}
                onClick={() => onRemove(p.id)}
                className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-foreground"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { MAX_ROSTER_SIZE };
