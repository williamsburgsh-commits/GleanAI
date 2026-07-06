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

function clearStatHighlights(refs: BattleTimelineRefs) {
  for (const card of [refs.challengerCard, refs.opponentCard]) {
    card.querySelectorAll('[data-stat]').forEach((el) => {
      el.classList.remove('ring-2', 'ring-phosphor', 'ring-red-500', 'opacity-50', 'scale-105');
    });
  }
}

function highlightStat(
  refs: BattleTimelineRefs,
  stat: StatKey,
  winner: 'challenger' | 'opponent' | 'tie'
) {
  clearStatHighlights(refs);
  const cEl = refs.challengerCard.querySelector(`[data-stat="${stat}"]`);
  const oEl = refs.opponentCard.querySelector(`[data-stat="${stat}"]`);
  if (winner === 'challenger') {
    cEl?.classList.add('ring-2', 'ring-phosphor', 'scale-105');
    oEl?.classList.add('opacity-50', 'ring-2', 'ring-red-500');
  } else if (winner === 'opponent') {
    oEl?.classList.add('ring-2', 'ring-phosphor', 'scale-105');
    cEl?.classList.add('opacity-50', 'ring-2', 'ring-red-500');
  } else {
    cEl?.classList.add('ring-2', 'ring-amber');
    oEl?.classList.add('ring-2', 'ring-amber');
  }
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

  const tl = gsap.timeline({
    onComplete,
    defaults: { ease: 'power2.out' },
  });

  refs.skipBtn.onclick = () => {
    tl.progress(1);
  };

  if (reducedMotion) {
    tl.set(refs.victoryText, { opacity: 1, scale: 1 });
    tl.set(refs.pointsEl, { textContent: `+${pointsAwarded}` });
    return tl;
  }

  gsap.set(refs.challengerCard, { x: -140, opacity: 0 });
  gsap.set(refs.opponentCard, { x: 140, opacity: 0 });
  gsap.set(refs.victoryText, { opacity: 0, scale: 0.7 });
  gsap.set(refs.pointsEl, { textContent: '+0' });

  tl.to(refs.challengerCard, { x: 0, opacity: 1, duration: 0.55 })
    .to(refs.opponentCard, { x: 0, opacity: 1, duration: 0.55 }, '<0.08')
    .to({}, { duration: 0.35 });

  for (const round of resolution.rounds) {
    const stat = round.stat as StatKey;
    tl.add(() => highlightStat(refs, stat, round.winner));
    tl.fromTo(
      [refs.challengerCard, refs.opponentCard],
      { scale: 1 },
      { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1 },
      '<'
    );
    tl.to({}, { duration: 0.65 });

    if (resolution.decidingStat === stat) {
      tl.add(() => refs.flash.classList.add('battle-flash'));
      tl.to(refs.arena, {
        x: '+=6',
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: 'power1.inOut',
        onComplete: () => gsap.set(refs.arena, { x: 0 }),
      });
      tl.add(() => refs.flash.classList.remove('battle-flash'));
    }
  }

  const loser = challengerWon ? refs.opponentCard : refs.challengerCard;
  const winner = challengerWon ? refs.challengerCard : refs.opponentCard;

  tl.add(() => {
    loser.classList.add('fighter-shatter');
    loser.style.pointerEvents = 'none';
  });
  tl.to(winner, {
    scale: 1.08,
    duration: 0.45,
    ease: 'power2.inOut',
  });
  tl.to(
    refs.victoryText,
    { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' },
    '<0.1'
  );

  const counter = { value: 0 };
  tl.to(counter, {
    value: pointsAwarded,
    duration: 1.1,
    ease: 'power1.out',
    onUpdate: () => {
      refs.pointsEl.textContent = `+${Math.round(counter.value)}`;
    },
  });

  return tl;
}
