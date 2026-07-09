const CACHE_MS = 5 * 60_000;
let cachedPrice: { usd: number; at: number } | null = null;

function fallbackSolPrice(): number {
  const raw = process.env.SOL_USD_FALLBACK;
  const n = raw ? Number(raw) : 150;
  return Number.isFinite(n) && n > 0 ? n : 150;
}

export async function fetchSolPriceUsd(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.at < CACHE_MS) {
    return cachedPrice.usd;
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = (await res.json()) as { solana?: { usd?: number } };
    const usd = data.solana?.usd;
    if (!usd || !Number.isFinite(usd)) throw new Error('Invalid SOL price');
    cachedPrice = { usd, at: Date.now() };
    return usd;
  } catch (err) {
    console.warn('[receipt/solPrice] fallback', err);
    return fallbackSolPrice();
  }
}
