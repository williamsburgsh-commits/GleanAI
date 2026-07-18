const GITHUB_REPO = 'https://github.com/williamsburgsh-commits/GleanAI';

export function OpenSourceBar() {
  return (
    <div
      className="flex w-full items-center justify-center border-t-2 border-grid bg-screen px-3 py-3 text-center"
      role="contentinfo"
    >
      <p className="font-pixel text-[7px] uppercase leading-relaxed tracking-[0.16em] text-mute sm:text-[8px]">
        OPEN SOURCE · MIT LICENSE · BUILT ON HELIUS ·{' '}
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-phosphor transition-opacity hover:opacity-80"
        >
          FORK IT ON GITHUB →
        </a>
      </p>
    </div>
  );
}
