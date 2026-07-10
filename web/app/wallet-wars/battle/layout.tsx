import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet Wars Battle — GleanAI',
  description: 'Scan your wallet. Fight in Wallet Wars on GleanAI.',
  openGraph: {
    title: 'Wallet Wars — Challenge Accepted',
    description: 'Scan your wallet. Fight.',
    images: ['/wallet-wars/battle/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wallet Wars — Challenge Accepted',
    description: 'Scan your wallet. Fight.',
  },
};

export default function BattleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
