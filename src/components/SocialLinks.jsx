import { SOCIAL_LINKS } from "../lib/socialLinks.js";

const ICONS = {
  facebook: (
    <path d="M14.5 21v-7.5h2.5l.5-3H14.5V8.5c0-.87.24-1.46 1.49-1.46H17.6V4.35C17.34 4.31 16.44 4.23 15.4 4.23c-2.17 0-3.66 1.32-3.66 3.76V10.5H9.23v3h2.51V21h2.76Z" />
  ),
  instagram: (
    <path d="M8 3.5h8a4.5 4.5 0 0 1 4.5 4.5v8a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5Zm0 1.8A2.7 2.7 0 0 0 5.3 8v8A2.7 2.7 0 0 0 8 18.7h8a2.7 2.7 0 0 0 2.7-2.7V8A2.7 2.7 0 0 0 16 5.3H8Zm4 2.7a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Zm4.9-2.98a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16Z" />
  ),
  youtube: (
    <path d="M21.58 7.6a2.76 2.76 0 0 0-1.94-1.96C17.9 5.14 12 5.14 12 5.14s-5.9 0-7.64.5A2.76 2.76 0 0 0 2.42 7.6 28.9 28.9 0 0 0 1.93 12a28.9 28.9 0 0 0 .49 4.4 2.76 2.76 0 0 0 1.94 1.96c1.74.5 7.64.5 7.64.5s5.9 0 7.64-.5a2.76 2.76 0 0 0 1.94-1.96A28.9 28.9 0 0 0 22.07 12a28.9 28.9 0 0 0-.49-4.4ZM10 15V9l5.2 3-5.2 3Z" />
  ),
  tiktok: (
    <path d="M15.5 3h2.4a5.2 5.2 0 0 0 3.6 3.9v2.5a7.7 7.7 0 0 1-3.6-1v6.2a5.8 5.8 0 1 1-5.8-5.8c.24 0 .48.02.7.05v2.6a3.2 3.2 0 1 0 2.3 3.08V3Z" />
  ),
};

export default function SocialLinks() {
  return (
    <nav aria-label="Follow us on social media" className="relative flex flex-col items-center gap-2">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-muted/70">Follow along</span>
      <div className="flex items-center gap-3">
        {SOCIAL_LINKS.map((s) => (
          <a
            key={s.key}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted/70 transition-colors duration-200 hover:text-accent focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              {ICONS[s.key]}
            </svg>
          </a>
        ))}
      </div>
    </nav>
  );
}
