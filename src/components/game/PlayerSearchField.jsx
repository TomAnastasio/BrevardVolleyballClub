import { useId, useMemo, useState } from "react";
import { fuzzyFilter } from "../../lib/fuzzyMatch.js";

// Free-text name input with a fuzzy-matched dropdown of known players
// (accounts that have signed in at least once) layered on top. Selecting a
// suggestion fills the name field and reports that player's avatar back via
// onChange's second argument, so the caller can show it the same way the
// signed-in submitter's own avatar is shown. It's still plain text
// underneath, matching every other player-name field in the app (see
// TODO.md item 6: "every participant must have a known profile" is a
// still-open rule this doesn't enforce, it just makes picking a known name
// easier).
export default function PlayerSearchField({ value, onChange, placeholder, ariaLabel, directory, excludeId, inputClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const candidates = useMemo(
    () => (excludeId ? directory.filter((p) => p.id !== excludeId) : directory),
    [directory, excludeId],
  );
  const matches = useMemo(() => fuzzyFilter(value, candidates, (p) => p.display_name), [value, candidates]);
  const showDropdown = isOpen && matches.length > 0;

  function handleSelect(player) {
    onChange(player.display_name, player.avatar_url || null);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        maxLength={24}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value, null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        className={inputClassName}
      />
      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${ariaLabel} suggestions`}
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
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt=""
                    aria-hidden="true"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="h-6 w-6 flex-none rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="h-6 w-6 flex-none rounded-full bg-white/10" />
                )}
                {player.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
