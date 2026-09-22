'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Loader2,
  LogIn,
} from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !email.trim() || !password || !passwordConfirm) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg('Konfirmasi password tidak sesuai.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal harus 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Pendaftaran gagal. Silakan coba lagi.');
      }

      if (typeof window !== 'undefined' && data.credential) {
        try {
          const raw = localStorage.getItem('tatadana_registered_accounts');
          const accounts = raw ? JSON.parse(raw) : {};
          accounts[email.trim().toLowerCase()] = data.credential;
          localStorage.setItem('tatadana_registered_accounts', JSON.stringify(accounts));
        } catch (e) {
          console.warn('Could not cache registered account locally', e);
        }
      }

      setSuccessMsg('Pendaftaran akun berhasil! Mengalihkan ke halaman masuk...');

      setTimeout(() => {
        router.push(`/login?registered=1&email=${encodeURIComponent(email.trim())}`);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal. Silakan periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col md:flex-row text-[#F8FAFC] font-sans">
      {/* KIRI: BRANDING PANEL (40% DESKTOP, HIDDEN ON MOBILE) */}
      <div className="hidden md:flex md:w-5/12 apple-blue-gradient text-white p-12 flex-col justify-between relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center space-x-3 mb-16">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#0071E3] flex items-center justify-center font-black text-xl shadow-lg">
              <Wallet className="w-6 h-6 text-[#0071E3]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Simpan<span className="text-blue-200">Uang</span>
            </span>
          </Link>

          <div className="space-y-4 max-w-sm">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              Registrasi Akun Baru
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Mulai Kendalikan Keuanganmu.
            </h1>
            <p className="text-white/90 text-sm leading-relaxed font-normal">
              Daftar akun gratis hari ini. Catat transaksi semudah kirim pesan di Telegram dan pantau arus kas secara otomatis.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/20 text-xs text-white/80 space-y-1">
          <div className="flex items-center space-x-2 text-white font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Privasi &amp; Keamanan Terjamin</span>
          </div>
          <p>
            Data keuangan Anda diamankan dengan enkripsi standar industri perbankan dan terlindungi secara penuh.
          </p>
        </div>

        {/* Decorative ambient lighting circles */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/4 -right-24 w-72 h-72 bg-sky-300/20 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* KANAN: FORM REGISTRASI (60% DESKTOP, FULL SCREEN MOBILE) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="max-w-md w-full space-y-6 liquid-glass p-8 sm:p-10 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
          <div>
            <div className="md:hidden flex items-center space-x-2 mb-6">
              <WalletLogo size="sm" />
              <span className="text-xl font-black text-[#F8FAFC]">
                Simpan<span className="apple-blue-text">Uang</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
              Daftar Akun Baru
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Lengkapi data di bawah ini untuk membuat akun SimpanUang Anda.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Luki Ramdani"
                  required
                  disabled={loading}
                  className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500 disabled:opacity-60"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  disabled={loading}
                  className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500 disabled:opacity-60"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500 disabled:opacity-60"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Ulangi password Anda"
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500 disabled:opacity-60"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl apple-blue-gradient text-white font-extrabold text-sm shadow-lg glow-blue hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account CTA */}
          <div className="pt-4 border-t border-white/10 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Sudah memiliki akun terdaftar?
            </p>
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#2997FF] hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Email &amp; Password</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
