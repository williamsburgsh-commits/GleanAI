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
        className="crt-input mb-3 text-[16px]"
      />
      <div className="max-h-52 overflow-y-auto bg-screen" style={{ border: '2px solid #1b2130' }}>
        {loading && users.length === 0 ? (
          <p className="p-3 font-term text-[16px] text-ash">Searching…</p>
        ) : users.length === 0 ? (
          <p className="p-3 font-term text-[16px] text-ash">No users found.</p>
        ) : (
          <ul>
            {users.map((u, idx) => (
              <li key={u.id} className={idx > 0 ? 'border-t-2 border-grid' : ''}>
                <button
                  onClick={() => onPick(u)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-term text-[16px] transition-colors hover:bg-phosphor/10"
                  style={selectedId === u.id ? { background: 'rgba(39,255,125,0.12)' } : undefined}
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
