import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { TEAM_COLORS, DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../../lib/teamColors.js";
import { useAuth } from "../../hooks/useAuth.js";
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
// equal (case/whitespace-insensitive) are flagged — whether the match came
// from picking the same known player's name or just typing the same text by
// hand, in ranked or casual games alike.
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
// once a known player is selected, otherwise a bold "?" placeholder (when
// this field is part of the ranked player search) or nothing at all
// (casual/indoor, which have no search/avatars to show).
function PlayerAvatar({ src, showPlaceholder }) {
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
  if (showPlaceholder) {
    return (
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/10 bg-black text-base font-extrabold text-accent"
      >
        ?
      </span>
    );
  }
  return null;
}

function SideFields({
  label,
  color,
  otherColor,
  onColorChange,
  hideColors,
  isIndoor,
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
  name1IsSelf,
  enableSearch,
  directory,
  excludeIds1,
  excludeIds2,
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span aria-hidden="true" className="h-2 w-16 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex w-full flex-col gap-2">
        {isIndoor ? (
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
                <PlayerAvatar src={avatar1} showPlaceholder={enableSearch} />
                {enableSearch && !name1IsSelf ? (
                  <PlayerSearchField
                    value={name1}
                    onChange={onName1}
                    placeholder="Player 1 name"
                    ariaLabel={`${label}, player 1 name`}
                    directory={directory}
                    excludeIds={excludeIds1}
                    inputClassName={nameInputClass(error1)}
                  />
                ) : (
                  <input
                    type="text"
                    value={name1}
                    maxLength={24}
                    placeholder="Player 1 name"
                    aria-label={`${label}, player 1 name`}
                    onChange={(e) => onName1(e.target.value)}
                    className={nameInputClass(error1)}
                  />
                )}
              </div>
              {error1 && (
                <p role="alert" className="text-center text-xs font-semibold text-red-400">
                  Same name as another player — names must be unique.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PlayerAvatar src={avatar2} showPlaceholder={enableSearch} />
                {enableSearch ? (
                  <PlayerSearchField
                    value={name2}
                    onChange={onName2}
                    placeholder="Player 2 name"
                    ariaLabel={`${label}, player 2 name`}
                    directory={directory}
                    excludeIds={excludeIds2}
                    inputClassName={nameInputClass(error2)}
                  />
                ) : (
                  <input
                    type="text"
                    value={name2}
                    maxLength={24}
                    placeholder="Player 2 name"
                    aria-label={`${label}, player 2 name`}
                    onChange={(e) => onName2(e.target.value)}
                    className={nameInputClass(error2)}
                  />
                )}
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

export default function NewGameForm({ format, mode, onStart, editing = false, initialGame = null, onSave }) {
  const isIndoor = format === "indoor";
  const { user } = useAuth();
  // Signed-in players get the self-prefill + known-player search in both
  // ranked and casual beach games (casual still works fully anonymously if
  // not signed in — it never requires an account). Indoor is untouched.
  // An admin editing a past game never gets the "this is me" self-prefill —
  // A1 is just another searchable slot, pre-filled from the game's current
  // data instead (see initialGame below).
  const prefillSelf = !isIndoor && !editing && Boolean(user);
  const selfName = prefillSelf ? user.user_metadata?.full_name || user.user_metadata?.name || "" : "";
  const selfAvatar = prefillSelf ? user.user_metadata?.avatar_url || user.user_metadata?.picture || null : null;
  // Indoor has no free-text fallback left — every player must come from the
  // directory, ranked or casual, signed in or not (ranked's sign-in
  // requirement is already gated a screen earlier, in GameTrackingShell).
  // Editing always searches too, regardless of format/mode — every slot an
  // admin edit touches must resolve to a real profile (see
  // requireLinkedPlayers below).
  const enableSearch = isIndoor || editing || Boolean(user);
  const directory = usePlayerDirectory(enableSearch);

  const [nameA1, setNameA1] = useState(editing ? initialGame?.a1?.name ?? "" : selfName);
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

  const selfId = user?.id ?? null;
  // A1's "own" id for exclusion purposes: the signed-in submitter when
  // creating a game, or whichever profile A1 is currently/newly set to when
  // editing one (A1 is a pickable slot in edit mode, not an implicit self).
  const a1ExcludeId = editing ? playerIdA1 : selfId;

  // Applies to beach only (indoor has team names, not individual players) —
  // and to every player field regardless of mode or whether its name came
  // from a profile pick or was just typed, per the user's ask.
  const duplicateNameKeys = isIndoor
    ? new Set()
    : findDuplicateNameKeys({ a1: nameA1, a2: nameA2, b1: nameB1, b2: nameB2 });
  const hasDuplicateNames = duplicateNameKeys.size > 0;

  // Ranked beach games require every participant to be a known profile (not
  // free-typed) so Elo has something real to attach a rating to. Casual and
  // indoor are unaffected (indoor already requires every player to come from
  // the directory, regardless of mode). An admin edit always requires linked
  // profiles too — the edit RPCs only accept real profile ids, no free text.
  const requireLinkedPlayers = !isIndoor && (editing || mode === "ranked");
  const hasUnlinkedPlayers =
    requireLinkedPlayers && ((editing && !playerIdA1) || !playerIdA2 || !playerIdB1 || !playerIdB2);

  const hasUndersizedRoster =
    isIndoor && (teamAPlayers.length < MIN_ROSTER_SIZE || teamBPlayers.length < MIN_ROSTER_SIZE);

  function handleStart() {
    if (isIndoor) {
      if (hasUndersizedRoster) return;
      onStart({
        format: "indoor",
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
        playerIdA2,
        playerIdB1,
        playerIdB2,
        colorA,
        colorB,
      });
    }
  }

  function handleSave() {
    if (isIndoor) {
      if (hasUndersizedRoster) return;
      onSave({ format: "indoor", teamAPlayers, teamBPlayers });
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
          hideColors={editing}
          isIndoor={isIndoor}
          roster={teamAPlayers}
          onAddPlayer={addPlayerA}
          onRemovePlayer={removePlayerA}
          rosterExcludeIds={[...teamAPlayers, ...teamBPlayers].map((p) => p.id)}
          name1={nameA1}
          onName1={editing ? handleNameA1 : setNameA1}
          name2={nameA2}
          onName2={handleNameA2}
          avatar1={editing ? avatarA1 : selfAvatar}
          avatar2={avatarA2}
          error1={duplicateNameKeys.has("a1")}
          error2={duplicateNameKeys.has("a2")}
          name1IsSelf={prefillSelf}
          enableSearch={enableSearch}
          directory={directory}
          excludeIds1={[playerIdA2, playerIdB1, playerIdB2].filter(Boolean)}
          excludeIds2={[a1ExcludeId, playerIdB1, playerIdB2].filter(Boolean)}
        />
        <SideFields
          label="Second side"
          color={colorB}
          otherColor={colorA}
          onColorChange={setColorB}
          hideColors={editing}
          isIndoor={isIndoor}
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
          enableSearch={enableSearch}
          directory={directory}
          excludeIds1={[a1ExcludeId, playerIdA2, playerIdB2].filter(Boolean)}
          excludeIds2={[a1ExcludeId, playerIdA2, playerIdB1].filter(Boolean)}
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
            {editing
              ? "Every player must be picked from search — they need to have signed in at least once."
              : "Every player must be picked from search to start a ranked game — they need to have signed in at least once."}
          </p>
        )}
        {isIndoor && hasUndersizedRoster && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            Each side needs at least {MIN_ROSTER_SIZE} players{editing ? "." : " to start."}
          </p>
        )}
        <Button
          variant="primary"
          onPress={editing ? handleSave : handleStart}
          isDisabled={hasDuplicateNames || hasUnlinkedPlayers || hasUndersizedRoster}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {editing ? "Save Changes" : "Start Game"}
        </Button>
      </div>
    </div>
  );
}
