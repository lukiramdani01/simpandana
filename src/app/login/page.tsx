'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
  Wallet,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [redirectPath, setRedirectPath] = useState('/dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        setRedirectPath(redirect);
      }

      const registered = params.get('registered');
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
      if (registered) {
        setSuccessMsg(
          'Registrasi berhasil! Silakan masukkan password Anda untuk masuk ke Dashboard.'
        );
      }

      const err = params.get('error');
      if (err === 'unauthorized') {
        setErrorMsg('Anda harus login terlebih dahulu untuk mengakses Dashboard.');
      }
    }
  }, []);

  // Handler: Email & Password Authentication (Strict check against registered users)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      let clientCredential = null;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('tatadana_registered_accounts');
          if (raw) {
            const accounts = JSON.parse(raw);
            clientCredential = accounts[email.trim().toLowerCase()] || null;
          }
        } catch (e) {
          console.warn('Error reading local accounts', e);
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          credential: clientCredential,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || 'Email atau password salah. Pastikan Anda telah registrasi terlebih dahulu.'
        );
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('tatadana_user', JSON.stringify(data.user));
        localStorage.setItem(
          'tatadana_session',
          JSON.stringify({
            access_token: 'tatadana-token-' + Date.now(),
            user: data.user,
            expires_at: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year session
          })
        );
      }

      const isSuper = data.user?.role === 'superadmin' || data.user?.email === 'lramdanie02@gmail.com';
      const isPending = data.isPending || (data.user?.approval_status && (
        data.user.approval_status.toLowerCase() === 'pending_approval' ||
        data.user.approval_status.toLowerCase() === 'pending'
      ));

      if (!isSuper && isPending) {
        setErrorMsg('');
        setSuccessMsg('Akun terdaftar dan sedang menunggu persetujuan Super Admin. Mengalihkan ke status pendaftaran...');
        setTimeout(() => {
          window.location.href = `/register?pending=1&email=${encodeURIComponent(data.user.email)}&name=${encodeURIComponent(data.user.full_name || '')}`;
        }, 500);
        return;
      }

      setSuccessMsg(`Login berhasil! Mengalihkan ke Dashboard...`);

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = redirectPath;
        } else {
          router.push(redirectPath);
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali email dan password Anda.');
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
              Fintech Platform
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Keuanganmu. Terkontrol.
            </h1>
            <p className="text-white/90 text-sm leading-relaxed font-normal">
              Catat keuangan semudah chat — langsung dari Telegram kamu. Akses dashboard eksklusif dengan akun resmi terdaftar.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/20 text-xs text-white/80 space-y-1">
          <div className="flex items-center space-x-2 text-white font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Autentikasi Aman &amp; Terenkripsi</span>
          </div>
          <p>
            Setiap pengguna wajib melakukan registrasi akun untuk mengamankan data transaksi keuangan dan integrasi Bot.
          </p>
        </div>

        {/* Decorative ambient lighting circles */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/4 -right-24 w-72 h-72 bg-sky-300/20 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* KANAN: FORM LOGIN (60% DESKTOP, FULL SCREEN MOBILE) */}
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
              Masuk ke Akunmu
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Gunakan email dan password Anda yang terdaftar untuk mengakses Dashboard.
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

          {/* Email & Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 text-xs">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#2997FF] hover:underline"
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Notice & CTA */}
          <div className="pt-4 border-t border-white/10 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Belum memiliki akun terdaftar?
            </p>
            <Link
              href="/register"
              className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#2997FF] hover:text-white text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrasi Akun Baru Sekarang</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
