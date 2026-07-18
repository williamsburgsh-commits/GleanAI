interface PhantomConnectResponse {
  publicKey: { toBase58(): string };
}

interface PhantomProvider {
  isPhantom?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<PhantomConnectResponse>;
  disconnect(): Promise<void>;
  signTransaction?(
    transaction: import('@solana/web3.js').Transaction
  ): Promise<import('@solana/web3.js').Transaction>;
  signAndSendTransaction(
    transaction: import('@solana/web3.js').Transaction,
    opts?: { skipPreflight?: boolean }
  ): Promise<{ signature: string }>;
}

interface Window {
  phantom?: { solana?: PhantomProvider };
  solana?: PhantomProvider;
}
