import { ReactNode } from 'react';

// Tone → accent color. The cabinet uses the same 4-color palette everywhere;
// tone just picks which accent the panel's bezel/LED lights up in.
const TONE = {
  phosphor: {
    border: '#27ff7d',
    text: 'text-phosphor',
    led: 'bg-phosphor',
  },
  magenta: {
    border: '#ff3da6',
    text: 'text-magenta',
    led: 'bg-magenta',
  },
  cyan: {
    border: '#2bd9ff',
    text: 'text-cyan',
    led: 'bg-cyan',
  },
  amber: {
    border: '#ffb437',
    text: 'text-amber',
    led: 'bg-amber',
  },
} as const;

export function CrtPanel({
  children,
  label,
  className = '',
  tone = 'phosphor',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  tone?: 'phosphor' | 'magenta' | 'cyan' | 'amber';
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
