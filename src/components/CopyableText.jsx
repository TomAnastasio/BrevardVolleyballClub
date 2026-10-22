import { useEffect, useRef, useState } from "react";

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Anything the app lets people copy: the whole thing (text and icon) is one
// tap target. The copy icon turns into a check for a moment once copied.
// `children` is what's shown, if different from the copied `value`.
export default function CopyableText({ value, label, children, className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${copied ? "Copied" : "Copy"} ${label || value}`}
      className={`inline-flex min-w-0 items-start gap-2 rounded-md text-left focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2 active:opacity-70 ${className}`}
    >
      <span className="min-w-0 break-all">{children ?? value}</span>
      <span className={`mt-0.5 flex-none ${copied ? "text-success" : "text-accent"}`}>{copied ? <CheckIcon /> : <CopyIcon />}</span>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
