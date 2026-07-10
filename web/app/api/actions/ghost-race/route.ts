import {
  createPostResponse,
  type ActionGetResponse,
  type ActionPostRequest,
} from '@solana/actions';
import { PublicKey } from '@solana/web3.js';
import { actionJson, actionOptions } from '@/lib/actions/cors';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import { getConnection } from '@/lib/solana/connection';
import { buildGhostRaceMemoTransaction } from '@/lib/solana/memoTx';
import { newBlinkRaceNonce } from '@/lib/ghost-race/persistGhostRaceRun';

export const runtime = 'nodejs';
export const maxDuration = 30;

function actionBaseUrl(request: Request): string {
  return getPublicWebAppUrl() || new URL(request.url).origin;
}

function iconUrl(request: Request): string {
  return `${actionBaseUrl(request)}/brand/gleanai-pfp.png`;
}

export const OPTIONS = async () => actionOptions();

export async function GET(request: Request) {
  const base = actionBaseUrl(request);
  const href = `${base}/api/actions/ghost-race`;

  const payload: ActionGetResponse = {
    type: 'action',
    title: 'Ghost Race — Solana vs ETH/BTC',
    icon: iconUrl(request),
    description:
      'Send a real Solana memo tx and beat Ethereum (~12s) and Bitcoin (~10m) ghosts. Tiny fee.',
    label: 'RACE NOW',
    links: {
      actions: [
        {
          type: 'transaction',
          label: 'RACE NOW',
          href,
        },
      ],
    },
  };

  return actionJson(payload);
}

export async function POST(request: Request) {
  let body: ActionPostRequest;
  try {
    body = await request.json();
  } catch {
    return actionJson({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const account = typeof body.account === 'string' ? body.account.trim() : '';
  let payer: PublicKey;
  try {
    payer = new PublicKey(account);
  } catch {
    return actionJson({ message: 'Invalid account.' }, { status: 400 });
  }

  const raceNonce = newBlinkRaceNonce();
  const base = actionBaseUrl(request);

  try {
    const conn = getConnection();
    const { transaction } = await buildGhostRaceMemoTransaction({
      connection: conn,
      payer,
      raceNonce,
    });

    const response = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: 'Ignition — beat the ETH/BTC ghosts',
        links: {
          next: {
            type: 'post',
            href: `${base}/api/actions/ghost-race/complete?nonce=${encodeURIComponent(raceNonce)}`,
          },
        },
      },
    });

    return actionJson(response);
  } catch (err) {
    console.error('[actions/ghost-race] POST error', err);
    return actionJson(
      { message: 'Could not build race transaction. Try again.' },
      { status: 500 }
    );
  }
}
