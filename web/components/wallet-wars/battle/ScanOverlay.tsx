'use client';

export function ScanOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      <div className="battle-scan-line" />
      <div className="absolute inset-0 bg-phosphor/5 mix-blend-screen" />
    </div>
  );
}
