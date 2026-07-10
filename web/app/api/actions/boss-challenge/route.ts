import {
  createPostResponse,
  type ActionGetResponse,
  type ActionPostRequest,
} from '@solana/actions';
import { PublicKey } from '@solana/web3.js';
import { actionJson, actionOptions } from '@/lib/actions/cors';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import { getConnection } from '@/lib/solana/connection';
import { buildBossChallengeMemoTransaction } from '@/lib/solana/memoTx';
import {
  getBossDefinition,
  isBossSlug,
  type BossSlug,
} from '@/lib/wallet-wars/bosses';

export const runtime = 'nodejs';
export const maxDuration = 30;

function actionBaseUrl(request: Request): string {
  return getPublicWebAppUrl() || new URL(request.url).origin;
}

function iconUrl(request: Request, bossSlug: BossSlug): string {
  const base = actionBaseUrl(request);
  // Prefer boss portrait when available; fall back to brand mark
  return `${base}/bosses/${bossSlug}.svg`;
}

function resolveBossSlug(raw: string | null): BossSlug {
  const slug = (raw || 'gatekeeper').trim().toLowerCase();
  if (isBossSlug(slug)) return slug;
  return 'gatekeeper';
}

export const OPTIONS = async () => actionOptions();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bossSlug = resolveBossSlug(searchParams.get('boss'));
  const boss = getBossDefinition(bossSlug)!;
  const base = actionBaseUrl(request);
  const href = `${base}/api/actions/boss-challenge?boss=${encodeURIComponent(bossSlug)}`;

  const payload: ActionGetResponse = {
    type: 'action',
    title: `Boss Gauntlet — ${boss.name}`,
    icon: iconUrl(request, bossSlug),
    description: `${boss.introLine} Sign a challenge memo, then open the gauntlet in GleanAI.`,
    label: `CHALLENGE ${boss.name.toUpperCase()}`,
    links: {
      actions: [
        {
          type: 'transaction',
          label: `CHALLENGE ${boss.name.toUpperCase()}`,
          href,
        },
      ],
    },
  };

  return actionJson(payload);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const bossSlug = resolveBossSlug(searchParams.get('boss'));
  const boss = getBossDefinition(bossSlug)!;

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

  const base = actionBaseUrl(request);
  const gauntletUrl = `${base}/wallet-wars/boss-gauntlet`;

  try {
    const conn = getConnection();
    const { transaction } = await buildBossChallengeMemoTransaction({
      connection: conn,
      payer,
      bossSlug,
    });

    const response = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: `Challenge ${boss.name} — open the gauntlet after confirm`,
        links: {
          next: {
            type: 'inline',
            action: {
              type: 'action',
              title: `Challenge locked — ${boss.name}`,
              icon: iconUrl(request, bossSlug),
              description: `${boss.name} is waiting. Open Boss Gauntlet in GleanAI to fight.`,
              label: 'OPEN GAUNTLET',
              links: {
                actions: [
                  {
                    type: 'external-link',
                    label: 'OPEN BOSS GAUNTLET',
                    href: gauntletUrl,
                  },
                ],
              },
            },
          },
        },
      },
    });

    return actionJson(response);
  } catch (err) {
    console.error('[actions/boss-challenge] POST error', err);
    return actionJson(
      { message: 'Could not build challenge transaction. Try again.' },
      { status: 500 }
    );
  }
}
