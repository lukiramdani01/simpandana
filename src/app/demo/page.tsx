'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Lock,
  Download,
  Send,
  AlertTriangle,
  Sparkles,
  BarChart3,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Bot
} from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

interface DemoTransaction {
  id: string;
  notes: string;
  amount: number;
  type: 'income' | 'expense';
  wallet_name: string;
  category_name: string;
  category_icon: string;
  date: string;
}

export default function DemoSandboxPage() {
  const DEMO_LIMIT = 5;

  const [transactions, setTransactions] = useState<DemoTransaction[]>([
    {
      id: 'demo-tx-1',
      notes: 'Gaji Bulanan Sandbox Demo',
      amount: 7500000,
      type: 'income',
      wallet_name: 'BCA Utama',
      category_name: 'Gaji Bulanan',
      category_icon: '💼',
      date: '2026-09-22',
    },
    {
      id: 'demo-tx-2',
      notes: 'Belanja Supermarket',
      amount: 350000,
      type: 'expense',
      wallet_name: 'BCA Utama',
      category_name: 'Makanan & Minuman',
      category_icon: '🍜',
      date: '2026-09-22',
    },
    {
      id: 'demo-tx-3',
      notes: 'Kopi Susu kekinian',
      amount: 25000,
      type: 'expense',
      wallet_name: 'GoPay',
      category_name: 'Hiburan & Santai',
      category_icon: '☕',
      date: '2026-09-21',
    },
  ]);

  const [notesInput, setNotesInput] = useState('beli martabak 45rb');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showBlockedFeatureModal, setShowBlockedFeatureModal] = useState<string | null>(null);

  // Compute stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const handleAddDemoTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (transactions.length >= DEMO_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    if (!notesInput.trim()) return;

    // Simple parser simulation for demo
    const lower = notesInput.toLowerCase();
    let type: 'income' | 'expense' = 'expense';
    let amount = 45000;

    if (lower.includes('gaji') || lower.includes('dapat') || lower.includes('transfer')) {
      type = 'income';
    }

    if (lower.includes('15rb') || lower.includes('15k')) amount = 15000;
    else if (lower.includes('25rb') || lower.includes('25k')) amount = 25000;
    else if (lower.includes('45rb') || lower.includes('45k')) amount = 45000;
    else if (lower.includes('50rb') || lower.includes('50k')) amount = 50000;
    else if (lower.includes('100rb') || lower.includes('100k')) amount = 100000;
    else if (lower.includes('1jt') || lower.includes('1 juta')) amount = 1000000;

    const newTx: DemoTransaction = {
      id: `demo-tx-${Date.now()}`,
      notes: notesInput.trim(),
      amount,
      type,
      wallet_name: 'BCA Utama',
      category_name: type === 'income' ? 'Pemasukan' : 'Pengeluaran Demo',
      category_icon: type === 'income' ? '💰' : '🛒',
      date: '2026-09-22',
    };

    setTransactions([newTx, ...transactions]);
    setNotesInput('');
  };

  const handleBlockedAction = (featureName: string) => {
    setShowBlockedFeatureModal(featureName);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner Sandbox */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white px-4 py-2.5 text-center text-xs font-semibold shadow-md flex items-center justify-center gap-3">
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>
          <strong>MODE DEMO SANDBOX:</strong> Data terisolasi. Maksimal {DEMO_LIMIT} transaksi ({transactions.length}/{DEMO_LIMIT} terpakai).
        </span>
        <Link
          href="/register"
          className="ml-2 px-3 py-1 bg-slate-950 text-orange-400 font-bold rounded-lg hover:bg-slate-900 transition-colors"
        >
          Daftar Sekarang
        </Link>
      </div>

      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <WalletLogo className="w-9 h-9 text-orange-500" />
          <span className="font-bold text-xl tracking-tight text-white">
            Simpan<span className="text-orange-500">Uang</span> <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">DEMO</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleBlockedAction('Telegram Bot Integration')}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold"
          >
            <Bot className="w-4 h-4 text-orange-400" />
            Link Telegram (Blocked in Demo)
          </button>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-orange-500/20"
          >
            Daftar Akun
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>TOTAL SALDO DEMO</span>
              <Wallet className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              Rp {totalBalance.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">Status: Standalone Dummy Data</div>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>PEMASUKAN DEMO</span>
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              +Rp {totalIncome.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">{transactions.filter(t => t.type === 'income').length} transaksi</div>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>PENGELUARAN DEMO</span>
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 tracking-tight">
              -Rp {totalExpense.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">{transactions.filter(t => t.type === 'expense').length} transaksi</div>
          </div>
        </div>

        {/* Input Demo Simulator */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Simulasi Pencatatan Transaksi Demo
            </h3>
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 font-semibold">
              Kuota Demo: {transactions.length} / {DEMO_LIMIT}
            </span>
          </div>

          <form onSubmit={handleAddDemoTransaction} className="flex gap-2">
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Ketik contoh: 'beli martabak 45rb' atau 'gaji 5jt'..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah
            </button>
          </form>
        </div>

        {/* Action Toolbar with Gated Features */}
        <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400">
            Export Engine & Fitur Pro Gating
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBlockedAction('Export Laporan PDF')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 opacity-75"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              Export PDF (Gated)
            </button>
            <button
              onClick={() => handleBlockedAction('Export Laporan Excel')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 opacity-75"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export Excel (Gated)
            </button>
            <button
              onClick={() => handleBlockedAction('AI Financial Advisor')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 opacity-75"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Advisor (Pro)
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 font-bold text-sm text-white flex items-center justify-between">
            <span>Daftar Transaksi Demo</span>
            <span className="text-xs text-slate-400 font-normal">Data dummy terisolasi</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-slate-800 rounded-xl">{tx.category_icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{tx.notes}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{tx.category_name}</span>
                      <span>•</span>
                      <span>{tx.wallet_name}</span>
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Limit Exceeded Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Batas Transaksi Demo Tercapai</h3>
            <p className="text-sm text-slate-300">
              Mode Sandbox Demo dibatasi maksimal <strong>5 transaksi</strong>. Untuk mencatat transaksi tanpa batas, hubungkan ke bot Telegram, dan nikmati fitur lengkap SaaS SimpanUang, silakan buat akun gratis!
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/register"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20"
              >
                Daftar Akun Baru Sekarang
              </Link>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Tutup Modals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Feature Modal */}
      {showBlockedFeatureModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Fitur Dibatasi dalam Mode Demo</h3>
            <p className="text-sm text-slate-300">
              Fitur <strong>{showBlockedFeatureModal}</strong> tidak tersedia di Sandbox Demo. Silakan login atau daftar akun resmi untuk mengakses fitur ini.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/register"
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl"
              >
                Daftar Akun Baru
              </Link>
              <button
                onClick={() => setShowBlockedFeatureModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
