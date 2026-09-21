import Link from 'next/link';
import WalletLogo from '@/components/WalletLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="liquid-glass rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-white/10">
        <div className="flex justify-center mx-auto">
          <WalletLogo size="lg" />
        </div>
        <h2 className="text-2xl font-black text-white">404 — Halaman Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl apple-blue-gradient text-white text-xs font-bold shadow glow-blue hover:brightness-110 transition-all"
        >
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
