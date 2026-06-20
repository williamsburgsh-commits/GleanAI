interface PhantomConnectResponse {
  publicKey: { toBase58(): string };
}

interface PhantomProvider {
  isPhantom?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<PhantomConnectResponse>;
  disconnect(): Promise<void>;
}

interface Window {
  phantom?: { solana?: PhantomProvider };
  solana?: PhantomProvider;
}
