'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Deep-link /leaderboard → tabbed Rank view in the Mini App. */
export default function LeaderboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app?tab=rank');
  }, [router]);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-center font-pixel text-[11px] text-phosphor glow-text">
        LOADING RANKINGS<span className="animate-blink"> _</span>
      </p>
    </main>
  );
}
