import { CrtBannerCanvas } from '@/components/banner/CrtBannerCanvas';

export const metadata = {
  title: 'GleanAI // Banner Export',
  description: 'CRT arcade banner generator — 1500×500 PNG export.',
};

export default function BannerPreviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-8 sm:px-6">
      <header className="mb-10 text-center">
        <p className="mb-3 font-term text-[16px] uppercase tracking-[0.25em] text-ash">
          {'// banner lab'}
        </p>
        <h1 className="font-pixel text-xl leading-relaxed text-bone sm:text-2xl">
          CRT <span className="text-phosphor">banner</span> export
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-term text-[18px] text-ash">
          1500×500 arcade cabinet screen. Animate in the browser, export a clean static
          PNG for X headers and social covers.
        </p>
      </header>

      <CrtBannerCanvas />
    </main>
  );
}
