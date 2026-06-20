'use client';

import { useEffect, useState } from 'react';

export interface RecipientUser {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  wallet_address: string | null;
  points: number;
}

function shorten(addr: string | null) {
  return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : 'no wallet';
}

export function RecipientPicker({
  onPick,
  selectedId,
}: {
  onPick: (u: RecipientUser) => void;
  selectedId?: string;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<RecipientUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/users?query=${encodeURIComponent(query)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active) setUsers(data.users ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search username / id / wallet…"
        className="mb-3 w-full rounded-sm border border-grid bg-slate/60 px-3 py-2 text-xs text-bone outline-none focus:border-phosphor"
      />
      <div className="max-h-52 overflow-y-auto rounded-sm border border-grid">
        {loading && users.length === 0 ? (
          <p className="p-3 text-[11px] text-ash">Searching…</p>
        ) : users.length === 0 ? (
          <p className="p-3 text-[11px] text-ash">No users found.</p>
        ) : (
          <ul className="divide-y divide-grid">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => onPick(u)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[11px] transition-colors hover:bg-phosphor/10 ${
                    selectedId === u.id ? 'bg-phosphor/15' : ''
                  }`}
                >
                  <span className="text-bone">
                    {u.telegram_username ? `@${u.telegram_username}` : `#${u.telegram_id}`}
                  </span>
                  <span className="text-ash">{shorten(u.wallet_address)}</span>
                  <span className="text-amber">{u.points} pts</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
