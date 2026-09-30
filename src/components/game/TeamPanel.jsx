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
      className="m-0 max-w-full cursor-text break-words rounded-lg px-2 py-0.5 text-center text-[clamp(0.95rem,4vw,1.3rem)] font-bold phone-landscape:text-[clamp(0.8rem,3vh,1.05rem)] focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
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

  return (
    <section
      aria-label={`${teamLabel} scoring panel`}
      style={winner ? undefined : { borderTopColor: color }}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-2 border-t-[6px] p-2 transition-colors phone-landscape:flex-row phone-landscape:gap-2 phone-landscape:p-1.5 ${
        winner ? "bg-success/10 border-t-success" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-1 phone-landscape:flex-1 phone-landscape:justify-center phone-landscape:gap-0.5">
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
            className="text-[clamp(4rem,22vw,9rem)] font-extrabold leading-none [font-variant-numeric:tabular-nums] phone-landscape:text-[clamp(2.25rem,24vh,5rem)]"
          >
            {score}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-80 flex-none flex-col gap-2 min-[700px]:max-w-96 phone-landscape:w-28 phone-landscape:max-w-none phone-landscape:gap-1.5">
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
          className="min-h-20 w-full text-[clamp(2.25rem,10vw,3.5rem)] font-extrabold leading-none active:scale-96 phone-landscape:min-h-16 phone-landscape:text-[clamp(1.5rem,9vh,2.4rem)]"
        >
          +1
        </Button>
        <Button
          variant="outline"
          onPress={onDec}
          aria-label={`Remove point from ${teamLabel}, fix a mistake`}
          className="min-h-11 w-full border-2 border-danger text-[clamp(1.4rem,6vw,2rem)] font-extrabold leading-none text-foreground active:scale-96 phone-landscape:min-h-9 phone-landscape:text-[clamp(1rem,6vh,1.5rem)]"
        >
          −1
        </Button>
      </div>
    </section>
  );
}
