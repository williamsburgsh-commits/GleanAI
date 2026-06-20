import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Arcade Speedrun Terminal palette
        void: '#05060a',
        carbon: '#0b0e16',
        slate: '#11151f',
        grid: '#1b2130',
        phosphor: '#39ff7a', // primary CRT green
        amber: '#ffb347',
        magenta: '#ff3da6',
        cyan: '#37e6ff',
        bone: '#e7ece5',
        ash: '#7d8694',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        crt: '0 0 0 1px rgba(57,255,122,0.25), 0 0 24px rgba(57,255,122,0.12)',
        'crt-magenta': '0 0 0 1px rgba(255,61,166,0.3), 0 0 24px rgba(255,61,166,0.15)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.78' },
          '94%': { opacity: '1' },
          '97%': { opacity: '0.85' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        flicker: 'flicker 6s infinite',
        blink: 'blink 1s steps(1) infinite',
        scan: 'scan 7s linear infinite',
        marquee: 'marquee 22s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
