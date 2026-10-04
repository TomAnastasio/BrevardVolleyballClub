import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { TEAM_COLORS, DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../../lib/teamColors.js";
import { usePlayerDirectory } from "../../hooks/usePlayerDirectory.js";
import PlayerSearchField from "./PlayerSearchField.jsx";
import TeamRosterPicker from "./TeamRosterPicker.jsx";

const MIN_ROSTER_SIZE = 4;

function ColorSwatchPicker({ label, selected, disabledColor, onSelect }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap justify-center gap-2">
      {TEAM_COLORS.map((c) => {
        const isSelected = c.hex === selected;
        const isTaken = c.hex === disabledColor;
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={isTaken ? `${c.hex}, already used by the other side` : c.hex}
            disabled={isTaken}
            onClick={() => onSelect(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={`h-9 w-9 flex-none rounded-full border-2 transition-transform ${
              isSelected ? "scale-110 border-white" : "border-transparent"
            } ${isTaken ? "cursor-not-allowed opacity-30" : "cursor-pointer active:scale-95"}`}
          />
        );
      })}
    </div>
  );
}

function nameInputClass(hasError) {
  const base =
    "w-full rounded-lg border px-3 py-2 text-center text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-offset-2";
  return hasError
    ? `${base} border-red-500 bg-red-500/10 focus-visible:outline-red-500`
    : `${base} border-white/10 bg-white/5 focus-visible:outline-accent`;
}

function normalizeName(text) {
  return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Any two (or more) of the 4 beach player-name fields that are non-empty and
// equal (case/whitespace-insensitive) are flagged — e.g. two different
// profiles that happen to share a display name, in ranked or casual games
// alike. Picking the same profile twice is already prevented by each
// field's excludeIds.
function findDuplicateNameKeys(names) {
  const byNormalized = new Map();
  for (const [key, value] of Object.entries(names)) {
    const normalized = normalizeName(value);
    if (!normalized) continue;
    const keys = byNormalized.get(normalized) || [];
    keys.push(key);
    byNormalized.set(normalized, keys);
  }
  const duplicateKeys = new Set();
  for (const keys of byNormalized.values()) {
    if (keys.length > 1) keys.forEach((key) => duplicateKeys.add(key));
  }
  return duplicateKeys;
}

// Reserves the same fixed-width slot whether a player is picked yet or not,
// so the name field next to it never shifts width/position: an actual photo
// once a known player is selected, otherwise a bold "?" placeholder.
function PlayerAvatar({ src }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setBroken(true)}
        className="h-9 w-9 flex-none rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/10 bg-black text-base font-extrabold text-accent"
    >
      ?
    </span>
  );
}

