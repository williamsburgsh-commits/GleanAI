'use client';

import { GleanLogo, GleanWordmark } from '@/components/logo/GleanLogo';

export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center border-4 border-cyan/60 bg-[#0a1628] ${className}`}
      style={{ aspectRatio: '2.5 / 3.5' }}
    >
      <div
        className="absolute inset-2 border-2 border-phosphor/30"
        style={{
          background:
            'repeating-linear-gradient(45deg, #0d1219 0, #0d1219 4px, #111827 4px, #111827 8px)',
        }}
      />
      <div className="relative z-10 mb-2 h-8 w-8 sm:h-10 sm:w-10">
        <GleanLogo />
      </div>
      <div className="relative z-10">
        <GleanWordmark size="sm" glow />
      </div>
      <p className="relative z-10 mt-2 font-pixel text-[5px] text-cyan/80 sm:text-[6px]">WALLET WARS</p>
      <div className="relative z-10 mt-2 h-5 w-5 border-2 border-amber/50 sm:h-6 sm:w-6" />
    </div>
  );
}
