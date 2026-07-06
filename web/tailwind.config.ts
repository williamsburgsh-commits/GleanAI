import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── ArcAI palette: 4 colors, used consistently as a cabinet would ──
        // 1. Cabinet black (the housing — everything sits on this)
        void: '#06080d', // near-black background, slightly blue
        screen: '#0a0e15', // the "tube" surface behind content
        slate: '#11151f',
        grid: '#1b2130',
        bone: '#e7ece5', // primary text (off-white phosphor)
        ash: '#7d8694', // muted text / chrome

        // 2. Neon accent — primary action color (green phosphor)
        phosphor: '#27ff7d',
        // 3. Secondary accent — highlight / locked / cyan blue
        cyan: '#2bd9ff',
        // 4. Warning / locked color — used sparingly (amber)
        amber: '#ffb437',
        magenta: '#ff3da6', // kept ONLY for danger/errors + brand "AI" dot

        // status helpers mapping to the 4 above
        ok: '#27ff7d',
        warn: '#ffb437',
        danger: '#ff3da6',
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
        bevel: '0 0 0 2px #06080d, 0 0 0 4px #1b2130',
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
      },
      animation: {
        flicker: 'flicker 8s infinite',
        blink: 'blink 1.1s steps(1) infinite',
        coin: 'coin 1.1s steps(1) infinite',
        scan: 'scan 7s linear infinite',
        marquee: 'marquee 24s linear infinite',
        glitch: 'glitch 0.32s steps(2) 1',
        scanroll: 'scanroll 8s linear infinite',
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
