import { accents } from '@/lib/palette';

export function WhatsInsidePreview() {
  return (
    <div
      className="crt-panel scanlines p-5 sm:p-6"
      style={{ borderColor: `${accents.cyan}66` }}
    >
      <p className="font-term text-[18px] leading-snug text-bone sm:text-[19px]">
        Three game modes unlock after you connect. Pick your path from the hub — battle,
        print a fee receipt, or speedrun onboarding.
      </p>
      <p className="mt-4 font-pixel text-[8px] uppercase tracking-[0.16em] text-mute">
        Available after you connect → scroll for previews
      </p>
    </div>
  );
}
