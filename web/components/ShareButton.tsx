'use client';

import { useState } from 'react';

export function ShareButton({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GleanAI // Solana Sprint', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled - ignore */
    }
  }

  return (
    <button className="arcade-btn" onClick={onShare}>
      {copied ? 'Link copied!' : 'Share result'}
    </button>
  );
}
