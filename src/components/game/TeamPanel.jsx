import { useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { colorForeground } from "../../lib/teamColors.js";

function selectAllText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function EditableTeamName({ id, name, fallback, label, onCommit }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== name) {
      ref.current.textContent = name;
    }
  }, [name]);

  return (
    <h2
      id={id}
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={label}
      tabIndex={0}
      className="m-0 max-w-full cursor-text break-words rounded-lg px-2 py-0.5 text-center text-[clamp(1.3rem,5.5vw,2rem)] font-bold phone-landscape:text-[clamp(1.05rem,4.2vh,1.5rem)] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      onFocus={(e) => selectAllText(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        document.execCommand("insertText", false, text);
      }}
      onBlur={(e) => {
        const cleaned = sanitizeName(e.currentTarget.textContent, fallback);
        e.currentTarget.textContent = cleaned;
        onCommit(cleaned);
      }}
    />
  );
}

export default function TeamPanel({ winner, score, names, fallbacks, side, color, onInc, onDec, onNameCommit }) {
  const teamLabel = `Team ${side}`;
  const fg = colorForeground(color);
  const isLeft = side === "A";

  const nameAndScore = (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 phone-landscape:gap-0.5">
      <div className="flex flex-none flex-col items-center">
        <EditableTeamName
          id={`${side}-name-1`}
          name={names[0]}
          fallback={fallbacks[0]}
          label={`${teamLabel}, player 1 name, tap to edit`}
          onCommit={(next) => onNameCommit(1, next)}
        />
        <EditableTeamName
          id={`${side}-name-2`}
          name={names[1]}
          fallback={fallbacks[1]}
          label={`${teamLabel}, player 2 name, tap to edit`}
          onCommit={(next) => onNameCommit(2, next)}
        />
      </div>

      <div className="flex w-full flex-none items-center justify-center">
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-[clamp(1rem,calc(35.5vw_-_94px),3.5rem)] font-extrabold leading-none [font-variant-numeric:tabular-nums] min-[420px]:text-[clamp(2.5rem,calc(35.5vw_-_105px),9rem)] min-[700px]:text-[clamp(7rem,calc(35.5vw_-_127px),26rem)] phone-landscape:text-[clamp(1.5rem,min(50vh,calc(35.5vw_-_116px)),9.5rem)]"
        >
          {score}
        </span>
      </div>
    </div>
  );

  const buttons = (
    <div className="flex h-full w-24 flex-none flex-col gap-0 min-[420px]:w-28 min-[700px]:w-36 phone-landscape:w-32">
      <Button
        variant="primary"
        onPress={onInc}
        aria-label={`Add point to ${teamLabel}`}
        style={{
          "--button-bg": color,
          "--button-bg-hover": `color-mix(in oklab, ${color} 85%, black)`,
          "--button-bg-pressed": `color-mix(in oklab, ${color} 85%, black)`,
          "--button-fg": fg,
        }}
        className="min-h-0 w-full flex-[4_0_0%] rounded-none text-[clamp(1.75rem,7vw,3.5rem)] font-extrabold leading-none active:scale-96 phone-landscape:text-[clamp(1.5rem,9vh,2.4rem)]"
      >
        +1
      </Button>
      <Button
        variant="outline"
        onPress={onDec}
        aria-label={`Remove point from ${teamLabel}, fix a mistake`}
        className="min-h-0 w-full flex-[1_0_0%] rounded-none border-2 border-danger text-[clamp(1.1rem,4vw,2rem)] font-extrabold leading-none text-foreground active:scale-96 phone-landscape:text-[clamp(1rem,6vh,1.5rem)]"
      >
        −1
      </Button>
    </div>
  );

  return (
    <section
      aria-label={`${teamLabel} scoring panel`}
      className={`flex min-w-0 flex-1 flex-row items-stretch justify-center gap-2 transition-colors ${
        winner ? "bg-success/10" : ""
      }`}
    >
      {isLeft ? buttons : nameAndScore}
      {isLeft ? nameAndScore : buttons}
    </section>
  );
}
