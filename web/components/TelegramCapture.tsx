'use client';

import { useEffect, useState } from 'react';
import { rememberTelegramId, getTelegramId } from '@/lib/phantom';

// Captures the ?tg=<telegram_id> param the bot appends to the web link and
// stores it locally so the connect callback can tie the wallet to the user.
export function TelegramCapture() {
  const [tg, setTg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Invite links may carry the creator's ?tg= — never adopt that as our session.
    const isBattleInvite = Boolean(params.get('invite'));
    const inMiniApp = Boolean(window.Telegram?.WebApp?.initData);
    const param = params.get('tg');
    if (!isBattleInvite && !inMiniApp && param && /^\d+$/.test(param)) {
      rememberTelegramId(param);
      setTg(param);
    } else {
      setTg(getTelegramId());
    }
  }, []);

  if (tg) {
    return (
      <span className="crt-tag" title="Linked Telegram session">
        <i className="h-1.5 w-1.5 bg-phosphor" style={{ boxShadow: '0 0 4px #27ff7d' }} />
        PLAYER #{tg}
      </span>
    );
  }

  return (
    <span className="crt-tag" style={{ borderColor: '#ffb437', color: '#ffb437' }}>
      <i className="h-1.5 w-1.5 bg-amber animate-blink" />
      NO SESSION — OPEN FROM BOT
    </span>
  );
}
