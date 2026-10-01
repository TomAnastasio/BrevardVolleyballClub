import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { TEAM_COLORS, DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../../lib/teamColors.js";
import { useAuth } from "../../hooks/useAuth.js";
import { usePlayerDirectory } from "../../hooks/usePlayerDirectory.js";
import PlayerSearchField from "./PlayerSearchField.jsx";

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

function nameInputClass() {
  return "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2";
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
  isIndoor,
  teamName,
  onTeamName,
  name1,
  onName1,
  name2,
  onName2,
  avatar1,
  avatar2,
  name1IsSelf,
  enableSearch,
  directory,
  excludeId,
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span aria-hidden="true" className="h-2 w-16 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex w-full flex-col gap-2">
        {isIndoor ? (
          <input
            type="text"
            value={teamName}
            maxLength={24}
            placeholder="Team name"
            aria-label={`${label}, team name`}
            onChange={(e) => onTeamName(e.target.value)}
            className={nameInputClass()}
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <PlayerAvatar src={avatar1} showPlaceholder={enableSearch} />
              {enableSearch && !name1IsSelf ? (
                <PlayerSearchField
                  value={name1}
                  onChange={onName1}
                  placeholder="Player 1 name"
                  ariaLabel={`${label}, player 1 name`}
                  directory={directory}
                  excludeId={excludeId}
                  inputClassName={nameInputClass()}
                />
              ) : (
                <input
                  type="text"
                  value={name1}
                  maxLength={24}
                  placeholder="Player 1 name"
                  aria-label={`${label}, player 1 name`}
                  onChange={(e) => onName1(e.target.value)}
                  className={nameInputClass()}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <PlayerAvatar src={avatar2} showPlaceholder={enableSearch} />
              {enableSearch ? (
                <PlayerSearchField
                  value={name2}
                  onChange={onName2}
                  placeholder="Player 2 name"
                  ariaLabel={`${label}, player 2 name`}
                  directory={directory}
                  excludeId={excludeId}
                  inputClassName={nameInputClass()}
                />
              ) : (
                <input
                  type="text"
                  value={name2}
                  maxLength={24}
                  placeholder="Player 2 name"
                  aria-label={`${label}, player 2 name`}
                  onChange={(e) => onName2(e.target.value)}
                  className={nameInputClass()}
                />
              )}
            </div>
          </>
        )}
      </div>
      <ColorSwatchPicker label={`${label} color`} selected={color} disabledColor={otherColor} onSelect={onColorChange} />
    </div>
  );
}

export default function NewGameForm({ format, mode, onStart }) {
  const isIndoor = format === "indoor";
  const { user } = useAuth();
  const prefillSelf = mode === "ranked" && !isIndoor && Boolean(user);
  const selfName = prefillSelf ? user.user_metadata?.full_name || user.user_metadata?.name || "" : "";
  const selfAvatar = prefillSelf ? user.user_metadata?.avatar_url || user.user_metadata?.picture || null : null;
  const enableSearch = mode === "ranked" && !isIndoor;
  const directory = usePlayerDirectory(enableSearch);

  const [nameA1, setNameA1] = useState(selfName);
  const [nameA2, setNameA2] = useState("");
  const [nameB1, setNameB1] = useState("");
  const [nameB2, setNameB2] = useState("");
  const [avatarA2, setAvatarA2] = useState(null);
  const [avatarB1, setAvatarB1] = useState(null);
  const [avatarB2, setAvatarB2] = useState(null);
  const [teamNameA, setTeamNameA] = useState("");
  const [teamNameB, setTeamNameB] = useState("");
  const [colorA, setColorA] = useState(DEFAULT_COLOR_A);
  const [colorB, setColorB] = useState(DEFAULT_COLOR_B);

  // Selecting a search suggestion fills both the name and its avatar;
  // editing the text afterward un-selects it, so the avatar (which would no
  // longer necessarily match) is cleared rather than left stale.
  function handleNameA2(value, avatarUrl = null) {
    setNameA2(value);
    setAvatarA2(avatarUrl);
  }
  function handleNameB1(value, avatarUrl = null) {
    setNameB1(value);
    setAvatarB1(avatarUrl);
  }
  function handleNameB2(value, avatarUrl = null) {
    setNameB2(value);
    setAvatarB2(avatarUrl);
  }

  function handleStart() {
    if (isIndoor) {
      onStart({
        format: "indoor",
        nameA: sanitizeName(teamNameA, "Team A"),
        nameB: sanitizeName(teamNameB, "Team B"),
        colorA,
        colorB,
      });
    } else {
      onStart({
        format: "beach",
        nameA1: sanitizeName(nameA1, "Player 1"),
        nameA2: sanitizeName(nameA2, "Player 2"),
        nameB1: sanitizeName(nameB1, "Player 1"),
        nameB2: sanitizeName(nameB2, "Player 2"),
        colorA,
        colorB,
      });
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
          isIndoor={isIndoor}
          teamName={teamNameA}
          onTeamName={setTeamNameA}
          name1={nameA1}
          onName1={setNameA1}
          name2={nameA2}
          onName2={handleNameA2}
          avatar1={selfAvatar}
          avatar2={avatarA2}
          name1IsSelf={prefillSelf}
          enableSearch={enableSearch}
          directory={directory}
          excludeId={user?.id}
        />
        <SideFields
          label="Second side"
          color={colorB}
          otherColor={colorA}
          onColorChange={setColorB}
          isIndoor={isIndoor}
          teamName={teamNameB}
          onTeamName={setTeamNameB}
          name1={nameB1}
          onName1={handleNameB1}
          name2={nameB2}
          onName2={handleNameB2}
          avatar1={avatarB1}
          avatar2={avatarB2}
          enableSearch={enableSearch}
          directory={directory}
          excludeId={user?.id}
        />
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        <Button
          variant="primary"
          onPress={handleStart}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          Start Game
        </Button>
      </div>
    </div>
  );
}
