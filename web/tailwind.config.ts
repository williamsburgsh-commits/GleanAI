import type { Config } from 'tailwindcss';
import { palette } from './lib/palette';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces & chrome
        void: palette.void,
        screen: palette.screen,
        slate: palette.slate,
        grid: palette.grid,
        // Text
        bone: palette.bone,
        ash: palette.ash,
        mute: palette.mute,
        dim: palette.dim,
        // Accents (see web/lib/palette.ts role map)
        phosphor: palette.phosphor,
        cyan: palette.cyan,
        amber: palette.amber,
        magenta: palette.magenta,
        // Status aliases
        ok: palette.phosphor,
        warn: palette.amber,
        danger: palette.magenta,
      },
      fontFamily: {
        // Press Start 2P for headlines/labels, VT323 for body (pixel font that
        // is actually readable at small sizes). Both are genuine bitmap/pixel
        // faces rather than generic monospace.
        pixel: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        term: ['"VT323"', 'ui-monospace', 'monospace'],
        mono: ['"VT323"', 'ui-monospace', 'monospace'],
        display: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // chunky 3D arcade-button drop (the dark "plunger" under a button)
        'plunger': '0 5px 0 0 #04130a, 0 6px 0 0 rgba(0,0,0,0.6)',
        'plunger-cyan': '0 5px 0 0 #04161d, 0 6px 0 0 rgba(0,0,0,0.6)',
        'plunger-amber': '0 5px 0 0 #1a1106, 0 6px 0 0 rgba(0,0,0,0.6)',
        'plunger-sm': '0 3px 0 0 #04130a, 0 4px 0 0 rgba(0,0,0,0.6)',
        // crisp 1px cabinet bevel instead of soft glow
        bevel: `0 0 0 2px ${palette.void}, 0 0 0 4px ${palette.grid}`,
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '90%': { opacity: '1' },
          '91%': { opacity: '0.7' },
          '92%': { opacity: '1' },
          '96%': { opacity: '0.85' },
          '97%': { opacity: '1' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        // "INSERT COIN" slow attract blink for the primary CTA
        coin: {
          '0%, 70%': { opacity: '1' },
          '71%, 100%': { opacity: '0.25' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // one-shot glitch used on hover, not constant
        glitch: {
          '0%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
          '20%': { clipPath: 'inset(20% 0 40% 0)', transform: 'translate(-1px,0)' },
          '40%': { clipPath: 'inset(60% 0 10% 0)', transform: 'translate(1px,0)' },
          '60%': { clipPath: 'inset(10% 0 70% 0)', transform: 'translate(-1px,0)' },
          '80%': { clipPath: 'inset(40% 0 30% 0)', transform: 'translate(1px,0)' },
          '100%': { clipPath: 'inset(0 0 0 0)', transform: 'translate(0)' },
        },
        scanroll: {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        holoShimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        battleShake: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-4px, 2px)' },
          '40%': { transform: 'translate(4px, -2px)' },
          '60%': { transform: 'translate(-3px, -3px)' },
          '80%': { transform: 'translate(3px, 2px)' },
        },
        shatter: {
          '0%': { clipPath: 'inset(0 0 0 0)', opacity: '1' },
          '100%': {
            clipPath: 'polygon(0% 0%, 20% 5%, 5% 25%, 30% 40%, 10% 60%, 40% 80%, 0% 100%, 100% 100%, 95% 70%, 80% 50%, 100% 20%, 70% 0%)',
            opacity: '0',
          },
        },
        scrollCue: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        flicker: 'flicker 8s infinite',
        blink: 'blink 1.1s steps(1) infinite',
        coin: 'coin 1.1s steps(1) infinite',
        scan: 'scan 7s linear infinite',
        marquee: 'marquee 24s linear infinite',
        glitch: 'glitch 0.32s steps(2) 1',
        scanroll: 'scanroll 8s linear infinite',
        'holo-shimmer': 'holoShimmer 3s linear infinite',
        'battle-shake': 'battleShake 0.4s steps(2) 1',
        shatter: 'shatter 0.6s steps(4) forwards',
        'scroll-cue': 'scrollCue 2.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        // no smooth easing — snappy like a coin mech
        snap: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
