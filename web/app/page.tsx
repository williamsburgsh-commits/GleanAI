import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { Ticker } from '@/components/Ticker';
import { ConnectButton } from '@/components/ConnectButton';
import { TelegramCapture } from '@/components/TelegramCapture';
import {
  PixelWallet,
  PixelCoin,
  PixelSwap,
  PixelStake,
  PixelNft,
  PixelArrowRight,
  PixelBolt,
  PixelStar,
  PixelCoinSlot,
} from '@/components/PixelArt';
import { getPublicConfig } from '@/lib/config';

// Each sprint stage gets an 8-bit sprite so the level-select grid reads as
// arcade stages, not feature cards. Purely decorative.
const SPRINT_ACTIONS = [
  { n: '01', label: 'Create Wallet', sprite: PixelWallet },
  { n: '02', label: 'Get SOL', sprite: PixelCoin },
  { n: '03', label: 'Swap', sprite: PixelSwap },
  { n: '04', label: 'Stake', sprite: PixelStake },
  { n: '05', label: 'Mint NFT', sprite: PixelNft },
];

const QUEST_TICKER = [
  'CREATE YOUR WALLET +50',
  'GET SOME SOL +75',
  'YOUR FIRST SWAP +100',
  'STAKE YOUR SOL +125',
  'MINT YOUR FIRST NFT +150',
  'RUN THE SOLANA SPRINT +100',
  'BRING A FRIEND +100',
];

export default function Home() {
  const { cluster } = getPublicConfig();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      {/* Cabinet title bar */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[13px] text-phosphor">
            GLEAN<span className="text-magenta">AI</span>
          </span>
          <span className="hidden font-term text-[16px] uppercase tracking-[0.2em] text-ash sm:inline">
            {'// onboarding arcade'}
          </span>
        </div>
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

      {/* Hero marquee — attract screen */}
      <section className="animate-flicker relative mb-6 text-center">
        <p className="mb-5 flex items-center justify-center gap-2 font-pixel text-[10px] uppercase tracking-[0.3em] text-amber">
          <span className="h-4 w-4"><PixelCoinSlot /></span>
          <span className="coin-blink">insert wallet to start</span>
        </p>
        <h1 className="font-pixel text-2xl leading-[1.7] text-bone sm:text-4xl sm:leading-[1.5]">
          <span className="glow-text text-phosphor">WALLET</span>
          <br />
          <span className="text-magenta">WARS</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md font-term text-[18px] leading-snug text-ash">
          Your on-chain history becomes your fighter. Complete real Solana quests,
          battle opponents, and climb the leaderboard.
        </p>

        {/* Hi-score readout */}
        <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-6 text-center">
          <div>
            <div className="font-pixel text-[15px] text-amber glow-amber">--:--</div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              your best
            </div>
          </div>
          <div className="h-8 w-px bg-grid" />
          <div>
            <div className="font-pixel text-[15px] text-cyan glow-cyan">0011s</div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              world record
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <ConnectButton cluster={cluster} />
          <Link href="/wallet-wars" className="arcade-btn-cyan text-[10px]">
            Enter Wallet Wars
          </Link>
          <p className="font-term text-[14px] uppercase tracking-[0.2em] text-ash">
            powered by phantom · devnet
          </p>
        </div>
      </section>

      <Ticker items={QUEST_TICKER} />

      {/* Level select — the 5 sprint stages */}
      <section className="my-8 grid gap-4 sm:grid-cols-3">
        <CrtPanel label="THE SOLANA SPRINT" tone="magenta" className="sm:col-span-3">
          <p className="mb-4 font-term text-[17px] text-ash">
            Five onboarding actions. One timer. One shareable result card.
          </p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SPRINT_ACTIONS.map((a, i) => {
              const Sprite = a.sprite;
              return (
                <li
                  key={a.n}
                  className="stage-tile hover-glitch"
                  // locked look for stages past the first in the landing preview
                  style={i === 0 ? { borderColor: '#27ff7d', background: '#08160d' } : undefined}
                >
                  <div className="mx-auto mb-2 h-8 w-8 text-phosphor">
                    <Sprite />
                  </div>
                  <div className="font-pixel text-[10px] text-magenta">{a.n}</div>
                  <div className="mt-2 font-term text-[15px] uppercase tracking-[0.1em] text-bone">
                    {a.label}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 text-center">
            <Link href="/sprint" className="arcade-btn">
              <span className="h-3 w-3 text-phosphor">
                <PixelBolt />
              </span>
              Run the Sprint
            </Link>
          </div>
        </CrtPanel>
      </section>

      {/* How it works — 3 steps, pixel sprites as step markers */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <CrtPanel label="01 // CONNECT" tone="phosphor">
          <div className="mb-3 h-9 w-9 text-phosphor">
            <PixelWallet />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Link your Phantom wallet straight from Telegram. No extensions, no
            seed-phrase juggling.
          </p>
        </CrtPanel>
        <CrtPanel label="02 // QUEST" tone="cyan">
          <div className="mb-3 h-9 w-9 text-cyan">
            <PixelStar />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Complete real on-chain actions. We verify them automatically and
            drop points into your account.
          </p>
        </CrtPanel>
        <CrtPanel label="03 // CLIMB" tone="amber">
          <div className="mb-3 h-9 w-9 text-amber">
            <PixelArrowRight />
          </div>
          <p className="font-term text-[17px] leading-snug text-ash">
            Rise up the leaderboard, invite friends for bonus points, and earn
            SOL rewards.
          </p>
        </CrtPanel>
      </section>

      <footer className="mt-auto flex flex-col items-center gap-2 py-5 text-center">
        <div
          className="w-full"
          style={{ borderTop: '2px solid #1b2130' }}
        />
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
