import { CrtPanel } from '@/components/CrtPanel';
import { BrandMark } from '@/components/BrandMark';
import { Ticker } from '@/components/Ticker';
import { HomeHeroCta } from '@/components/HomeHeroCta';
import { TelegramCapture } from '@/components/TelegramCapture';
import { WhatsInsidePreview } from '@/components/WhatsInsidePreview';
import {
  PixelWallet,
  PixelBolt,
  PixelStar,
  PixelCoinSlot,
} from '@/components/PixelArt';
import { getPublicConfig } from '@/lib/config';

const QUEST_TICKER = [
  'CREATE YOUR WALLET +50',
  'GET SOME SOL +75',
  'YOUR FIRST SWAP +100',
  'STAKE YOUR SOL +125',
  'SCAN YOUR FIGHTER +75',
  'WIN THREE BATTLES +50',
  'RUN THE SOLANA SPRINT +100',
  'PRINT YOUR RECEIPT +50',
  'BRING A FRIEND +100',
];

export default function Home() {
  const { cluster } = getPublicConfig();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <BrandMark tagline="// onboarding arcade" />
        <div className="flex items-center gap-2">
          <span
            className="crt-tag"
            style={{ borderColor: '#2bd9ff', color: '#2bd9ff' }}
          >
            NET: {cluster}
          </span>
          <TelegramCapture />
        </div>
      </header>

      <section className="animate-flicker relative mb-6 text-center">
        <p className="mb-5 flex items-center justify-center gap-2 font-pixel text-[10px] uppercase tracking-[0.3em] text-amber">
          <span className="h-4 w-4">
            <PixelCoinSlot />
          </span>
          <span className="coin-blink">insert wallet to play</span>
        </p>
        <h1 className="font-pixel text-3xl leading-[1.5] text-bone sm:text-5xl sm:leading-[1.4]">
          <span className="glow-text text-phosphor">GLEAN</span>
          <span className="text-magenta">AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg font-term text-[18px] leading-snug text-ash">
          The Solana onboarding arcade. Real transactions. Real stakes. Real fun.
        </p>

        <HomeHeroCta cluster={cluster} />
      </section>

      <Ticker items={QUEST_TICKER} />

      <WhatsInsidePreview />

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <CrtPanel label="01 // CONNECT" tone="phosphor">
          <div className="mb-3 h-9 w-9 text-phosphor">
            <PixelWallet />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Link Phantom from the browser or Telegram Mini App. One wallet ties your
            quests, fighter, and points together.
          </p>
        </CrtPanel>
        <CrtPanel label="02 // QUEST" tone="cyan">
          <div className="mb-3 h-9 w-9 text-cyan">
            <PixelStar />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Complete real on-chain actions. We verify them automatically and drop
            points into your account.
          </p>
        </CrtPanel>
        <CrtPanel label="03 // BATTLE" tone="amber">
          <div className="mb-3 h-9 w-9 text-amber">
            <PixelBolt />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Scan your wallet into a fighter, battle in Wallet Wars, and climb the
            leaderboard. Invite friends for bonus points.
          </p>
        </CrtPanel>
      </section>

      <footer className="mt-auto flex flex-col items-center gap-2 py-5 text-center">
        <div className="w-full" style={{ borderTop: '2px solid #1b2130' }} />
        <span className="font-term text-[14px] uppercase tracking-[0.2em] text-ash">
          open source · MIT · built for the Solana frontier
        </span>
        <span className="font-term text-[14px] text-grid">
          <span className="animate-blink text-phosphor">█</span> GLEANAI v0.1
        </span>
      </footer>
    </main>
  );
}
