import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { TelegramProvider } from '@/components/TelegramProvider';

export const metadata: Metadata = {
  title: 'GleanAI // Solana Sprint',
  description:
    'Speedrun your Solana onboarding. Complete quests, earn points, climb the leaderboard.',
};

export const viewport: Viewport = {
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
