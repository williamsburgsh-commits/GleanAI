'use client';

import { useRef, useCallback, type ReactNode } from 'react';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';

interface HoloCardProps {
  rarity: FighterRarity;
  children: ReactNode;
  className?: string;
}

export function HoloCard({ rarity, children, className = '' }: HoloCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (rarity !== 'legendary' || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      ref.current.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
    },
    [rarity]
  );

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
  }, []);

  const showShimmer = rarity === 'legendary' || rarity === 'epic';
  const shimmerClass =
    rarity === 'legendary'
      ? 'animate-holo-shimmer opacity-45'
      : 'animate-holo-shimmer-epic opacity-35';

  return (
    <div
      ref={ref}
      className={`relative transition-transform duration-200 ease-out ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {showShimmer && (
        <div
          className={`pointer-events-none absolute inset-0 z-10 mix-blend-screen ${shimmerClass}`}
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}
