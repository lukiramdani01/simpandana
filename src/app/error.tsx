'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="liquid-glass rounded-3xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl apple-blue-gradient flex items-center justify-center text-white font-black text-xl mx-auto shadow-lg glow-blue">
          SU
        </div>
        <h2 className="text-2xl font-black text-white">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-400">Sistem mendeteksi kendala teknis sementara.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl apple-blue-gradient text-white text-xs font-bold shadow glow-blue hover:brightness-110 transition-all"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
