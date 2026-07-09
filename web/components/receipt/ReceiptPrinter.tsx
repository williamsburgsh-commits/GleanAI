'use client';

import { useEffect, useState } from 'react';
import { ReceiptPaper, type ReceiptData } from './ReceiptPaper';

const LINE_DELAY_MS = 80;

interface ReceiptPrinterProps {
  data: ReceiptData;
  animate?: boolean;
  onComplete?: () => void;
  className?: string;
}

export function ReceiptPrinter({
  data,
  animate = true,
  onComplete,
  className = '',
}: ReceiptPrinterProps) {
  const [visibleLines, setVisibleLines] = useState(animate ? 0 : 12);
  const [torn, setTorn] = useState(false);

  const totalLines = 12;

  useEffect(() => {
    if (!animate) {
      onComplete?.();
      return;
    }

    let line = 0;
    const interval = setInterval(() => {
      line += 1;
      setVisibleLines(line);
      if (line >= totalLines) {
        clearInterval(interval);
        setTimeout(() => {
          setTorn(true);
          onComplete?.();
        }, 400);
      }
    }, LINE_DELAY_MS);

    return () => clearInterval(interval);
  }, [animate, onComplete]);

  const progress = animate ? visibleLines / totalLines : 1;

  return (
    <div className={`relative ${className}`}>
      {/* Printer slot */}
      <div className="mx-auto mb-2 h-3 max-w-sm rounded-sm bg-[#1a1f28] shadow-inner" />

      <div
        className={`transition-transform duration-500 ease-out ${
          torn ? 'animate-receipt-tear' : ''
        }`}
        style={{
          opacity: Math.min(1, progress * 1.2),
          transform: animate
            ? `translateY(${(1 - progress) * 24}px)`
            : undefined,
        }}
      >
        <ReceiptPaper data={data} />
      </div>

      {animate && visibleLines < totalLines && (
        <p className="mt-3 text-center font-term text-[14px] uppercase tracking-[0.2em] text-amber animate-pulse">
          printing...
        </p>
      )}
    </div>
  );
}
