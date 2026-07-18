'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AccentTone } from '@/lib/palette';

const TONE_TEXT: Record<AccentTone, string> = {
  phosphor: 'text-phosphor',
  cyan: 'text-cyan',
  amber: 'text-amber',
  magenta: 'text-magenta',
};

const TONE_RULE: Record<AccentTone, string> = {
  phosphor: 'bg-phosphor/40',
  cyan: 'bg-cyan/40',
  amber: 'bg-amber/40',
  magenta: 'bg-magenta/40',
};

export function LandingReveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function LandingSection({
  id,
  eyebrow,
  title,
  tone = 'phosphor',
  alt = false,
  children,
  className = '',
}: {
  id?: string;
  eyebrow: string;
  title?: string;
  tone?: AccentTone;
  alt?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <LandingReveal>
      <section
        id={id}
        className={`px-4 py-12 sm:px-6 sm:py-16 ${alt ? 'bg-screen/40' : ''} ${className}`}
      >
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <p
              className={`font-pixel text-[10px] uppercase tracking-[0.18em] ${TONE_TEXT[tone]}`}
            >
              {eyebrow}
            </p>
            <div className={`mt-3 h-px w-16 ${TONE_RULE[tone]}`} aria-hidden />
            {title ? (
              <h2 className="mt-4 font-term text-[22px] leading-snug text-bone sm:text-[24px]">
                {title}
              </h2>
            ) : null}
          </header>
          {children}
        </div>
      </section>
    </LandingReveal>
  );
}
