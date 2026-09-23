'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess('Password berhasil diubah tanpa OTP! Silakan login sekarang.');
      } else {
        setError(data.error || 'Gagal mengubah password.');
      }
    } catch {
      setError('Terjadi kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col md:flex-row text-[#F8FAFC] font-sans">
      <div className="hidden md:flex md:w-5/12 apple-blue-gradient text-white p-12 flex-col justify-between relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center space-x-3 mb-16">
            <span className="text-2xl font-black tracking-tight text-white">
              Simpan<span className="text-blue-200">Uang</span>
            </span>
          </Link>
          <div className="space-y-4 max-w-sm">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              Atur Ulang Password
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Akses Kembali Akun Anda.
            </h1>
            <p className="text-white/90 text-sm leading-relaxed font-normal">
              Ubah password secara instan tanpa perlu menunggu verifikasi OTP.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="max-w-md w-full space-y-6 liquid-glass p-8 sm:p-10 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
              Lupa Password
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Masukkan alamat email Anda dan buat password baru langsung tanpa OTP.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start space-x-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <span>{success}</span>
                <div>
                  <Link
                    href="/login"
                    className="inline-flex items-center space-x-1 font-bold text-white underline hover:text-emerald-200"
                  >
                    <span>Masuk ke Dashboard Sekarang →</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                  Alamat Email Terdaftar
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    disabled={loading}
                    className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full p-3.5 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all font-semibold text-sm text-[#F8FAFC] placeholder-slate-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl apple-blue-gradient text-white font-extrabold text-sm shadow-lg glow-blue hover:brightness-110 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Password Baru...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan Password Baru</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-white/10 text-center space-y-2">
            <Link
              href="/login"
              className="text-xs text-[#2997FF] hover:text-white font-bold transition-all block"
            >
              ← Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
