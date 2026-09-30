import { useEffect, useRef } from "react";
import { Button } from "@heroui/react";

function selectAllText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function sanitizeName(text, fallback) {
  let cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > 24) cleaned = cleaned.slice(0, 24);
  return cleaned;
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
      className="m-0 my-1 max-w-full cursor-text break-words rounded-lg px-2 py-1 text-center text-[clamp(1.1rem,5vw,1.6rem)] font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
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

export default function TeamPanel({ accent, winner, score, name, fallback, onInc, onDec, onNameCommit }) {
  return (
    <section
      aria-labelledby={`${fallback}-name`}
      style={{
        "--accent": accent,
        "--accent-hover": `color-mix(in oklab, ${accent} 85%, black)`,
        "--accent-foreground": "#06210f",
      }}
      className={`flex min-w-0 flex-1 flex-col items-center justify-start border-t-[6px] p-2 transition-colors ${
        winner ? "bg-success/10 border-t-success" : "border-t-accent"
      }`}
    >
      <EditableTeamName
        id={`${fallback}-name`}
        name={name}
        fallback={fallback}
        label={`${fallback} name, tap to edit`}
        onCommit={onNameCommit}
      />

      <div className="flex w-full flex-none items-center justify-center">
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-[clamp(4rem,22vw,9rem)] font-extrabold leading-none [font-variant-numeric:tabular-nums]"
        >
          {score}
        </span>
      </div>

      <div className="flex w-full max-w-80 flex-1 flex-col gap-2 py-2 min-[700px]:max-w-96">
        <Button
          variant="primary"
          onPress={onInc}
          aria-label={`Add point to ${fallback}`}
          className="min-h-26 flex-[3_1_auto] text-[clamp(1.5rem,6vw,2.2rem)] active:scale-96"
        >
          +1
        </Button>
        <Button
          variant="outline"
          onPress={onDec}
          aria-label={`Remove point from ${fallback}, fix a mistake`}
          className="min-h-14 flex-1 border-2 border-danger text-[clamp(1.1rem,4.5vw,1.5rem)] text-foreground active:scale-96"
        >
          −1
        </Button>
      </div>
    </section>
  );
}
