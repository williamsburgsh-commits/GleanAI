import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { Ticker } from '@/components/Ticker';
import { ConnectButton } from '@/components/ConnectButton';
import { TelegramCapture } from '@/components/TelegramCapture';
import { getPublicConfig } from '@/lib/config';

const SPRINT_ACTIONS = [
  { n: '01', label: 'Create Wallet' },
  { n: '02', label: 'Get SOL' },
  { n: '03', label: 'Swap' },
  { n: '04', label: 'Stake' },
  { n: '05', label: 'Mint NFT' },
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
      {/* Top bar */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xs text-phosphor glow-text">
            GLEAN<span className="text-magenta">AI</span>
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.3em] text-ash sm:inline">
            {'// onboarding arcade'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="crt-tag border-cyan/40 bg-cyan/10 text-cyan">
            NET: {cluster}
          </span>
          <TelegramCapture />
        </div>
      </header>

      {/* Hero */}
      <section className="relative mb-6 animate-flicker text-center">
        <p className="mb-4 text-[11px] uppercase tracking-[0.45em] text-ash">
          insert wallet to start
        </p>
        <h1 className="font-display text-2xl leading-[1.6] text-bone sm:text-4xl sm:leading-[1.5]">
          <span className="glow-text text-phosphor">SPEEDRUN</span>
          <br />
          <span className="glow-magenta text-magenta">SOLANA</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm text-ash">
          Learn Solana by doing. Clear real on-chain quests, bank points, and
          race the clock in the Solana Sprint.
        </p>

        {/* Faux high-score readout */}
        <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-6 text-center">
          <div>
            <div className="font-display text-lg text-amber glow-text">--:--</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              your best
            </div>
          </div>
          <div className="h-8 w-px bg-grid" />
          <div>
            <div className="font-display text-lg text-cyan glow-text">0011s</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              world record
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ConnectButton cluster={cluster} />
          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-ash">
            powered by phantom · mobile deeplink
          </p>
        </div>
      </section>

      <Ticker items={QUEST_TICKER} />

      {/* The Sprint */}
      <section className="my-8 grid gap-4 sm:grid-cols-3">
        <CrtPanel label="THE SOLANA SPRINT" tone="magenta" className="sm:col-span-3">
          <p className="mb-4 text-xs text-ash">
            Five onboarding actions. One timer. One shareable result card.
          </p>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SPRINT_ACTIONS.map((a) => (
              <li
                key={a.n}
                className="rounded-sm border border-grid bg-slate/60 p-3 text-center"
              >
                <div className="font-display text-[11px] text-magenta">
                  {a.n}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-bone">
                  {a.label}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 text-center">
            <Link href="/sprint" className="arcade-btn">
              <span className="text-magenta">▸</span> Run the Sprint
            </Link>
          </div>
        </CrtPanel>
      </section>

      {/* How it works */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <CrtPanel label="01 // CONNECT" tone="phosphor">
          <p className="text-xs leading-relaxed text-ash">
            Link your Phantom wallet straight from Telegram. No extensions, no
            seed-phrase juggling.
          </p>
        </CrtPanel>
        <CrtPanel label="02 // QUEST" tone="cyan">
          <p className="text-xs leading-relaxed text-ash">
            Complete real on-chain actions. We verify them automatically and
            drop points into your account.
          </p>
        </CrtPanel>
        <CrtPanel label="03 // CLIMB" tone="amber">
          <p className="text-xs leading-relaxed text-ash">
            Rise up the leaderboard, invite friends for bonus points, and earn
            SOL rewards.
          </p>
        </CrtPanel>
      </section>

      <footer className="mt-auto flex flex-col items-center gap-1 border-t border-grid py-5 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-ash">
          open source · MIT · built for the Solana frontier
        </span>
        <span className="text-[10px] text-grid">
          <span className="animate-blink text-phosphor">█</span> GLEANAI v0.1
        </span>
      </footer>
    </main>
  );
}
