import { CrtPanel } from '@/components/CrtPanel';
import { PixelBolt } from '@/components/PixelArt';

export function WhatsInsidePreview() {
  return (
    <section className="my-8">
      <CrtPanel label="WHAT'S INSIDE" tone="cyan">
        <p className="mb-4 font-term text-[17px] text-ash">
          Two game modes unlock after you connect. Pick your path from the hub.
        </p>
        <div className="flex flex-col gap-3 opacity-90">
          <div className="crt-panel scanlines p-4" style={{ borderColor: '#27ff7d55' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 text-phosphor">
                <PixelBolt />
              </div>
              <div>
                <div className="font-pixel text-[11px] text-phosphor glow-text">WALLET WARS</div>
                <div className="mt-1 font-term text-[15px] text-ash">
                  Scan your wallet into a fighter · battle bots and players · mint your badge
                </div>
              </div>
            </div>
          </div>

          <div className="crt-panel scanlines p-3" style={{ borderColor: '#ff3da633' }}>
            <div className="font-pixel text-[10px] text-magenta">SOLANA SPRINT</div>
            <div className="mt-1 font-term text-[14px] text-ash">
              Five onboarding actions · one timer · shareable result card
            </div>
          </div>
        </div>
        <p className="mt-4 text-center font-term text-[14px] uppercase tracking-[0.15em] text-ash">
          Available after you connect
        </p>
      </CrtPanel>
    </section>
  );
}
