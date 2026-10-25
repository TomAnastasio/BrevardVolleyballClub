import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { MAX_NAME_LENGTH, sanitizeName } from "../../lib/sanitizeName.js";
import { colorForeground } from "../../lib/teamColors.js";
import { playerPhoto } from "../../themes/playerPhoto.js";

function selectAllText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function EditableTeamName({ id, name, fallback, label, onCommit, fontSize, align = "center" }) {
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
      style={{ fontSize }}
      className={`m-0 max-w-full cursor-text break-words rounded-lg px-2 py-0.5 ${align === "left" ? "text-left" : "text-center"} font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2`}
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
        document.execCommand("insertText", false, text.replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH));
      }}
      // A name stops at MAX_NAME_LENGTH while it's being typed, not only
      // when it's committed, so nobody types a long name and watches it get
      // cut off. Checked after the input (not before) because phone
      // keyboards don't reliably let a page cancel a keystroke.
      onInput={(e) => {
        const el = e.currentTarget;
        if (el.textContent.length <= MAX_NAME_LENGTH) return;
        el.textContent = el.textContent.slice(0, MAX_NAME_LENGTH);
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }}
      onBlur={(e) => {
        const cleaned = sanitizeName(e.currentTarget.textContent, fallback);
        e.currentTarget.textContent = cleaned;
        onCommit(cleaned);
      }}
    />
  );
}

// Reserves a fixed circular slot whether the photo loads or not, so a 404
// just swaps in a placeholder rather than collapsing the grid.
export function RosterAvatar({ player, size }) {
  const [broken, setBroken] = useState(false);
  const photoUrl = playerPhoto(player.avatarUrl, player.id);
  useEffect(() => setBroken(false), [photoUrl]);

  const style = { height: size, width: size };

  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt={player.name}
        onError={() => setBroken(true)}
        style={style}
        className="flex-none rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="flex flex-none items-center justify-center rounded-full border border-white/10 bg-black text-[0.6em] font-extrabold text-accent"
    >
      {player.name ? player.name.charAt(0).toUpperCase() : "?"}
    </span>
  );
}

// The big score number. Re-keyed on every change so it replays a quick
// kick up on +1 or dip on −1; the first render (game start) stays still.
// Sits inside the aria-live span, so screen readers aren't affected.
export function AnimatedScore({ score }) {
  // Remembers the direction until the score changes again, so a re-render
  // from the other team scoring doesn't cut this one's animation short.
  const last = useRef({ score, direction: null });
  if (last.current.score !== score) {
    last.current = { score, direction: score > last.current.score ? "up" : "down" };
  }
  const { direction } = last.current;
  return (
    <span key={score} className={`inline-block ${direction ? `animate-score-${direction}` : ""}`}>
      {score}
    </span>
  );
}

// Mirrors the same clamp(min, val, max) formulas the scoreboard always used,
// evaluated against useViewport's width/height (effectiveWidth/Height).
function clampPx(min, value, max) {
  return Math.min(Math.max(value, min), max);
}

export default function TeamPanel({
  winner,
  score,
  names,
  fallbacks,
  roster,
  side,
  color,
  onInc,
  onDec,
  onNameCommit,
  effectiveWidth,
  effectiveHeight,
}) {
  const teamLabel = `Team ${side}`;
  const fg = colorForeground(color);
  const isLeft = side === "A";

  const vw = (n) => (n / 100) * effectiveWidth;
  const vh = (n) => (n / 100) * effectiveHeight;
  const isCompact = effectiveHeight <= 520;

  const nameFontSize = isCompact
    ? `${clampPx(1.05 * 16, vh(4.2), 1.5 * 16)}px`
    : `${clampPx(1.3 * 16, vw(5.5), 2 * 16)}px`;

  const scoreFontSize = isCompact
    ? `${clampPx(1.5 * 16, Math.min(vh(50), vw(35.5) - 116), 9.5 * 16)}px`
    : effectiveWidth >= 700
      ? `${clampPx(7 * 16, vw(35.5) - 127, 26 * 16)}px`
      : effectiveWidth >= 420
        ? `${clampPx(2.5 * 16, vw(35.5) - 105, 9 * 16)}px`
        : `${clampPx(1 * 16, vw(35.5) - 94, 3.5 * 16)}px`;

  const buttonsWidth = isCompact ? "8rem" : effectiveWidth >= 700 ? "9rem" : effectiveWidth >= 420 ? "7rem" : "6rem";

  const incFontSize = isCompact
    ? `${clampPx(1.5 * 16, vh(9), 2.4 * 16)}px`
    : `${clampPx(1.75 * 16, vw(7), 3.5 * 16)}px`;

  const decFontSize = isCompact ? `${clampPx(1 * 16, vh(6), 1.5 * 16)}px` : `${clampPx(1.1 * 16, vw(4), 2 * 16)}px`;

  const avatarSize = isCompact
    ? clampPx(18, vh(10), 34)
    : clampPx(20, Math.min(vh(14), vw(7)), 44);

  const rosterGap = isCompact ? 2 : 4;

  const nameOrRoster = roster ? (
    <div
      className="flex flex-none flex-wrap items-center justify-center overflow-y-auto"
      style={{ gap: rosterGap, maxHeight: isCompact ? vh(34) : vh(45), maxWidth: "100%" }}
    >
      {roster.map((player) => (
        <RosterAvatar key={player.id} player={player} size={avatarSize} />
      ))}
    </div>
  ) : (
    <div className="flex flex-none flex-col items-center">
      {names.map((name, i) => (
        <EditableTeamName
          key={i}
          id={`${side}-name-${i + 1}`}
          name={name}
          fallback={fallbacks[i]}
          label={
            names.length > 1 ? `${teamLabel}, player ${i + 1} name, tap to edit` : `${teamLabel} name, tap to edit`
          }
          onCommit={(next) => onNameCommit(i + 1, next)}
          fontSize={nameFontSize}
        />
      ))}
    </div>
  );

  const nameAndScore = (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 phone-landscape:gap-0.5">
      {nameOrRoster}

      <div className="flex w-full flex-none items-center justify-center">
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: scoreFontSize }}
          className="font-extrabold leading-none [font-variant-numeric:tabular-nums]"
        >
          <AnimatedScore score={score} />
        </span>
      </div>
    </div>
  );

  const buttons = (
    <div className="flex h-full flex-none flex-col gap-0" style={{ width: buttonsWidth }}>
      <Button
        variant="primary"
        onPress={onInc}
        aria-label={`Add point to ${teamLabel}`}
        style={{
          "--button-bg": color,
          "--button-bg-hover": `color-mix(in oklab, ${color} 85%, black)`,
          "--button-bg-pressed": `color-mix(in oklab, ${color} 85%, black)`,
          "--button-fg": fg,
          fontSize: incFontSize,
        }}
        className="min-h-0 w-full flex-[4_0_0%] rounded-none font-extrabold leading-none active:scale-96"
      >
        +1
      </Button>
      <Button
        variant="outline"
        onPress={onDec}
        aria-label={`Remove point from ${teamLabel}, fix a mistake`}
        style={{ fontSize: decFontSize }}
        className="min-h-0 w-full flex-[1_0_0%] rounded-none border-2 border-danger font-extrabold leading-none text-foreground active:scale-96"
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