function SideFields({
  label,
  color,
  otherColor,
  onColorChange,
  hideColors,
  useRosterPicker,
  roster,
  onAddPlayer,
  onRemovePlayer,
  rosterExcludeIds,
  name1,
  onName1,
  name2,
  onName2,
  avatar1,
  avatar2,
  error1,
  error2,
  directory,
  excludeIds1,
  excludeIds2,
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span aria-hidden="true" className="h-2 w-16 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex w-full flex-col gap-2">
        {useRosterPicker ? (
          <TeamRosterPicker
            label={label}
            roster={roster}
            onAdd={onAddPlayer}
            onRemove={onRemovePlayer}
            directory={directory}
            excludeIds={rosterExcludeIds}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PlayerAvatar src={avatar1} />
                <PlayerSearchField
                  value={name1}
                  onChange={onName1}
                  placeholder="Player 1 name"
                  ariaLabel={`${label}, player 1 name`}
                  directory={directory}
                  excludeIds={excludeIds1}
                  inputClassName={nameInputClass(error1)}
                />
              </div>
              {error1 && (
                <p role="alert" className="text-center text-xs font-semibold text-red-400">
                  Same name as another player — names must be unique.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PlayerAvatar src={avatar2} />
                <PlayerSearchField
                  value={name2}
                  onChange={onName2}
                  placeholder="Player 2 name"
                  ariaLabel={`${label}, player 2 name`}
                  directory={directory}
                  excludeIds={excludeIds2}
                  inputClassName={nameInputClass(error2)}
                />
              </div>
              {error2 && (
                <p role="alert" className="text-center text-xs font-semibold text-red-400">
                  Same name as another player — names must be unique.
                </p>
              )}
            </div>
          </>
        )}
      </div>
      {!hideColors && (
        <ColorSwatchPicker label={`${label} color`} selected={color} disabledColor={otherColor} onSelect={onColorChange} />
      )}
    </div>
  );
}

export default function NewGameForm({
  format,
  teamSize = null,
  onStart,
  editing = false,
  initialGame = null,
  onSave,
  loggingPast = false,
}) {
  const isIndoor = format === "indoor";
  // "Squad" beach (3v3/4v4) reuses indoor's roster-picker UI and variable-
  // roster state wholesale instead of beach's fixed a1/a2/b1/b2 fields — see
  // migration 20261004150000. 2v2 beach (teamSize null) keeps the original
  // fixed-field path below untouched.
  const usesRoster = isIndoor || teamSize != null;
  // Beach now matches indoor: every player, on both sides, ranked or
  // casual, always comes from the real player directory — no free-typed
  // guest names and no self-prefill of the submitter into A1. "editing" and
  // "loggingPast" only still matter for things unrelated to player
  // selection (hiding colors, which button/callback to use).
  const isPastOrEdit = editing || loggingPast;
  const directory = usePlayerDirectory(true);

  const [nameA1, setNameA1] = useState(editing ? initialGame?.a1?.name ?? "" : "");
  const [nameA2, setNameA2] = useState(editing ? initialGame?.a2?.name ?? "" : "");
  const [nameB1, setNameB1] = useState(editing ? initialGame?.b1?.name ?? "" : "");
  const [nameB2, setNameB2] = useState(editing ? initialGame?.b2?.name ?? "" : "");
  const [avatarA1, setAvatarA1] = useState(editing ? initialGame?.a1?.avatarUrl ?? null : null);
  const [avatarA2, setAvatarA2] = useState(editing ? initialGame?.a2?.avatarUrl ?? null : null);
  const [avatarB1, setAvatarB1] = useState(editing ? initialGame?.b1?.avatarUrl ?? null : null);
  const [avatarB2, setAvatarB2] = useState(editing ? initialGame?.b2?.avatarUrl ?? null : null);
  const [playerIdA1, setPlayerIdA1] = useState(editing ? initialGame?.a1?.userId ?? null : null);
  const [playerIdA2, setPlayerIdA2] = useState(editing ? initialGame?.a2?.userId ?? null : null);
  const [playerIdB1, setPlayerIdB1] = useState(editing ? initialGame?.b1?.userId ?? null : null);
  const [playerIdB2, setPlayerIdB2] = useState(editing ? initialGame?.b2?.userId ?? null : null);
  const [teamAPlayers, setTeamAPlayers] = useState(editing ? initialGame?.teamAPlayers ?? [] : []);
  const [teamBPlayers, setTeamBPlayers] = useState(editing ? initialGame?.teamBPlayers ?? [] : []);
  const [colorA, setColorA] = useState(DEFAULT_COLOR_A);
  const [colorB, setColorB] = useState(DEFAULT_COLOR_B);

  function addPlayerA(player) {
    setTeamAPlayers((prev) => [...prev, player]);
  }
  function removePlayerA(id) {
    setTeamAPlayers((prev) => prev.filter((p) => p.id !== id));
  }
  function addPlayerB(player) {
    setTeamBPlayers((prev) => [...prev, player]);
  }
  function removePlayerB(id) {
    setTeamBPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  // Selecting a search suggestion fills the name, its avatar, and the
  // underlying profile id; editing the text afterward un-selects it (avatar
  // and id both clear), since neither one is still guaranteed to match.
  // Tracking the id (not just the displayed name) is what lets the other
  // fields exclude an already-picked player from their own suggestions —
  // the same profile should never end up filling more than one player slot.
  function handleNameA1(value, avatarUrl = null, playerId = null) {
    setNameA1(value);
    setAvatarA1(avatarUrl);
    setPlayerIdA1(playerId);
  }
  function handleNameA2(value, avatarUrl = null, playerId = null) {
    setNameA2(value);
    setAvatarA2(avatarUrl);
    setPlayerIdA2(playerId);
  }
  function handleNameB1(value, avatarUrl = null, playerId = null) {
    setNameB1(value);
    setAvatarB1(avatarUrl);
    setPlayerIdB1(playerId);
  }
  function handleNameB2(value, avatarUrl = null, playerId = null) {
    setNameB2(value);
    setAvatarB2(avatarUrl);
    setPlayerIdB2(playerId);
  }

  // Applies to the fixed-field beach path only (roster-based formats have
  // team names, not individual free-typed fields) — and to every player
  // field regardless of mode or whether its name came from a profile pick
  // or was just typed, per the user's ask.
  const duplicateNameKeys = usesRoster
    ? new Set()
    : findDuplicateNameKeys({ a1: nameA1, a2: nameA2, b1: nameB1, b2: nameB2 });
  const hasDuplicateNames = duplicateNameKeys.size > 0;

  // Every beach player in the fixed-field path — all 4 slots, ranked or
  // casual, live or editing/logging-past — must be a known profile, not
  // free-typed: Elo needs something real to attach a rating to, and the
  // admin RPCs (edit, and the past-game-logging insert's A1 fixup) only
  // accept real profile ids anyway. Roster-based formats (indoor, squad
  // beach) already only allow picking real profiles via TeamRosterPicker.
  const requireLinkedPlayers = !usesRoster;
  const hasUnlinkedPlayers =
    requireLinkedPlayers && (!playerIdA1 || !playerIdA2 || !playerIdB1 || !playerIdB2);

  const hasUndersizedRoster =
    usesRoster &&
    (isIndoor
      ? teamAPlayers.length < MIN_ROSTER_SIZE || teamBPlayers.length < MIN_ROSTER_SIZE
      : teamAPlayers.length !== teamSize || teamBPlayers.length !== teamSize);

  function handleStart() {
    if (usesRoster) {
      if (hasUndersizedRoster) return;
      onStart({
        format: isIndoor ? "indoor" : "beach",
        teamSize: isIndoor ? undefined : teamSize,
        teamAPlayers,
        teamBPlayers,
        colorA,
        colorB,
      });
    } else {
      if (hasDuplicateNames || hasUnlinkedPlayers) return;
      onStart({
        format: "beach",
        nameA1: sanitizeName(nameA1, "Player 1"),
        nameA2: sanitizeName(nameA2, "Player 2"),
        nameB1: sanitizeName(nameB1, "Player 1"),
        nameB2: sanitizeName(nameB2, "Player 2"),
        playerIdA1,
        playerIdA2,
        playerIdB1,
        playerIdB2,
        colorA,
        colorB,
      });
    }
  }

  function handleSave() {
    if (usesRoster) {
      if (hasUndersizedRoster) return;
      onSave({
        format: isIndoor ? "indoor" : "beach",
        teamSize: isIndoor ? undefined : teamSize,
        teamAPlayers,
        teamBPlayers,
      });
    } else {
      if (hasDuplicateNames || hasUnlinkedPlayers) return;
      onSave({ format: "beach", a1: playerIdA1, a2: playerIdA2, b1: playerIdB1, b2: playerIdB2 });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SideFields
          label="First side"
          color={colorA}
          otherColor={colorB}
          onColorChange={setColorA}
          hideColors={isPastOrEdit}
          useRosterPicker={usesRoster}
          roster={teamAPlayers}
          onAddPlayer={addPlayerA}
          onRemovePlayer={removePlayerA}
          rosterExcludeIds={[...teamAPlayers, ...teamBPlayers].map((p) => p.id)}
          name1={nameA1}
          onName1={handleNameA1}
          name2={nameA2}
          onName2={handleNameA2}
          avatar1={avatarA1}
          avatar2={avatarA2}
          error1={duplicateNameKeys.has("a1")}
          error2={duplicateNameKeys.has("a2")}
          directory={directory}
          excludeIds1={[playerIdA2, playerIdB1, playerIdB2].filter(Boolean)}
          excludeIds2={[playerIdA1, playerIdB1, playerIdB2].filter(Boolean)}
        />
        <SideFields
          label="Second side"
          color={colorB}
          otherColor={colorA}
          onColorChange={setColorB}
          hideColors={isPastOrEdit}
          useRosterPicker={usesRoster}
          roster={teamBPlayers}
          onAddPlayer={addPlayerB}
          onRemovePlayer={removePlayerB}
          rosterExcludeIds={[...teamAPlayers, ...teamBPlayers].map((p) => p.id)}
          name1={nameB1}
          onName1={handleNameB1}
          name2={nameB2}
          onName2={handleNameB2}
          avatar1={avatarB1}
          avatar2={avatarB2}
          error1={duplicateNameKeys.has("b1")}
          error2={duplicateNameKeys.has("b2")}
          directory={directory}
          excludeIds1={[playerIdA1, playerIdA2, playerIdB2].filter(Boolean)}
          excludeIds2={[playerIdA1, playerIdA2, playerIdB1].filter(Boolean)}
        />
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        {hasDuplicateNames && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            Fix the duplicate player name(s) above before starting.
          </p>
        )}
        {!hasDuplicateNames && hasUnlinkedPlayers && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            Every player must be picked from search — they need to have signed in at least once.
          </p>
        )}
        {usesRoster && hasUndersizedRoster && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            {isIndoor
              ? `Each side needs at least ${MIN_ROSTER_SIZE} players`
              : `Each side needs exactly ${teamSize} players`}
            {isPastOrEdit ? "." : " to start."}
          </p>
        )}
        <Button
          variant="primary"
          onPress={editing ? handleSave : handleStart}
          isDisabled={hasDuplicateNames || hasUnlinkedPlayers || hasUndersizedRoster}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {editing ? "Save Changes" : loggingPast ? "Add Score" : "Start Game"}
        </Button>
      </div>
    </div>
  );
}
