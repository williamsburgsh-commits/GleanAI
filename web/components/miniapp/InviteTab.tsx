'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';
import { buildTelegramShareLink } from '@/lib/telegramInvite';
import type { TelegramWebApp } from '@/types/telegram';
import { PixelStar, PixelCheck } from '@/components/PixelArt';
import {
  REFERRAL_LIFETIME_CAP,
  REFERRAL_QUESTS_BONUS,
  REFERRAL_QUESTS_REQUIRED,
  REFERRAL_WALLET_BONUS,
} from '@/lib/points/rules';

interface ReferralFriend {
  username: string | null;
  telegramId: string;
  joinedAt: string;
  walletLinked: boolean;
  questCount: number;
  questsRequired: number;
  milestonesComplete: boolean;
  pointsEarnedFromFriend: number;
}

interface ReferralData {
  referralCode: string;
  inviteLink: string;
  botUsername: string;
  earnedLifetime: number;
  earnedThisEpoch: number;
  referFriendQuestCompleted: boolean;
  friends: ReferralFriend[];
}

interface InviteTabProps {
  telegramId: string | null;
  webApp: TelegramWebApp | null;
  haptic: (type: 'success' | 'error' | 'warning') => void;
}

const MAX_PER_FRIEND = REFERRAL_WALLET_BONUS + REFERRAL_QUESTS_BONUS + 100;

function friendLabel(f: ReferralFriend): string {
  if (f.username) return `@${f.username}`;
  const id = f.telegramId;
  return id.length > 6 ? `#${id.slice(0, 3)}…${id.slice(-3)}` : `#${id}`;
}

function friendStatus(f: ReferralFriend): { label: string; tone: 'ash' | 'cyan' | 'phosphor' } {
  if (f.milestonesComplete) return { label: 'Complete', tone: 'phosphor' };
  if (f.questCount >= f.questsRequired) return { label: '3 quests', tone: 'phosphor' };
  if (f.walletLinked) return { label: 'Wallet linked', tone: 'cyan' };
  return { label: 'Joined', tone: 'ash' };
}

export function InviteTab({ telegramId, webApp, haptic }: InviteTabProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const load = useCallback(async (tg: string) => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/referral?telegramId=${tg}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load referral info.');
      }
      setData(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load referral info.');
    }
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    load(telegramId);
  }, [telegramId, load]);

  async function onCopy() {
    if (!data?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(data.inviteLink);
      haptic('success');
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      haptic('error');
      setCopyMsg('Could not copy — long-press the link.');
    }
  }

  function onShare() {
    if (!data?.inviteLink) return;
    const share = buildTelegramShareLink(
      data.inviteLink,
      'Join me on GleanAI — Solana onboarding arcade'
    );
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(share);
    } else {
      window.open(share, '_blank');
    }
    haptic('success');
  }

  if (!telegramId) {
    return (
      <CrtPanel label="INVITE FRIENDS" tone="cyan">
        <p className="font-term text-[16px] text-ash">
          Open GleanAI from the Telegram bot to get your invite link.
        </p>
      </CrtPanel>
    );
  }

  if (loadError) {
    return (
      <CrtPanel label="INVITE FRIENDS" tone="magenta">
        <p className="font-term text-[16px] text-magenta">{loadError}</p>
        <button type="button" onClick={() => load(telegramId)} className="chip-btn mt-3">
          Retry
        </button>
      </CrtPanel>
    );
  }

  if (!data) {
    return (
      <CrtPanel label="INVITE FRIENDS" tone="cyan">
        <p className="font-term text-[17px] text-ash">Loading invite link…</p>
      </CrtPanel>
    );
  }

  return (
    <>
      <CrtPanel label="INVITE FRIENDS" tone="cyan">
        <p className="mb-4 font-term text-[17px] leading-snug text-bone">
          Invite friends · earn up to{' '}
          <span className="text-amber">{MAX_PER_FRIEND} pts</span> per friend (
          {REFERRAL_LIFETIME_CAP} pts lifetime cap).
        </p>

        <p className="mb-1 font-term text-[13px] uppercase tracking-[0.15em] text-ash">
          Your invite link
        </p>
        <p className="mb-3 break-all rounded-sm border border-grid bg-slate/40 p-2 font-mono text-[13px] text-phosphor">
          {data.inviteLink}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className="chip-btn-cyan flex-1">
            {copyMsg ?? 'Copy link'}
          </button>
          <button type="button" onClick={onShare} className="arcade-btn flex-1">
            Share on Telegram
          </button>
        </div>
        <p className="mt-2 font-term text-[13px] text-ash">
          Code: <span className="text-cyan">{data.referralCode}</span>
        </p>
      </CrtPanel>

      <CrtPanel label="HOW IT WORKS" tone="phosphor">
        <ol className="space-y-3 font-term text-[16px] text-bone">
          <li className="flex gap-2">
            <span className="font-pixel text-[10px] text-ash">01</span>
            <span>Friend taps your link and starts the bot (0 pts on join).</span>
          </li>
          <li className="flex gap-2">
            <span className="font-pixel text-[10px] text-ash">02</span>
            <span>
              Friend links wallet → you earn <span className="text-amber">+{REFERRAL_WALLET_BONUS} pts</span>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-pixel text-[10px] text-ash">03</span>
            <span>
              Friend completes {REFERRAL_QUESTS_REQUIRED} quests → you earn{' '}
              <span className="text-amber">+{REFERRAL_QUESTS_BONUS} pts</span> + refer-friend quest (
              +100 pts).
            </span>
          </li>
        </ol>
        <p className="mt-3 font-term text-[13px] text-ash">
          Web-only links do not count — friends must join via the Telegram bot link above.
        </p>
      </CrtPanel>

      <CrtPanel label="EARNINGS" tone="amber">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 font-pixel text-[14px] text-amber glow-amber">
              <span className="h-3 w-3">
                <PixelStar />
              </span>
              {data.earnedThisEpoch}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              this week
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 font-pixel text-[14px] text-phosphor glow-text">
              <span className="h-3 w-3">
                <PixelStar />
              </span>
              {data.earnedLifetime}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              lifetime
            </div>
          </div>
        </div>
        {data.referFriendQuestCompleted ? (
          <p className="mt-3 flex items-center gap-2 font-term text-[14px] text-phosphor">
            <span className="inline-block h-4 w-4">
              <PixelCheck />
            </span>
            Refer-a-friend quest cleared
          </p>
        ) : null}
      </CrtPanel>

      <CrtPanel label="YOUR INVITES" tone="cyan">
        {data.friends.length === 0 ? (
          <p className="py-2 font-term text-[16px] text-ash">
            No invites yet. Share your link to start earning.
          </p>
        ) : (
          <ul>
            {data.friends.map((f, idx) => {
              const status = friendStatus(f);
              const toneClass =
                status.tone === 'phosphor'
                  ? 'text-phosphor'
                  : status.tone === 'cyan'
                    ? 'text-cyan'
                    : 'text-ash';
              return (
                <li
                  key={f.telegramId}
                  className={`py-3 ${idx > 0 ? 'border-t-2 border-grid' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-term text-[17px] text-bone">{friendLabel(f)}</p>
                      <p className={`font-term text-[14px] uppercase tracking-[0.1em] ${toneClass}`}>
                        {status.label}
                        {!f.milestonesComplete && f.walletLinked
                          ? ` · ${f.questCount}/${f.questsRequired} quests`
                          : null}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 font-term text-[15px] text-amber">
                      <span className="h-2.5 w-2.5">
                        <PixelStar />
                      </span>
                      {f.pointsEarnedFromFriend}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CrtPanel>
    </>
  );
}
