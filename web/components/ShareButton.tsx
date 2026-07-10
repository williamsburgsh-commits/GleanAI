'use client';

import { useState } from 'react';

export function ShareButton({
  url,
  text,
  twitterText,
  variant = 'stack',
}: {
  url: string;
  text: string;
  twitterText?: string;
  /** `compact`: primary SHARE ON X + secondary COPY LINK. `stack`: legacy dual arcade buttons. */
  variant?: 'stack' | 'compact';
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

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function onTwitter() {
    const tweet = encodeURIComponent(twitterText ?? `${text}\n${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener,noreferrer');
  }

  if (variant === 'compact') {
    return (
      <div className="flex w-full flex-col items-stretch gap-2">
        <button type="button" className="arcade-btn w-full" onClick={onTwitter}>
          SHARE ON X
        </button>
        <button type="button" className="chip-btn w-full text-center" onClick={onCopyLink}>
          {copied ? 'LINK COPIED!' : 'COPY LINK'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <button type="button" className="arcade-btn w-full" onClick={onShare}>
        {copied ? 'LINK COPIED!' : 'SHARE RESULT'}
      </button>
      <button type="button" className="arcade-btn w-full" onClick={onTwitter}>
        SHARE ON X
      </button>
    </div>
  );
}
