import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import {
  FINALIST_LOGOS,
  GleanLogo,
  GleanLogoLockup,
  GleanWordmark,
} from '@/components/logo/GleanLogo';

export const metadata = {
  title: 'GleanAI // Logo Finalists',
  description: 'Refined logo concepts #2, #6, and #8.',
};

export default function LogoFinalistsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-10 text-center">
        <Link
          href="/logo-preview"
          className="mb-4 inline-block font-term text-[15px] text-cyan underline"
        >
          ← all 8 concepts
        </Link>
        <p className="mb-3 font-term text-[16px] uppercase tracking-[0.25em] text-ash">
          {'// finalists'}
        </p>
        <h1 className="font-pixel text-2xl leading-relaxed text-bone sm:text-4xl">
          <span className="text-phosphor">2</span>
          <span className="text-ash"> · </span>
          <span className="text-amber">6</span>
          <span className="text-ash"> · </span>
          <span className="text-magenta">8</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg font-term text-[18px] text-ash">
          Polished versions of your picks. Pick one primary mark — or we can use
          different variants per context (header vs Receipt vs Wallet Wars).
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {FINALIST_LOGOS.map(({ id, variant, name, tagline, bestFor, animated }) => (
          <CrtPanel
            key={id}
            label={`#${id} // ${name.toUpperCase()}`}
            tone={id === 2 ? 'phosphor' : id === 6 ? 'amber' : 'cyan'}
          >
            <div className="flex flex-col gap-6">
              <div>
                <p className="font-term text-[18px] text-bone">{tagline}</p>
                <p className="mt-1 font-term text-[15px] text-ash">
                  Best for: <span className="text-cyan">{bestFor}</span>
                </p>
              </div>

              {/* Hero presentation */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className="flex items-center justify-center border-2 border-grid bg-screen p-8"
                  style={{ boxShadow: '0 0 0 2px #06080d, 0 0 0 4px #1b2130' }}
                >
                  <div className="h-36 w-36">
                    <GleanLogo variant={variant} animated={animated} />
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4 border-2 border-grid bg-void p-6">
                  <GleanLogoLockup
                    variant={variant}
                    animated={animated}
                    size="xl"
                    showTagline
                  />
                </div>
              </div>

              {/* Size scale */}
              <div className="flex flex-wrap items-end gap-6 border-t-2 border-grid pt-5">
                <SizeSample label="128px" className="h-32 w-32">
                  <GleanLogo variant={variant} animated={animated} />
                </SizeSample>
                <SizeSample label="48px" className="h-12 w-12">
                  <GleanLogo variant={variant} animated={animated} />
                </SizeSample>
                <SizeSample label="32px" className="h-8 w-8">
                  <GleanLogo variant={variant} animated={animated} />
                </SizeSample>
                <SizeSample label="16px" className="h-4 w-4">
                  <GleanLogo variant={variant} animated={false} />
                </SizeSample>
              </div>

              {/* Context mocks */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ContextMock label="site header">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7">
                        <GleanLogo variant={variant} animated={animated} />
                      </div>
                      <GleanWordmark size="sm" />
                    </div>
                    <span
                      className="crt-tag text-[10px]"
                      style={{ borderColor: '#2bd9ff', color: '#2bd9ff' }}
                    >
                      NET: devnet
                    </span>
                  </div>
                </ContextMock>

                <ContextMock label="telegram / app icon">
                  <div className="flex items-center justify-center p-6">
                    <div
                      className="flex h-20 w-20 items-center justify-center border-2 border-phosphor/40 bg-void p-3"
                      style={{ borderRadius: '18%' }}
                    >
                      <GleanLogo variant={variant} animated={animated} />
                    </div>
                  </div>
                </ContextMock>

                {variant === 'receipt' ? (
                  <ContextMock label="receipt header" className="sm:col-span-2">
                    <div className="px-4 py-3 text-center">
                      <div className="mx-auto mb-2 h-8 w-8">
                        <GleanLogo variant={variant} />
                      </div>
                      <p className="font-pixel text-[9px] text-phosphor">
                        GLEANAI // THE RECEIPT
                      </p>
                      <p className="mt-1 font-term text-[14px] text-ash">
                        lifetime solana fees · printed on-chain
                      </p>
                    </div>
                  </ContextMock>
                ) : null}

                {variant === 'wallet-bolt' ? (
                  <ContextMock label="wallet wars card back" className="sm:col-span-2">
                    <div
                      className="relative mx-auto flex w-32 flex-col items-center justify-center border-4 border-cyan/60 bg-[#0a1628] py-6"
                      style={{ aspectRatio: '2.5 / 3.5' }}
                    >
                      <div className="mb-2 h-10 w-10">
                        <GleanLogo variant={variant} />
                      </div>
                      <GleanWordmark size="sm" />
                      <p className="mt-2 font-pixel text-[5px] text-cyan/80">
                        WALLET WARS
                      </p>
                    </div>
                  </ContextMock>
                ) : null}
              </div>
            </div>
          </CrtPanel>
        ))}
      </div>

      <section className="mt-12 border-2 border-grid bg-screen p-6 text-center">
        <h2 className="font-pixel text-sm text-phosphor sm:text-base">
          Next step
        </h2>
        <p className="mx-auto mt-3 max-w-md font-term text-[17px] text-ash">
          Reply with your <span className="text-phosphor">#1 pick</span> for the
          primary logo — or say{' '}
          <span className="text-cyan">multi-variant</span> to use CRT in the
          header, Wallet+Bolt in battles, Receipt on share cards.
        </p>
      </section>

      <footer className="mt-8 text-center">
        <p className="font-term text-[14px] text-grid">
          <span className="animate-blink text-phosphor">█</span> /logo-preview/finalists
        </p>
      </footer>
    </main>
  );
}

function SizeSample({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-term text-[12px] uppercase tracking-widest text-grid">
        {label}
      </span>
      <div className={`border border-grid bg-screen p-0.5 ${className}`}>
        {children}
      </div>
    </div>
  );
}

function ContextMock({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-2 block font-term text-[12px] uppercase tracking-widest text-grid">
        {label}
      </span>
      <div className="border-2 border-grid bg-void">{children}</div>
    </div>
  );
}
