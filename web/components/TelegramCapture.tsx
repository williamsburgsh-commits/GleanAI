'use client';

import { useEffect, useState } from 'react';
import { rememberTelegramId, getTelegramId } from '@/lib/phantom';

// Captures the ?tg=<telegram_id> param the bot appends to the web link and
// stores it locally so the connect callback can tie the wallet to the user.
export function TelegramCapture() {
  const [tg, setTg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('tg');
    if (param && /^\d+$/.test(param)) {
      rememberTelegramId(param);
      setTg(param);
    } else {
      setTg(getTelegramId());
    }
  }, []);

  if (tg) {
    return (
      <span className="crt-tag" title="Linked Telegram session">
        <i className="h-1.5 w-1.5 rounded-full bg-phosphor" />
        PLAYER #{tg}
      </span>
    );
  }

  return (
    <span className="crt-tag border-amber/40 bg-amber/10 text-amber">
      <i className="h-1.5 w-1.5 rounded-full bg-amber" />
      NO SESSION — OPEN FROM BOT
    </span>
  );
}
