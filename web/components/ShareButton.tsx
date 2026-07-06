'use client';

import { useState } from 'react';

export function ShareButton({
  url,
  text,
  twitterText,
}: {
  url: string;
  text: string;
  twitterText?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GleanAI // Wallet Wars', text, url });
      } else {
        await navigator.clipboard.writeText(twitterText ?? `${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }

  function onTwitter() {
    const tweet = encodeURIComponent(twitterText ?? `${text}\n${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button className="arcade-btn" onClick={onShare}>
        {copied ? 'Link copied!' : 'Share result'}
      </button>
      <button type="button" className="chip-btn-cyan" onClick={onTwitter}>
        Share on X
      </button>
    </div>
  );
}
