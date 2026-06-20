import { ReactNode } from 'react';

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
  const toneBorder = {
    phosphor: 'border-phosphor/30',
    magenta: 'border-magenta/40',
    cyan: 'border-cyan/40',
    amber: 'border-amber/40',
  }[tone];
  const toneText = {
    phosphor: 'text-phosphor',
    magenta: 'text-magenta',
    cyan: 'text-cyan',
    amber: 'text-amber',
  }[tone];

  return (
    <section
      className={`scanlines crt-panel ${toneBorder} ${className}`}
    >
      {label ? (
        <div
          className={`flex items-center justify-between border-b ${toneBorder} px-3 py-1.5`}
        >
          <span
            className={`text-[10px] uppercase tracking-[0.3em] ${toneText}`}
          >
            {label}
          </span>
          <span className="flex gap-1">
            <i className="h-2 w-2 rounded-full bg-magenta/70" />
            <i className="h-2 w-2 rounded-full bg-amber/70" />
            <i className="h-2 w-2 rounded-full bg-phosphor/70" />
          </span>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
