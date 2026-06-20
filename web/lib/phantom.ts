import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ---------------------------------------------------------------------------
// Phantom deeplink helpers (mobile connect flow).
// Docs: https://docs.phantom.app/phantom-deeplinks/provider-methods/connect
//
// Flow:
//   1. generate an x25519 keypair for this session (we keep the secret locally)
//   2. send the user to the Phantom connect deeplink with our public key
//   3. Phantom redirects back with its public key + an encrypted payload
//   4. derive the shared secret and decrypt -> { public_key, session }
// ---------------------------------------------------------------------------

const STORAGE_KEY_SECRET = 'glean.dapp_secret_key';
const STORAGE_KEY_SESSION = 'glean.phantom_session';
const STORAGE_KEY_WALLET = 'glean.wallet';
const STORAGE_KEY_TG = 'glean.telegram_id';

export type PhantomCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export interface ConnectResult {
  walletAddress: string;
  session: string;
}

function assertBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('Phantom helpers can only run in the browser.');
  }
}

// Create (or reuse) the dapp session keypair, persisting the secret locally so
// the redirect callback can decrypt Phantom's response.
export function ensureDappKeyPair(): nacl.BoxKeyPair {
  assertBrowser();
  const existing = window.localStorage.getItem(STORAGE_KEY_SECRET);
  if (existing) {
    return nacl.box.keyPair.fromSecretKey(bs58.decode(existing));
  }
  const kp = nacl.box.keyPair();
  window.localStorage.setItem(STORAGE_KEY_SECRET, bs58.encode(kp.secretKey));
  return kp;
}

// Desktop / in-browser: Phantom injects window.phantom.solana (or window.solana).
export function getPhantomProvider(): PhantomProvider | null {
  assertBrowser();
  const injected = window.phantom?.solana;
  if (injected?.isPhantom) return injected;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function connectViaExtension(): Promise<ConnectResult> {
  const provider = getPhantomProvider();
  if (!provider) {
    throw new Error('Phantom extension not found. Install it or use the mobile app.');
  }
  const resp = await provider.connect();
  return {
    walletAddress: resp.publicKey.toBase58(),
    session: '', // deeplink session only; extension connect does not use it in v1
  };
}

export async function linkWalletToServer(walletAddress: string): Promise<void> {
  const telegramId = getTelegramId();
  if (!telegramId) return;

  const res = await fetch('/api/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, walletAddress }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || 'Failed to save wallet.'
    );
  }
}

export function buildConnectUrl(opts: {
  cluster: PhantomCluster;
  appUrl: string;
  redirectLink: string;
}): string {
  const kp = ensureDappKeyPair();
  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(kp.publicKey),
    cluster: opts.cluster,
    app_url: opts.appUrl,
    redirect_link: opts.redirectLink,
  });
  return `https://phantom.app/ul/v1/connect?${params.toString()}`;
}

// Decrypt the connect redirect params from Phantom.
export function decodeConnectRedirect(search: URLSearchParams): ConnectResult {
  assertBrowser();

  const errorCode = search.get('errorCode');
  if (errorCode) {
    const msg = search.get('errorMessage') || 'Phantom returned an error.';
    throw new Error(`Phantom connect failed (${errorCode}): ${msg}`);
  }

  const phantomPubkey = search.get('phantom_encryption_public_key');
  const nonce = search.get('nonce');
  const data = search.get('data');
  if (!phantomPubkey || !nonce || !data) {
    throw new Error('Incomplete Phantom response (missing encryption params).');
  }

  const secret = window.localStorage.getItem(STORAGE_KEY_SECRET);
  if (!secret) {
    throw new Error('Missing local session key. Please start the connect again.');
  }

  const sharedSecret = nacl.box.before(
    bs58.decode(phantomPubkey),
    bs58.decode(secret)
  );

  const decrypted = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  if (!decrypted) {
    throw new Error('Failed to decrypt Phantom payload.');
  }

  const payload = JSON.parse(new TextDecoder().decode(decrypted)) as {
    public_key: string;
    session: string;
  };

  return { walletAddress: payload.public_key, session: payload.session };
}

// --- small local-storage helpers -------------------------------------------
export function rememberTelegramId(id: string) {
  assertBrowser();
  window.localStorage.setItem(STORAGE_KEY_TG, id);
}
export function getTelegramId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY_TG);
}
export function rememberConnection(result: ConnectResult) {
  assertBrowser();
  window.localStorage.setItem(STORAGE_KEY_WALLET, result.walletAddress);
  window.localStorage.setItem(STORAGE_KEY_SESSION, result.session);
}
export function getStoredWallet(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY_WALLET);
}
export function clearConnection() {
  assertBrowser();
  window.localStorage.removeItem(STORAGE_KEY_WALLET);
  window.localStorage.removeItem(STORAGE_KEY_SESSION);
}
