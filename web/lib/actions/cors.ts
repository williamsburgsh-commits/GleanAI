import { ACTIONS_CORS_HEADERS } from '@solana/actions';

export { ACTIONS_CORS_HEADERS };

/** JSON response with Solana Actions CORS headers. */
export function actionJson(payload: unknown, init?: ResponseInit): Response {
  return Response.json(payload, {
    ...init,
    headers: {
      ...ACTIONS_CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

/** OPTIONS preflight for Action routes. */
export function actionOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}
