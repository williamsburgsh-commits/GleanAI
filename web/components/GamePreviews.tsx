'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { accents, type AccentTone } from '@/lib/palette';

function WalletWarsArt() {
  return (
    <div
      className="relative mx-auto flex h-28 w-full max-w-[220px] items-center justify-center gap-3"
      aria-hidden
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex h-24 w-[72px] flex-col border-2 border-phosphor/50 bg-void p-1.5"
          style={{
            boxShadow: i === 0 ? '2px 2px 0 #04130a' : '-2px 2px 0 #04130a',
            transform: i === 0 ? 'rotate(-4deg)' : 'rotate(4deg)',
          }}
        >
          <div className="mb-1 h-8 border border-phosphor/30 bg-screen" />
          <div className="mb-1 h-1.5 w-full bg-grid">
            <i className="block h-full bg-phosphor" style={{ width: i === 0 ? '78%' : '62%' }} />
          </div>
          <div className="mb-1 h-1.5 w-full bg-grid">
            <i className="block h-full bg-cyan" style={{ width: i === 0 ? '55%' : '80%' }} />
          </div>
          <div className="h-1.5 w-full bg-grid">
            <i className="block h-full bg-amber" style={{ width: i === 0 ? '90%' : '40%' }} />
          </div>
          <div className="mt-auto text-center font-pixel text-[6px] text-phosphor">
            {i === 0 ? 'P1' : 'P2'}
          </div>
        </div>
      ))}
      <span className="absolute font-pixel text-[9px] text-amber">VS</span>
    </div>
  );
}

function ReceiptArt() {
  const lines = [88, 64, 76, 52, 70, 40, 82];
  return (
    <div
      className="mx-auto flex h-28 w-[120px] flex-col overflow-hidden border-2 border-amber/50 bg-void px-2 py-2"
      aria-hidden
    >
      <div className="mb-1 text-center font-pixel text-[5px] text-amber">FEE RECEIPT</div>
      {lines.map((w, i) => (
        <div
          key={i}
          className="receipt-print-line mb-1 h-1 bg-amber/70"
          style={{ width: `${w}%`, animationDelay: `${i * 0.28}s` }}
        />
      ))}
      <div
        className="receipt-print-line mt-auto text-center font-pixel text-[5px] text-amber"
        style={{ animationDelay: '2s' }}
      >
        **** SAVED ****
      </div>
    </div>
  );
}

function SprintArt() {
  const [secs, setSecs] = useState(0);
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => (s >= 27 ? 0 : s + 1));
      setChecks((c) => (c >= 5 ? 0 : c + 1));
    }, 450);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div
      className="mx-auto flex h-28 w-full max-w-[200px] flex-col items-center justify-center border-2 border-phosphor/40 bg-void px-3 py-2"
      aria-hidden
    >
      <div className="font-pixel text-[14px] tabular-nums text-phosphor glow-text">
        {mm}:{ss}
      </div>
      <ul className="mt-3 flex w-full flex-col gap-1">
        {[0, 1, 2, 3, 4].map((i) => {
          const on = i < checks;
          return (
            <li key={i} className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 border border-phosphor ${
                  on ? 'bg-phosphor' : 'bg-transparent opacity-40'
                }`}
              />
              <span className="h-1 flex-1 bg-grid">
                <i
                  className={`block h-full ${on ? 'bg-phosphor/60' : 'bg-transparent'}`}
                  style={{ width: '100%' }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const GAMES: {
  id: string;
  title: string;
  titleClass: string;
  tone: AccentTone;
  Art: () => ReactNode;
  tagline: string;
  stat: string;
}[] = [
  {
    id: 'wars',
    title: 'WALLET WARS',
    titleClass: 'text-phosphor',
    tone: 'phosphor',
    Art: WalletWarsArt,
    tagline: 'Your wallet history becomes your weapon.',
    stat: '5 stats · rank-based matchmaking · mintable badges',
  },
  {
    id: 'receipt',
    title: 'THE RECEIPT',
    titleClass: 'text-amber',
    tone: 'amber',
    Art: ReceiptArt,
    tagline: 'See what you saved choosing Solana over Ethereum.',
    stat: 'Live fee data · shareable card · Ethereum comparison',
  },
  {
    id: 'sprint',
    title: 'SOLANA SPRINT',
    titleClass: 'text-phosphor',
    tone: 'phosphor',
    Art: SprintArt,
    tagline: 'Speedrun Solana onboarding. Share your time.',
    stat: '5 real on-chain actions · global leaderboard · timed',
  },
];

export function GamePreviews() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {GAMES.map(({ id, title, titleClass, tone, Art, tagline, stat }) => (
        <article
          key={id}
          className="game-preview-card scanlines crt-panel p-4 transition-[border-color,box-shadow] duration-200"
          style={{ borderColor: `${accents[tone]}55` }}
        >
          <h3 className={`mb-3 font-pixel text-[10px] uppercase tracking-[0.14em] ${titleClass}`}>
            {title}
          </h3>
          <Art />
          <p className="mt-4 font-term text-[16px] leading-snug text-bone">{tagline}</p>
          <p className="mt-2 font-pixel text-[7px] uppercase leading-relaxed tracking-[0.1em] text-mute">
            {stat}
          </p>
        </article>
      ))}
    </div>
  );
}
