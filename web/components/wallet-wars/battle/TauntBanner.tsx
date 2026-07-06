'use client';

export function TauntBanner({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div className="mb-3 animate-flicker border-2 border-amber/50 bg-amber/10 px-3 py-2 text-center">
      <p className="font-term text-sm text-amber">&ldquo;{text}&rdquo;</p>
    </div>
  );
}
