import { useState } from "react";
import { Button } from "@heroui/react";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { TEAM_COLORS, DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../../lib/teamColors.js";

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

function SideFields({ label, color, otherColor, onColorChange, name1, name2, onName1, onName2 }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span aria-hidden="true" className="h-2 w-16 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex w-full flex-col gap-2">
        <input
          type="text"
          value={name1}
          maxLength={24}
          placeholder="Player 1 name"
          aria-label={`${label}, player 1 name`}
          onChange={(e) => onName1(e.target.value)}
          className={nameInputClass()}
        />
        <input
          type="text"
          value={name2}
          maxLength={24}
          placeholder="Player 2 name"
          aria-label={`${label}, player 2 name`}
          onChange={(e) => onName2(e.target.value)}
          className={nameInputClass()}
        />
      </div>
      <ColorSwatchPicker label={`${label} color`} selected={color} disabledColor={otherColor} onSelect={onColorChange} />
    </div>
  );
}

export default function NewGameForm({ onStart }) {
  const [nameA1, setNameA1] = useState("");
  const [nameA2, setNameA2] = useState("");
  const [nameB1, setNameB1] = useState("");
  const [nameB2, setNameB2] = useState("");
  const [colorA, setColorA] = useState(DEFAULT_COLOR_A);
  const [colorB, setColorB] = useState(DEFAULT_COLOR_B);

  function handleStart() {
    onStart({
      nameA1: sanitizeName(nameA1, "Player 1"),
      nameA2: sanitizeName(nameA2, "Player 2"),
      nameB1: sanitizeName(nameB1, "Player 1"),
      nameB2: sanitizeName(nameB2, "Player 2"),
      colorA,
      colorB,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SideFields
          label="First side"
          color={colorA}
          otherColor={colorB}
          onColorChange={setColorA}
          name1={nameA1}
          onName1={setNameA1}
          name2={nameA2}
          onName2={setNameA2}
        />
        <SideFields
          label="Second side"
          color={colorB}
          otherColor={colorA}
          onColorChange={setColorB}
          name1={nameB1}
          onName1={setNameB1}
          name2={nameB2}
          onName2={setNameB2}
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
