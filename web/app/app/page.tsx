'use client';

import { Suspense } from 'react';
import { MiniAppShell } from '@/components/miniapp/MiniAppShell';

function MiniAppFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-center font-pixel text-[11px] text-phosphor glow-text">
        BOOTING GLEANAI<span className="animate-blink"> _</span>
      </p>
    </main>
  );
}

export default function MiniAppPage() {
  return (
    <Suspense fallback={<MiniAppFallback />}>
      <MiniAppShell />
    </Suspense>
  );
}
