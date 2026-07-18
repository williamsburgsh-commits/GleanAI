import { CrtPanel } from '@/components/CrtPanel';
import { BrandMark } from '@/components/BrandMark';
import { GleanWordmark } from '@/components/logo/GleanLogo';
import { Ticker } from '@/components/Ticker';
import { HomeHeroCta } from '@/components/HomeHeroCta';
import { TelegramCapture } from '@/components/TelegramCapture';
import { WhatsInsidePreview } from '@/components/WhatsInsidePreview';
import { LiveStats } from '@/components/LiveStats';
import { GamePreviews } from '@/components/GamePreviews';
import { OpenSourceBar } from '@/components/OpenSourceBar';
import { LandingSection } from '@/components/LandingSection';
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
    <main className="flex min-h-screen flex-col">
      {/* Full-viewport hero — only this is visible above the fold */}
      <section className="mx-auto flex min-h-[100vh] w-full max-w-5xl flex-col px-4 sm:px-6">
        <header className="flex shrink-0 items-center justify-between pt-6">
          <BrandMark tagline="// onboarding arcade" />
          <div className="flex items-center gap-2">
            <span className="crt-tag">NET: {cluster}</span>
            <TelegramCapture />
          </div>
        </header>

        <div className="animate-flicker relative flex flex-1 flex-col items-center justify-center text-center">
          <div className="hero-wordmark-glow pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-48 w-full max-w-lg -translate-y-1/2" aria-hidden />
          <p className="relative mb-5 flex items-center justify-center gap-2 font-pixel text-[10px] uppercase tracking-[0.3em] text-amber">
            <span className="h-4 w-4">
              <PixelCoinSlot />
            </span>
            <span className="coin-blink">insert wallet to play</span>
          </p>
          <h1 className="relative leading-[1.5] sm:leading-[1.4]">
            <GleanWordmark size="hero" glow />
          </h1>
          <p className="relative mx-auto mt-5 max-w-lg font-term text-[18px] leading-snug text-ash">
            The Solana onboarding arcade. Real transactions. Real stakes. Real fun.
          </p>

          <div className="relative">
            <HomeHeroCta />
          </div>
        </div>

        <div className="shrink-0 pb-4">
          <Ticker items={QUEST_TICKER} />
          <p
            className="mt-3 animate-scroll-cue text-center font-pixel text-[8px] uppercase tracking-[0.35em] text-dim"
            aria-hidden
          >
            SCROLL
            <span className="mt-1 block text-[10px] leading-none tracking-normal">▼</span>
          </p>
        </div>
      </section>

      <LandingSection
        id="inside"
        eyebrow="// WHAT'S INSIDE"
        title="The arcade unlocks after you link a wallet."
        tone="cyan"
      >
        <WhatsInsidePreview />
      </LandingSection>

      <LandingSection
        id="live"
        eyebrow="// LIVE STATS"
        title="Cabinet counters, updating live."
        tone="phosphor"
        alt
      >
        <LiveStats />
      </LandingSection>

      <LandingSection
        id="play"
        eyebrow="// WHAT YOU'LL PLAY"
        title="Three modes. One wallet. Real Solana."
        tone="phosphor"
      >
        <GamePreviews />
      </LandingSection>

      <LandingSection
        id="how"
        eyebrow="// HOW IT WORKS"
        title="Connect. Quest. Battle."
        tone="amber"
        alt
      >
        <div className="grid gap-4 sm:grid-cols-3">
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
        </div>
      </LandingSection>

      <footer className="mt-auto flex flex-col items-center">
        <OpenSourceBar />
        <div className="w-full max-w-5xl px-4 py-5 text-center sm:px-6">
          <span className="font-term text-[14px] text-grid">
            <span className="animate-blink text-phosphor">█</span> GLEANAI v0.1
          </span>
        </div>
      </footer>
    </main>
  );
}
