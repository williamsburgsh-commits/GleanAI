'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';
import { getStoredWallet, type PhantomCluster } from '@/lib/phantom';
import { PixelArrowRight } from '@/components/PixelArt';

export function HomeHeroCta({ cluster }: { cluster: PhantomCluster }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWallet(getStoredWallet());
    setReady(true);
  }, []);

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      {!ready ? null : wallet ? (
        <Link href="/play" className="arcade-btn">
          <span className="h-3 w-3 text-phosphor">
            <PixelArrowRight />
          </span>
          Enter arcade
        </Link>
      ) : (
        <ConnectButton cluster={cluster} />
      )}
      <p className="font-term text-[14px] uppercase tracking-[0.2em] text-ash">
        powered by phantom · {cluster}
      </p>
    </div>
  );
}
