import Link from 'next/link';
import { PixelArrowRight, PixelBolt } from '@/components/PixelArt';

export function GameModeCards({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Link href="/wallet-wars" className="block">
        <div
          className="crt-panel scanlines p-4 transition-transform active:scale-[0.98]"
          style={{ borderColor: '#27ff7d55' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 text-phosphor">
                <PixelBolt />
              </div>
              <div>
                <div className="font-pixel text-[11px] text-phosphor glow-text">WALLET WARS</div>
                <div className="mt-1 font-term text-[15px] text-ash">
                  Scan your fighter · battle · mint badge
                </div>
              </div>
            </div>
            <span className="h-5 w-5 text-phosphor glow-text">
              <PixelArrowRight />
            </span>
          </div>
        </div>
      </Link>

      <Link href="/sprint" className="block">
        <div className="crt-panel scanlines p-3 opacity-90" style={{ borderColor: '#ff3da633' }}>
          <div className="flex items-center justify-between">
            <div className="font-term text-[14px] text-ash">Solana Sprint · side mode</div>
            <span className="h-4 w-4 text-magenta">
              <PixelArrowRight />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
