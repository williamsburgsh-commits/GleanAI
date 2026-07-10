import type { NextAction, NextActionPostRequest } from '@solana/actions';
import { actionJson, actionOptions } from '@/lib/actions/cors';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import {
  durationMsFromBlinkNonce,
  persistGhostRaceRun,
} from '@/lib/ghost-race/persistGhostRaceRun';
import {
  formatFeeUsd,
  formatRaceDuration,
} from '@/lib/ghost-race/ghostChains';

export const runtime = 'nodejs';
export const maxDuration = 30;

function iconUrl(request: Request): string {
  const base = getPublicWebAppUrl() || new URL(request.url).origin;
  return `${base}/brand/gleanai-pfp.png`;
}

export const OPTIONS = async () => actionOptions();

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const raceNonce = (searchParams.get('nonce') || '').trim();

  let body: NextActionPostRequest;
  try {
    body = await request.json();
  } catch {
    return actionJson({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const account = typeof body.account === 'string' ? body.account.trim() : '';
  const signature =
    typeof body.signature === 'string' ? body.signature.trim() : '';

  if (!raceNonce) {
    return actionJson({ message: 'Missing race nonce.' }, { status: 400 });
  }
  if (!account || !signature) {
    return actionJson(
      { message: 'account and signature required.' },
      { status: 400 }
    );
  }

  const durationMs = durationMsFromBlinkNonce(raceNonce);
  if (durationMs == null) {
    return actionJson(
      {
        message: 'Invalid or expired race nonce. Tap RACE NOW again.',
      },
      { status: 400 }
    );
  }

  const result = await persistGhostRaceRun({
    walletAddress: account,
    signature,
    raceNonce,
    durationMs,
    requestOrigin: new URL(request.url).origin,
  });

  if (!result.ok) {
    return actionJson({ message: result.error }, { status: result.status });
  }

  const time = formatRaceDuration(result.durationMs);
  const fee =
    result.feeUsd != null ? ` Fee: ${formatFeeUsd(result.feeUsd)}.` : '';
  const base = getPublicWebAppUrl() || new URL(request.url).origin;

  const next: NextAction = {
    type: 'action',
    title: `Ghost Race — ${time}`,
    icon: iconUrl(request),
    description: `Confirmed in ${time} on Solana. Ethereum's ghost is still pending.${fee}`,
    label: 'VIEW RESULT',
    links: {
      actions: [
        {
          type: 'external-link',
          label: 'VIEW RESULT',
          href: result.resultUrl,
        },
        {
          type: 'transaction',
          label: 'RACE AGAIN',
          href: `${base}/api/actions/ghost-race`,
        },
      ],
    },
  };

  return actionJson(next);
}
