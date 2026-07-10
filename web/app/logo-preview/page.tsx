import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { LOGO_CONCEPTS } from '@/components/logo/LogoConcepts';

export const metadata = {
  title: 'GleanAI // Logo Concepts',
  description: 'Eight logo directions to choose from.',
};

function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg'
      ? 'text-[14px] sm:text-[18px]'
      : size === 'sm'
        ? 'text-[8px] sm:text-[10px]'
        : 'text-[11px] sm:text-[13px]';
  return (
    <span className={`font-pixel ${cls}`}>
      <span className="text-phosphor glow-text">GLEAN</span>
      <span className="text-magenta">AI</span>
    </span>
  );
}

export default function LogoPreviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-10 text-center">
        <p className="mb-3 font-term text-[16px] uppercase tracking-[0.25em] text-ash">
          // logo lab
        </p>
        <h1 className="font-pixel text-2xl leading-relaxed text-bone sm:text-4xl">
          Pick your <span className="text-phosphor">mark</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-term text-[18px] text-ash">
          Eight pixel-logo concepts in the GleanAI palette. Each card shows the icon
          alone, with the wordmark, and at favicon size.
        </p>
        <Link
          href="/logo-preview/finalists"
          className="mt-5 inline-block font-term text-[16px] text-cyan underline"
        >
          View polished finalists (#2 · #6 · #8) →
        </Link>
        <p className="mt-3 font-term text-[15px] text-phosphor">
          ✓ Primary mark: <span className="text-amber">#1 Coin Slot</span> — live in app
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {LOGO_CONCEPTS.map(({ id, name, tagline, Component }) => (
          <CrtPanel key={id} label={`${String(id).padStart(2, '0')} // ${name.toUpperCase()}`} tone="phosphor">
            <div className="flex flex-col gap-5">
              <p className="font-term text-[17px] text-ash">{tagline}</p>

              <div className="grid grid-cols-3 gap-4">
                {/* Large icon */}
                <div className="col-span-1 flex flex-col items-center gap-2">
                  <span className="font-term text-[12px] uppercase tracking-widest text-grid">
                    icon
                  </span>
                  <div
                    className="flex h-28 w-28 items-center justify-center border-2 border-grid bg-screen p-3"
                    style={{ boxShadow: '0 0 0 2px #06080d, 0 0 0 4px #1b2130' }}
                  >
                    <Component />
                  </div>
                </div>

                {/* With wordmark */}
                <div className="col-span-2 flex flex-col justify-center gap-3">
                  <span className="font-term text-[12px] uppercase tracking-widest text-grid">
                    lockup
                  </span>
                  <div className="flex items-center gap-4 border-2 border-grid bg-void p-4">
                    <div className="h-14 w-14 shrink-0">
                      <Component />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Wordmark size="lg" />
                      <span className="font-term text-[14px] text-ash">
                        // onboarding arcade
                      </span>
                    </div>
                  </div>

                  {/* Favicon row */}
                  <div className="flex items-center gap-4">
                    <span className="font-term text-[12px] uppercase tracking-widest text-grid">
                      32px
                    </span>
                    <div className="h-8 w-8 border border-grid bg-screen p-0.5">
                      <Component />
                    </div>
                    <span className="font-term text-[12px] uppercase tracking-widest text-grid">
                      16px
                    </span>
                    <div className="h-4 w-4 border border-grid bg-screen">
                      <Component />
                    </div>
                  </div>
                </div>
              </div>

              {/* Header mock */}
              <div className="border-t-2 border-grid pt-4">
                <span className="mb-2 block font-term text-[12px] uppercase tracking-widest text-grid">
                  header mock
                </span>
                <div className="flex items-center justify-between border-2 border-grid bg-void px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6">
                      <Component />
                    </div>
                    <Wordmark size="sm" />
                  </div>
                  <span
                    className="crt-tag text-[10px]"
                    style={{ borderColor: '#2bd9ff', color: '#2bd9ff' }}
                  >
                    NET: devnet
                  </span>
                </div>
              </div>
            </div>
          </CrtPanel>
        ))}
      </div>

      <footer className="mt-12 text-center">
        <p className="font-term text-[16px] text-ash">
          Reply with the number(s) you like — e.g.{' '}
          <span className="text-phosphor">1</span>,{' '}
          <span className="text-phosphor">2</span>, or{' '}
          <span className="text-cyan">2 + 4</span>
        </p>
        <p className="mt-2 font-term text-[14px] text-grid">
          <span className="animate-blink text-phosphor">█</span> /logo-preview
        </p>
      </footer>
    </main>
  );
}
