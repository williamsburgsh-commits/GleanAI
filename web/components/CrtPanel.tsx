import { ReactNode } from 'react';
import { accents, type AccentTone } from '@/lib/palette';

// Tone → accent color. The cabinet uses the same palette everywhere;
// tone just picks which accent the panel's bezel/LED lights up in.
const TONE: Record<
  AccentTone,
  { border: string; text: string; led: string }
> = {
  phosphor: {
    border: accents.phosphor,
    text: 'text-phosphor',
    led: 'bg-phosphor',
  },
  magenta: {
    border: accents.magenta,
    text: 'text-magenta',
    led: 'bg-magenta',
  },
  cyan: {
    border: accents.cyan,
    text: 'text-cyan',
    led: 'bg-cyan',
  },
  amber: {
    border: accents.amber,
    text: 'text-amber',
    led: 'bg-amber',
  },
};

export function CrtPanel({
  children,
  label,
  className = '',
  tone = 'phosphor',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  tone?: AccentTone;
}) {
  const t = TONE[tone];

  return (
    <section
      className={`scanlines crt-panel ${className}`}
      style={{ borderColor: `${t.border}55` }}
    >
      {/* Cabinet header strip: corner bolts + label + LED status row */}
      {label ? (
        <div
          className="relative flex items-center justify-between px-3 py-2"
          style={{
            borderBottom: `2px solid ${t.border}40`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0))',
          }}
        >
          {/* corner bolt */}
          <i className="absolute left-1 top-1 h-1.5 w-1.5 bg-grid" />
          <span
            className={`font-pixel text-[10px] uppercase tracking-[0.18em] ${t.text}`}
            style={{ textShadow: '0 0 5px rgba(0,0,0,0.6)' }}
          >
            {label}
          </span>
          {/* LED status row (decorative) */}
          <span className="flex items-center gap-1.5">
            <i className={`h-1.5 w-1.5 ${t.led}`} style={{ boxShadow: '0 0 4px currentColor' }} />
            <i className="h-1.5 w-1.5 bg-grid" />
            <i className="h-1.5 w-1.5 bg-grid" />
          </span>
          <i className="absolute right-1 top-1 h-1.5 w-1.5 bg-grid" />
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
