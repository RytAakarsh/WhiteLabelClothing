'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-black bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block">
          White Label Clothing
        </span>
        <h1 className="text-3xl font-serif uppercase tracking-wider">
          Experience Interrupted
        </h1>
        <p className="text-sm text-neutral-600">
          We encountered an unexpected issue while preparing your view. Our engineering telemetry has logged this event.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            Reload Page
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
          >
            Return to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
