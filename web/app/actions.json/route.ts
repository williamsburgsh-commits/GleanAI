import type { ActionsJson } from '@solana/actions';
import { actionJson, actionOptions } from '@/lib/actions/cors';

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      {
        pathPattern: '/api/actions/**',
        apiPath: '/api/actions/**',
      },
      {
        pathPattern: '/ghost-race',
        apiPath: '/api/actions/ghost-race',
      },
      {
        pathPattern: '/ghost-race/result/*',
        apiPath: '/api/actions/ghost-race',
      },
      {
        pathPattern: '/wallet-wars/boss-gauntlet',
        apiPath: '/api/actions/boss-challenge',
      },
    ],
  };
  return actionJson(payload);
};

export const OPTIONS = async () => actionOptions();
