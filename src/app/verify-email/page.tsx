'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const tokenParam = params.get('token');

      if (emailParam) {
        setEmail(emailParam);
      }

      if (tokenParam) {
        handleTokenVerification(tokenParam);
      }
    }
  }, []);

  const handleTokenVerification = async (token: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Link verifikasi tidak valid.');
      }
      setSuccessMsg('Verifikasi email berhasil! Mengalihkan ke Dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verifikasi link gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg('Masukkan 6 digit kode OTP yang dikirim ke email Anda.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Kode OTP salah atau tidak valid.');
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('tatadana_user', JSON.stringify(data.user));
      }

      setSuccessMsg('Email berhasil diverifikasi! Mengalihkan ke Dashboard...');

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        } else {
          router.push('/dashboard');
        }
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verifikasi gagal. Periksa kembali kode OTP Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col md:flex-row text-[#F8FAFC] font-sans">
      {/* BRANDING PANEL */}
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
              Verifikasi Keamanan Email
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Satu Langkah Lagi.
            </h1>
            <p className="text-white/90 text-sm leading-relaxed font-normal">
              Masukkan 6-digit kode OTP yang kami kirimkan ke email Anda untuk mengaktifkan akun SimpanUang secara resmi.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/20 text-xs text-white/80 space-y-1">
          <div className="flex items-center space-x-2 text-white font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Keamanan Akun Terjamin</span>
          </div>
          <p>
            Verifikasi email memastikan transaksi dan koneksi Telegram Bot Anda terlindungi.
          </p>
        </div>

        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* FORM VERIFIKASI */}
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
              Verifikasi Email Anda
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Kode OTP telah dikirimkan ke <strong className="text-white">{email || 'email Anda'}</strong>.
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleOTPVerification} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Alamat Email Pengguna
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] text-sm text-[#F8FAFC] mb-3"
              />

              <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                Kode OTP (6 Digit)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                disabled={loading}
                className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 text-center font-mono text-2xl tracking-widest text-white disabled:opacity-60"
              />

              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-[11px] text-sky-300 mt-3">
                💡 <strong>Dev Verification Hint:</strong> Gunakan kode OTP{' '}
                <code className="font-bold bg-black/50 text-sky-200 px-1.5 py-0.5 rounded border border-sky-400/30">
                  123456
                </code>{' '}
                untuk verifikasi instan.
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
                  <span>Memverifikasi Kode...</span>
                </>
              ) : (
                <>
                  <span>Verifikasi Email &amp; Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center space-y-3">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Kembali ke Halaman Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
