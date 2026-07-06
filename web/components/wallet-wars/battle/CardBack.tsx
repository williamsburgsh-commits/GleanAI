'use client';

export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center border-4 border-cyan/60 bg-[#0a1628] ${className}`}
      style={{ aspectRatio: '2.5 / 3.5' }}
    >
      <div
        className="absolute inset-2 border-2 border-phosphor/30"
        style={{
          background:
            'repeating-linear-gradient(45deg, #0d1219 0, #0d1219 4px, #111827 4px, #111827 8px)',
        }}
      />
      <p className="relative z-10 font-pixel text-[10px] text-phosphor glow-text">GLEAN</p>
      <p className="relative z-10 font-pixel text-[8px] text-magenta">AI</p>
      <p className="relative z-10 mt-3 font-pixel text-[6px] text-cyan/80">WALLET WARS</p>
      <div className="relative z-10 mt-4 h-8 w-8 border-2 border-amber/50" />
    </div>
  );
}
