'use client';

export function VersusSpark({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">
      <span className="battle-versus-spark font-pixel text-2xl text-amber">⚡</span>
    </div>
  );
}
