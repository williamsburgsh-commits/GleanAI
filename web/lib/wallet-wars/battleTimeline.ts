import gsap from 'gsap';
import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';
import type { StatKey } from '@/lib/wallet-wars/fighterStats';

export interface BattleTimelineRefs {
  arena: HTMLElement;
  challengerCard: HTMLElement;
  opponentCard: HTMLElement;
  flash: HTMLElement;
  victoryText: HTMLElement;
  pointsEl: HTMLElement;
  skipBtn: HTMLElement;
}

export function createBattleTimeline(
  refs: BattleTimelineRefs,
  resolution: BattleResolution,
  challengerWon: boolean,
  pointsAwarded: number,
  onComplete: () => void
): gsap.core.Timeline {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tl = gsap.timeline({ onComplete });

  if (reducedMotion) {
    tl.set(refs.victoryText, { opacity: 1, textContent: challengerWon ? 'VICTORY' : 'DEFEAT' });
    tl.to(refs.pointsEl, { duration: 0.3, innerText: `+${pointsAwarded}` });
    return tl;
  }

  tl.fromTo(
    refs.challengerCard,
    { x: -120, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
  ).fromTo(
    refs.opponentCard,
    { x: 120, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
    '<'
  );

  for (const round of resolution.rounds) {
    const stat = round.stat as StatKey;
    tl.add(() => {
      refs.challengerCard
        .querySelector(`[data-stat="${stat}"]`)
        ?.classList.add(round.winner === 'challenger' ? 'ring-2 ring-phosphor' : 'opacity-50');
      refs.opponentCard
        .querySelector(`[data-stat="${stat}"]`)
        ?.classList.add(round.winner === 'opponent' ? 'ring-2 ring-phosphor' : 'opacity-50');
    });
    tl.to({}, { duration: 0.8 });

    if (resolution.decidingStat === stat) {
      tl.add(() => refs.flash.classList.add('battle-flash'));
      tl.to(refs.arena, { duration: 0.4, className: '+=animate-battle-shake' });
      tl.add(() => refs.flash.classList.remove('battle-flash'));
    }
  }

  const loser = challengerWon ? refs.opponentCard : refs.challengerCard;
  const winner = challengerWon ? refs.challengerCard : refs.opponentCard;

  tl.to(loser, { duration: 0.6, className: '+=fighter-shatter' });
  tl.to(winner, { x: 0, duration: 0.5, ease: 'power2.inOut' });
  tl.fromTo(
    refs.victoryText,
    { opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1, duration: 0.4 }
  );
  tl.fromTo(
    refs.pointsEl,
    { innerText: '0' },
    {
      duration: 1,
      innerText: pointsAwarded,
      snap: { innerText: 1 },
      ease: 'power1.out',
    }
  );

  tl.eventCallback('onStart', () => {
    refs.skipBtn.onclick = () => tl.progress(1);
  });

  return tl;
}
