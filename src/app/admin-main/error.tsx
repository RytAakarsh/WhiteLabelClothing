'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin layout error captured:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#E5E5E5] p-8 text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-black">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Admin Console Exception
          </span>
          <h2 className="text-xl font-serif uppercase tracking-wider text-black">
            Temporary System Failure
          </h2>
          <p className="text-xs text-neutral-600 mt-2 font-mono break-words bg-neutral-50 p-2 border border-neutral-200">
            {error.message || 'An unexpected error occurred while loading this administrative view.'}
          </p>
          {error.digest && (
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/admin-main"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Admin Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
