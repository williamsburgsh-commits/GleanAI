'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';
import { PixelStar, PixelTrophy } from '@/components/PixelArt';
import { LEADERBOARD_MIN_POINTS } from '@/lib/points/rules';

interface LeaderRow {
  rank: number;
  telegramId: string;
  username: string | null;
  points: number;
}

type BoardMode = 'alltime' | 'epoch';

interface RankTabProps {
  telegramId: string | null;
}

export function RankTab({ telegramId }: RankTabProps) {
  const [mode, setMode] = useState<BoardMode>('epoch');
  const [top, setTop] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState(0);
  const [epochSlug, setEpochSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBoard = useCallback(async (tg: string | null, boardMode: BoardMode) => {
    try {
      setLoadError(null);
      const qs = new URLSearchParams({ mode: boardMode, limit: '50' });
      if (tg) qs.set('telegramId', tg);
      const res = await fetch(`/api/leaderboard?${qs}`);
      if (!res.ok) throw new Error('Failed to load leaderboard.');
      const data = await res.json();
      setTop(data.top ?? []);
      setMyRank(data.myRank ?? null);
      setMyPoints(data.myPoints ?? 0);
      setEpochSlug(data.epoch?.slug ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
    }
  }, []);

  useEffect(() => {
    loadBoard(telegramId, mode);
  }, [telegramId, mode, loadBoard]);

  return (
    <CrtPanel label="LEADERBOARD // ARCADE RANKINGS" tone="amber">
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('epoch')}
          className={mode === 'epoch' ? 'chip-btn-amber' : 'chip-btn'}
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setMode('alltime')}
          className={mode === 'alltime' ? 'chip-btn-amber' : 'chip-btn'}
        >
          All-time
        </button>
      </div>

      {mode === 'epoch' && epochSlug ? (
        <p className="mb-3 font-term text-[14px] uppercase tracking-[0.15em] text-ash">
          Epoch {epochSlug} · min {LEADERBOARD_MIN_POINTS} pts + wallet
        </p>
      ) : (
        <p className="mb-3 font-term text-[14px] uppercase tracking-[0.15em] text-ash">
          All-time · min {LEADERBOARD_MIN_POINTS} pts + linked wallet
        </p>
      )}

      {myRank != null ? (
        <p className="mb-4 font-term text-[16px] text-phosphor">
          Your rank: #{myRank} · {myPoints} pts
        </p>
      ) : telegramId ? (
        <p className="mb-4 font-term text-[16px] text-ash">
          Link wallet and earn {LEADERBOARD_MIN_POINTS}+ pts to rank.
        </p>
      ) : null}

      {loadError ? (
        <p className="font-term text-[16px] text-magenta">{loadError}</p>
      ) : top.length === 0 ? (
        <p className="py-4 font-term text-[16px] text-ash">No ranked players yet.</p>
      ) : (
        <ul>
          {top.map((row, idx) => {
            const isMe = row.telegramId === telegramId;
            return (
              <li
                key={`${row.telegramId}-${row.rank}`}
                className={`flex items-center justify-between py-2 font-term text-[18px] ${
                  idx > 0 ? 'border-t-2 border-grid' : ''
                } ${isMe ? 'text-phosphor' : 'text-bone'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-ash">
                    {row.rank.toString().padStart(2, '0')}
                  </span>
                  {row.username ? `@${row.username}` : `#${row.telegramId}`}
                  {isMe ? (
                    <span className="font-term text-[14px] text-phosphor">YOU</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1 text-amber">
                  <span className="h-2.5 w-2.5">
                    <PixelStar />
                  </span>
                  {row.points}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2 text-ash">
        <span className="h-4 w-4 text-amber">
          <PixelTrophy />
        </span>
        <span className="font-term text-[14px]">Points convert to $GLEAN at launch.</span>
      </div>
    </CrtPanel>
  );
}
