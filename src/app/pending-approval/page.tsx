'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert, CheckCircle2, RefreshCw, LogOut, ExternalLink, Bot } from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      let currentUserId = 'usr-101';
      if (typeof window !== 'undefined') {
        const u = localStorage.getItem('tatadana_user');
        if (u) {
          try {
            currentUserId = JSON.parse(u).id;
          } catch {}
        }
      }

      if (data.ok && Array.isArray(data.users)) {
        const currentUser = data.users.find((u: any) => u.id === currentUserId);
        if (currentUser) {
          const status = currentUser.approval_status || currentUser.status;
          if (status === 'APPROVED' || status === 'approved') {
            setStatusMsg('🎉 Akun Anda telah disetujui Admin! Mengalihkan ke dashboard...');
            setTimeout(() => {
              router.push('/dashboard');
            }, 800);
            return;
          } else if (status === 'REJECTED' || status === 'rejected') {
            setStatusMsg('⚠️ Akun Anda belum disetujui (Ditolak oleh Admin). Hubungi tim support.');
          } else if (status === 'SUSPENDED' || status === 'suspended') {
            setStatusMsg('⚠️ Akun Anda telah dinonaktifkan (SUSPENDED).');
          } else {
            setStatusMsg('ℹ️ Akun Anda masih dalam status Menunggu Persetujuan (PENDING).');
          }
        } else {
          setStatusMsg('ℹ️ Akun Anda masih dalam antrean peninjauan Admin.');
        }
      } else {
        setStatusMsg('ℹ️ Belum ada perubahaan status. Silakan periksa kembali nanti.');
      }
    } catch {
      setStatusMsg('ℹ️ Akun Anda masih dalam antrean peninjauan Admin.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatadana_user');
      localStorage.removeItem('tatadana_session');
      document.cookie = 'tatadana_user_id=; path=/; max-age=0';
      document.cookie = 'tatadana_user_status=; path=/; max-age=0';
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3">
            <WalletLogo className="w-12 h-12 text-orange-500" />
            <span className="font-bold text-2xl tracking-tight text-white">
              Simpan<span className="text-orange-500">Uang</span>
            </span>
          </Link>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl rounded-2xl border border-amber-500/30 text-center">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-400 animate-pulse">
            <Clock className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Status: PENDING
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Menunggu Persetujuan Admin
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Pendaftaran akun SimpanUang Anda telah berhasil diterima. Untuk keamanan multi-tenant SaaS, akun baru membutuhkan verifikasi dari Superadmin/Admin sebelum dapat mengakses dashboard & Telegram bot.
          </p>

          {statusMsg && (
            <div className="mb-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200">
              {statusMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Memeriksa...' : 'Cek Status Persetujuan'}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm rounded-xl border border-slate-700 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Bot className="w-4 h-4 text-orange-400" />
            <span>Pemberitahuan otomatis akan dikirim ke Telegram saat Admin menyetujui akun Anda.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
