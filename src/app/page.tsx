'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Bot, 
  Receipt, 
  Mic, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Wallet, 
  Zap, 
  HelpCircle,
  ChevronDown,
  Calculator,
  DollarSign,
  PieChart,
  Check,
  Star,
  Lock,
  ArrowUpRight,
  Send,
  Smartphone,
  Play,
  Clock,
  AlertCircle,
  CreditCard,
  ChevronRight,
  TrendingDown,
  XCircle,
  MessageSquare
} from 'lucide-react';
import WalletLogo from '@/components/WalletLogo';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('lifetime');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroActiveTab, setHeroActiveTab] = useState<'chat' | 'dashboard' | 'ocr'>('chat');

  // Interactive Telegram Chat Simulator State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; progress?: number }>>([
    {
      sender: 'user',
      text: 'kopi kenangan 24k pakai gopay',
      time: '14:22'
    },
    {
      sender: 'bot',
      text: '📅 Kamis, 17 Sep 2026 — 14:22 WIB\n💸 Pengeluaran tercatat!\n├ Nominal : Rp24.000\n├ Kategori : 🍜 Makanan & Minuman\n├ Dompet : 👛 GoPay\n├ Catatan : kopi kenangan 24k pakai gopay\n└ Saldo : Rp326.000\n\n📊 Budget Makanan bulan ini:\n[████████░░] 80% — sisa Rp50.000\n⚠️ Perhatian: Budget kategori ini hampir habis!',
      time: '14:22',
      progress: 80
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Quick Chips for Chat Simulator
  const quickChips = [
    { label: '☕ Kopi 25rb GoPay', text: 'kopi americano 25rb pakai gopay' },
    { label: '💰 Gajian 12jt BCA', text: 'gajian masuk 12jt di rekening bca' },
    { label: '🍜 Makan Siang 35k', text: 'makan siang padang 35rb cash' },
    { label: '🚗 Bensin 50rb OVO', text: 'isi bensin pertamax 50k ovo' },
  ];

  const handleSendSimulatorChat = (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Add user message
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: textToSend, time: timeStr }
    ]);
    if (!customText) setChatInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      setIsBotTyping(false);
      const lower = textToSend.toLowerCase();

      if (lower.includes('gaji') || lower.includes('masuk') || lower.includes('terima')) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `📅 Kamis, 17 Sep 2026 — ${timeStr} WIB\n💰 Pemasukan tercatat!\n├ Nominal : Rp12.000.000\n├ Kategori : 💼 Gaji Bulanan\n├ Dompet : 👛 BCA Utama\n└ Saldo baru : Rp30.250.000\n\n💪 Semangat terus! Jangan lupa sisihkan minimal 20% untuk tabungan dan investasi ya.`,
            time: timeStr
          }
        ]);
      } else {
        const nominalMatch = lower.match(/(\d+)(rb|k|ribu)?/);
        const nominal = nominalMatch ? `${nominalMatch[1]}.000` : '35.000';
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `📅 Kamis, 17 Sep 2026 — ${timeStr} WIB\n💸 Pengeluaran tercatat!\n├ Nominal : Rp${nominal}\n├ Kategori : 🍜 Makanan & Minuman\n├ Dompet : 👛 GoPay\n├ Catatan : ${textToSend}\n└ Saldo : Rp291.000\n\n📊 Budget Makanan bulan ini:\n[███████░░░] 70% — sisa Rp75.000\n💡 Terkendali dengan baik! Lanjutkan pencatatan konsisten.`,
            time: timeStr,
            progress: 70
          }
        ]);
      }
    }, 600);
  };

  // Interactive Bocor Halus Calculator State
  const [dailyCoffee, setDailyCoffee] = useState(28000);
  const [weeklyHangout, setWeeklyHangout] = useState(150000);
  const [monthlySubs, setMonthlySubs] = useState(185000);

  const monthlyCoffeeTotal = dailyCoffee * 22; // working days
  const monthlyHangoutTotal = weeklyHangout * 4;
  const totalBocorBulanan = monthlyCoffeeTotal + monthlyHangoutTotal + monthlySubs;
  const totalBocorTahunan = totalBocorBulanan * 12;

  // FAQ Accordion Data
  const faqs = [
    {
      q: 'Apakah bisa menggunakan input foto struk di paket Starter?',
      a: 'Fitur ekstraksi foto struk otomatis (Vision OCR AI) khusus tersedia untuk pengguna paket Pro. Namun pada paket Starter, Anda tetap dapat mencatat pengeluaran secara instan dan unlimited akurasi melalui pesan teks dan voice note Telegram.'
    },
    {
      q: 'Bagaimana keamanan data transaksi saya di SimpanUang?',
      a: 'Data Anda dijamin 100% aman dan privat. SimpanUang dibangun di atas infrastruktur enterprise Supabase PostgreSQL dengan enkripsi data transit & at-rest, Row Level Security (RLS) ketat per user ID, serta tidak pernah menjual data finansial Anda kepada pihak manapun.'
    },
    {
      q: 'Apakah saya perlu menginstall bot Telegram khusus untuk saya sendiri?',
      a: 'Tidak perlu repot! SimpanUang menggunakan 1 Official Bot Telegram bersama untuk semua pengguna. Begitu Anda mendaftar dan memverifikasi nomor HP atau klik tautan deep-link di menu Settings, akun Anda langsung terhubung otomatis ke bot dalam 3 detik.'
    },
    {
      q: 'Bagaimana jika pesan teks saya menggunakan bahasa gaul atau singkatan seperti "15rb", "1.5jt", atau "500k"?',
      a: 'AI NLP SimpanUang dirancang spesifik dengan lexical dictionary Indonesia. Format seperti "15rb", "15ribu", "1.5jt", "500k", hingga bahasa sehari-hari seperti "beli bakso 15rb" otomatis diparsing presisi menjadi nominal numerik dan kategori yang tepat.'
    },
    {
      q: 'Apakah paket Pro benar-benar hanya sekali bayar seumur hidup?',
      a: 'Benar sekali! Melalui program Founding Members Launching, Anda cukup membayar Rp99.000 satu kali saja (Lifetime Deal) untuk menikmati seluruh fitur Pro seumur hidup tanpa tagihan langganan bulanan berulang.'
    },
    {
      q: 'Metode pembayaran apa saja yang didukung oleh SimpanUang?',
      a: 'Kami terintegrasi resmi dengan Midtrans Payment Gateway yang mendukung pembayaran instan via QRIS (semua e-wallet & mobile banking), Virtual Account BCA, Mandiri, BNI, BRI, serta opsi transfer manual dengan validasi audit admin.'
    },
    {
      q: 'Bisakah saya mengekspor data laporan keuangan saya ke Excel dan PDF?',
      a: 'Tentu saja! Pengguna paket Pro dapat men-generate dan mengunduh laporan keuangan berkala secara on-demand langsung dari dashboard ke dalam format lembar kerja Excel (.xlsx) dan dokumen resmi PDF.'
    },
    {
      q: 'Bagaimana cara kerja AI Financial Advisor di SimpanUang?',
      a: 'AI Advisor bekerja secara proaktif dan otomatis menganalisis pola transaksi Anda. Jika pengeluaran pada satu kategori melonjak lebih dari 50% dibanding minggu lalu atau total belanja melebihi 80% pemasukan, Anda akan menerima insight ramah dan saran actionable langsung di chat Telegram.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] font-sans selection:bg-[#0071E3] selection:text-white">
      
      {/* 1. STICKY LIQUID GLASS NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WalletLogo size="md" />
            <div>
              <span className="text-2xl font-black tracking-tight text-[#F8FAFC]">
                Simpan<span className="apple-blue-text">Uang</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-blue-500/15 text-[#2997FF] text-[10px] font-bold border border-blue-500/30">
                v2.0
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-8 text-xs font-semibold text-slate-400">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#demo" className="hover:text-white transition-colors flex items-center space-x-1">
              <Bot className="w-3.5 h-3.5 text-[#2997FF]" />
              <span>Demo Simulator</span>
            </a>
            <a href="#kalkulator" className="hover:text-white transition-colors flex items-center space-x-1">
              <Calculator className="w-3.5 h-3.5 text-[#2997FF]" />
              <span>Kalkulator Bocor Halus</span>
            </a>
            <a href="#harga" className="hover:text-white transition-colors">Harga</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              Masuk Akun
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold apple-blue-gradient text-white shadow-lg glow-blue hover:brightness-110 transition-all flex items-center space-x-1.5"
            >
              <span>Daftar Akun</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        
        {/* 2. HERO SECTION */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Pre-headline Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#2997FF] text-xs font-bold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#2997FF] animate-pulse" />
            <span>✨ Catat keuangan semudah chat — langsung dari Telegram kamu</span>
          </div>

          {/* Headline (H1) */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#F8FAFC] leading-[1.12] max-w-5xl mx-auto mb-6">
            Gaji habis sebelum akhir bulan? Sudah saatnya kamu tahu <span className="apple-blue-text">ke mana uangmu pergi.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            SimpanUang mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-extrabold apple-blue-gradient text-white shadow-xl glow-blue hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold liquid-glass hover:bg-white/10 text-white border border-white/10 shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-[#2997FF]" />
              <span>Daftar Baru</span>
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold liquid-glass hover:bg-white/10 text-white border border-white/10 shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Bot className="w-4 h-4 text-[#2997FF]" />
              <span>Lihat cara kerjanya →</span>
            </a>
          </div>

          {/* Hero Section Video Placeholder */}
          <div className="max-w-4xl mx-auto mt-4 rounded-3xl overflow-hidden liquid-glass border border-white/10 p-4 sm:p-6 relative group shadow-2xl">
            <div className="relative aspect-video rounded-2xl bg-[#0B0F19] flex flex-col items-center justify-center text-white overflow-hidden shadow-inner border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-slate-950/60 to-slate-950/90 backdrop-blur-[2px]"></div>
              
              <div className="relative z-10 text-center p-6 max-w-md">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full apple-blue-gradient flex items-center justify-center text-white shadow-2xl glow-blue group-hover:scale-105 transition-transform cursor-pointer">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-white" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold mb-1 text-white">Lihat Demo SimpanUang (1 Menit)</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Tonton bagaimana chat &quot;kopi 25rb&quot; langsung rapi di laporan keuangan.
                </p>
              </div>

              {/* Decorative timeline bar */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
                <div className="h-full w-1/3 apple-blue-gradient"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-3 px-1">
              <span>Preview Demo Interaktif Telegram &amp; Web Dashboard</span>
              <span className="text-[#2997FF] font-semibold">Resolusi 4K UHD 60fps</span>
            </div>
          </div>
        </section>

        {/* 3. PROBLEM-SOLUTION (BULLET POINT MASALAH USER) */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              RELATE DENGAN MASALAH INI?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Kenapa Mencatat Keuangan Selama Ini Terasa Berat?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Problem 1 */}
            <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                &quot;Buka aplikasi keuangan? Nanti dulu deh...&quot;
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Aplikasi keuangan konvensional terlalu ribet dengan puluhan kolom isian form. Akhirnya malas mencatat dan ditunda sampai lupa.
              </p>
            </div>

            {/* Problem 2 */}
            <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                &quot;Kok uangnya habis ya? Padahal kayak tidak beli apa-apa&quot;
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Pengeluaran kecil harian seperti kopi 25rb, jajan boba, atau parkir tidak pernah tercatat, padahal totalnya bisa jutaan rupiah sebulan.
              </p>
            </div>

            {/* Problem 3 */}
            <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[#2997FF] flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                &quot;Udah niat bikin budget, tapi seminggu lupa&quot;
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Budget yang tidak dipantau secara real-time sama saja tidak ada budget. Tahu-tahu saldo rekening sudah menipis sebelum akhir bulan.
              </p>
            </div>
          </div>

          {/* Solution Transition */}
          <div className="rounded-3xl apple-blue-gradient text-white p-8 sm:p-10 text-center shadow-2xl glow-blue relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                Solusi Masa Depan
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">
                Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman?
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                <strong>Introducing SimpanUang</strong> — FinTech revolusioner yang menyatukan obrolan Telegram sehari-hari dengan otomasi akuntansi cerdas.
              </p>
            </div>
          </div>
        </section>

        {/* 4. INTERACTIVE DASHBOARD PREVIEW & TELEGRAM BOT SIMULATOR */}
        <section id="demo" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              INTERACTIVE PREVIEW
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Coba Langsung Simulasi Bot Telegram
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-2">
              Klik salah satu contoh pesan cepat atau ketik sendiri untuk melihat bagaimana AI SimpanUang merespons dalam format aslinya.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex p-1 rounded-2xl bg-white/5 border border-white/10">
              <button
                onClick={() => setHeroActiveTab('chat')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  heroActiveTab === 'chat'
                    ? 'apple-blue-gradient text-white shadow-md glow-blue'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Simulasi Chat Telegram</span>
              </button>

              <button
                onClick={() => setHeroActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  heroActiveTab === 'dashboard'
                    ? 'apple-blue-gradient text-white shadow-md glow-blue'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Preview Dashboard Web</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: TELEGRAM CHAT SIMULATOR */}
          {heroActiveTab === 'chat' && (
            <div className="max-w-2xl mx-auto liquid-glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Telegram App Header */}
              <div className="px-6 py-4 bg-[#0B0F19]/90 border-b border-white/10 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full apple-blue-gradient flex items-center justify-center font-bold text-white shadow glow-blue">
                    🤖
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center space-x-1.5">
                      <span>SimpanUang Official Bot</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                    <div className="text-[11px] text-slate-400">@Rumahluki01bot • bot online</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-[#2997FF] border border-blue-500/30">
                  AI Active
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="p-6 bg-black/40 min-h-[340px] max-h-[460px] overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs shadow-sm ${
                        msg.sender === 'user'
                          ? 'apple-blue-gradient text-white rounded-tr-none'
                          : 'bg-[#121826] text-slate-200 border border-white/10 rounded-tl-none font-mono whitespace-pre-line'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </p>
                      <span
                        className={`block text-[9px] mt-2 text-right ${
                          msg.sender === 'user' ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {msg.time} • Terkirim
                      </span>
                    </div>
                  </div>
                ))}

                {isBotTyping && (
                  <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
                    <span className="animate-pulse">Bot sedang memproses...</span>
                  </div>
                )}
              </div>

              {/* Quick Input Chips */}
              <div className="px-6 py-2.5 bg-[#0B0F19]/80 border-t border-white/10 flex flex-wrap gap-2">
                <span className="text-[11px] text-slate-400 self-center font-medium">Coba cepat:</span>
                {quickChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendSimulatorChat(chip.text)}
                    className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[#2997FF] text-[11px] font-semibold border border-white/10 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-4 bg-[#0B0F19]/90 border-t border-white/10 flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSimulatorChat()}
                  placeholder="Ketik transaksimu (misal: bakso 15rb)..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0071E3]"
                />
                <button
                  onClick={() => handleSendSimulatorChat()}
                  className="p-2.5 rounded-xl apple-blue-gradient text-white shadow-md glow-blue hover:brightness-110"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: DASHBOARD PREVIEW */}
          {heroActiveTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto liquid-glass rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white">Dashboard Finansial SimpanUang</h3>
                  <p className="text-xs text-slate-400">Ringkasan real-time tersinkronisasi otomatis dengan Telegram</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center space-x-1 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Live Realtime Sync</span>
                  </span>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[11px] font-bold text-[#2997FF] block">Saldo Total</span>
                  <span className="text-xl font-black text-white mt-1 block">Rp24.850.000</span>
                  <span className="text-[10px] text-slate-400">3 Dompet aktif</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[11px] font-bold text-emerald-400 block">Pemasukan Bulan Ini</span>
                  <span className="text-xl font-black text-white mt-1 block">Rp14.000.000</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">↑ Gaji Pokok</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[11px] font-bold text-rose-400 block">Pengeluaran Bulan Ini</span>
                  <span className="text-xl font-black text-white mt-1 block">Rp4.120.000</span>
                  <span className="text-[10px] text-slate-400">29% dari pemasukan</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[11px] font-bold text-[#2997FF] block">Budget Tersisa</span>
                  <span className="text-xl font-black text-white mt-1 block">Rp3.880.000</span>
                  <span className="text-[10px] text-blue-400 font-semibold">Terkendali aman</span>
                </div>
              </div>

              {/* Category Breakdown Progress */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-300 block">Progress Budget Kategori Utama</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-300">🍜 Makanan &amp; Minuman</span>
                      <span className="font-bold text-[#2997FF]">Rp1.850.000 / Rp2.500.000 (74%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full apple-blue-gradient rounded-full" style={{ width: '74%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-300">🚗 Transportasi</span>
                      <span className="font-bold text-emerald-400">Rp450.000 / Rp1.000.000 (45%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 5. FITUR SECTION (3 FITUR ALTERNATING LAYOUT) */}
        <section id="fitur" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-20">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              FITUR UTAMA
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Dirancang untuk Otomasi Finansial Tanpa Beban
            </h2>
          </div>

          {/* Feature 1: Catat via Telegram (Teks, VN & Foto Struk) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/15 text-[#2997FF] text-xs font-bold inline-block border border-blue-500/30">
                Fitur 01
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
                Catat Transaksi Semudah Chatting (Teks, Suara, dan Foto Struk)
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Tidak perlu install aplikasi tambahan. Cukup buka Telegram yang kamu gunakan sehari-hari. AI canggih SimpanUang memproses teks natural bahasa Indonesia, rekaman suara voice note, hingga foto struk kasir dengan detail rincian per barang.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Parsing nominal format lokal: &quot;15rb&quot;, &quot;1.5jt&quot;, &quot;500k&quot;, dsb.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Multi-modal Vision OCR mengekstraksi nama item dan subtotal harga.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Transkripsi otomatis voice note dengan batas aman durasi 60 detik.</span>
                </li>
              </ul>
            </div>
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                <MessageSquare className="w-5 h-5 text-[#2997FF] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-white block">Input Bahasa Sehari-hari</span>
                  <p className="text-xs text-slate-300 mt-0.5">&quot;beli nasgor 25rb pakai mandiri, traktiran adik&quot;</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#080C14] text-white font-mono text-xs space-y-1 border border-white/10">
                <div className="text-emerald-400 font-bold">✓ Parsing Berhasil (AI Gemini 2.0)</div>
                <div>├ Jenis: Pengeluaran</div>
                <div>├ Nominal: Rp25.000</div>
                <div>├ Kategori: 🍜 Makanan &amp; Minuman</div>
                <div>└ Dompet: Mandiri Tabungan</div>
              </div>
            </div>
          </div>

          {/* Feature 2: Laporan & Export Otomatis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center lg:flex-row-reverse">
            <div className="order-2 lg:order-1 liquid-glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold text-white">Export Laporan Finansial</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">On-Demand</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Laporan_Keuangan_2026.xlsx</div>
                      <div className="text-[10px] text-slate-400">Excel format • Lengkap multi-sheet</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2997FF]">Download</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-rose-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Laporan_Resmi_Audit.pdf</div>
                      <div className="text-[10px] text-slate-400">PDF format • Standar pembukuan rapi</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2997FF]">Download</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold inline-block border border-emerald-500/30">
                Fitur 02
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
                Laporan Lengkap &amp; Export On-Demand di Dashboard
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Akses dashboard web native kapan saja untuk melihat rincian tabel transaksi, analisis kategori, net cashflow, dan histori export. Generate file Excel (.xlsx) dan PDF resmi kapan pun kamu butuhkan dengan signed URL Supabase Storage yang aman.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Filter fleksibel: rentang tanggal, kategori, wallet, dan pencarian catatan.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Item foto struk belanja otomatis expandable tanpa memecah baris.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Update real-time tanpa refresh halaman via Supabase Realtime.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: AI Financial Advisor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-[#2997FF] text-xs font-bold inline-block border border-blue-500/30">
                Fitur 03
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
                AI Financial Advisor Pribadi yang Proaktif
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Bukan cuma mencatat, SimpanUang menjaga kesehatan keuanganmu. AI secara proaktif mendeteksi lonjakan pengeluaran kategori abnormal, memberikan peringatan budget 80% &amp; 100%, serta rekomendasi hemat yang relevan langsung ke chat Telegram kamu.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Peringatan dini saat pengeluaran kategori naik &gt;50% dibanding minggu lalu.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Reminder harian yang santai dan ramah (maksimal 2x sehari sesuai setting).</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                  <span>Insight actionable tanpa jargon perbankan yang membingungkan.</span>
                </li>
              </ul>
            </div>
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-[#2997FF] font-bold">
                  <Bot className="w-4 h-4 text-[#2997FF]" />
                  <span>🤖 AI Financial Advisor</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  &quot;Hei Luki! Pengeluaran kategori <strong>🍜 Makanan &amp; Minuman</strong> kamu minggu ini naik <strong>58%</strong> dibanding minggu lalu (terbanyak di kedai kopi).
                </p>
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/25 text-blue-200 font-medium">
                  💡 <strong>Saran:</strong> Coba batasi pembelian kopi di luar maksimal 2x seminggu untuk menghemat Rp240.000 hingga akhir bulan!&quot;
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. KALKULATOR BOCOR HALUS */}
        <section id="kalkulator" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="liquid-glass rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
                KALKULATOR FINANSIAL
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
                Hitung &quot;Bocor Halus&quot; Pengeluaranmu
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                Geser nilai pengeluaran kecil harianmu untuk melihat akumulasi nominalnya per bulan dan per tahun.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>☕ Kopi / Boba Harian:</span>
                    <span className="text-[#2997FF]">Rp{dailyCoffee.toLocaleString('id-ID')} / hari</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100000}
                    step={2000}
                    value={dailyCoffee}
                    onChange={(e) => setDailyCoffee(Number(e.target.value))}
                    className="w-full accent-[#0071E3]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>🍕 Nongkrong / Makan Akhir Pekan:</span>
                    <span className="text-[#2997FF]">Rp{weeklyHangout.toLocaleString('id-ID')} / minggu</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500000}
                    step={10000}
                    value={weeklyHangout}
                    onChange={(e) => setWeeklyHangout(Number(e.target.value))}
                    className="w-full accent-[#0071E3]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>📺 Langganan OTT / Hiburan:</span>
                    <span className="text-[#2997FF]">Rp{monthlySubs.toLocaleString('id-ID')} / bulan</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1000000}
                    step={25000}
                    value={monthlySubs}
                    onChange={(e) => setMonthlySubs(Number(e.target.value))}
                    className="w-full accent-[#0071E3]"
                  />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
                <span className="text-xs font-bold text-[#2997FF] uppercase tracking-wider block">
                  Total Bocor Halus Tanpa Sadar
                </span>
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white block">
                    Rp{totalBocorBulanan.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400">per bulan</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <span className="text-lg sm:text-xl font-bold text-[#2997FF] block">
                    Rp{totalBocorTahunan.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400">per tahun (bisa beli motor baru!)</span>
                </div>
                <Link
                  href="/login"
                  className="inline-block w-full py-3 rounded-xl apple-blue-gradient text-white text-xs font-bold shadow-lg glow-blue hover:brightness-110 transition-all"
                >
                  Kendalikan Uangmu Sekarang →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. TESTIMONI (MASONRY GRID PLACEHOLDER) */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              TESTIMONI PENGGUNA
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Cerita Mereka yang Bebas dari Boncos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 shadow-sm space-y-4 liquid-card-hover transition-all">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;Dulu selalu malas mencatat karena harus buka aplikasi bank dan excel satu per satu. Pakai SimpanUang tinggal chat &apos;kopi 22rb&apos; di Telegram pas nunggu pesanan. Sekarang tiap akhir bulan masih ada sisa tabungan 2 juta!&quot;
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-white/10">
                <div className="w-9 h-9 rounded-full apple-blue-gradient text-white font-bold flex items-center justify-center text-xs shadow glow-blue">
                  RS
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Rian Saputra</div>
                  <div className="text-[10px] text-slate-400">Karyawan Swasta (27 th), Jakarta</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 shadow-sm space-y-4 liquid-card-hover transition-all">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;Fitur foto struknya juara banget di paket Pro. Belanja bulanan di supermarket tinggal foto struk kasir, semua item langsung di-breakdown otomatis. Nggak ada lagi struk lecek menumpuk di dompet.&quot;
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-white/10">
                <div className="w-9 h-9 rounded-full bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-bold flex items-center justify-center text-xs">
                  DA
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Dina Anggraini</div>
                  <div className="text-[10px] text-slate-400">Ibu Rumah Tangga &amp; Freelancer, Bandung</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 shadow-sm space-y-4 liquid-card-hover transition-all">
              <div className="flex items-center space-x-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;Uang saku bulanan mahasiswa sering habis sebelum tanggal 20. Berkat reminder Telegram SimpanUang dan alert budget 80%, pengeluaran makan dan nongkrong jadi terkontrol rapi. Super recommended!&quot;
              </p>
              <div className="flex items-center space-x-3 pt-2 border-t border-white/10">
                <div className="w-9 h-9 rounded-full bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold flex items-center justify-center text-xs">
                  FA
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Fajar Alfian</div>
                  <div className="text-[10px] text-slate-400">Mahasiswa Semester 6, Yogyakarta</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. PRICING (STARTER VS PRO) */}
        <section id="harga" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              PAKET &amp; INVESTASI
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Pilih Paket Sesuai Kebutuhanmu
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Investasi kecil untuk kontrol penuh atas jutaan rupiah penghasilanmu setiap bulan.
            </p>

            {/* Pricing Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'apple-blue-gradient text-white shadow glow-blue'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Langganan Bulanan
              </button>
              <button
                onClick={() => setBillingCycle('lifetime')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                  billingCycle === 'lifetime'
                    ? 'apple-blue-gradient text-white shadow glow-blue'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Sekali Bayar Seumur Hidup</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-extrabold">Hemat 60%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* PLAN 1: STARTER */}
            <div className="liquid-glass rounded-3xl p-8 border border-white/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 text-xs font-bold">
                    Starter
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">Rp49.000</span>
                  <span className="text-xs text-slate-400"> / bulan</span>
                  <p className="text-xs text-slate-400 mt-2">
                    Cocok untuk mahasiswa dan perorangan yang ingin mulai disiplin mencatat pengeluaran.
                  </p>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Catat transaksi via teks &amp; VN Telegram</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dashboard web lengkap &amp; ringkasan bulanan</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Maksimal 50 transaksi / bulan</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Maksimal 3 dompet (wallet), 5 kategori budget</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Tanpa input foto struk OCR</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-500">
                    <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Tanpa AI Financial Advisor &amp; export PDF/Excel</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold text-center transition-colors"
              >
                Pilih Starter (Rp49.000)
              </Link>
            </div>

            {/* PLAN 2: PRO */}
            <div className="liquid-glass rounded-3xl p-8 border-2 border-[#0071E3] shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full apple-blue-gradient text-white text-[10px] font-extrabold shadow-lg glow-blue">
                PALING DIMINATI
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-[#2997FF] border border-blue-500/30 text-xs font-bold">
                    Pro Lifetime
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">Rp99.000</span>
                  <span className="text-xs text-[#2997FF] font-bold"> Sekali Bayar Seumur Hidup</span>
                  <p className="text-xs text-slate-400 mt-2">
                    Akses tak terbatas untuk karyawan, profesional, dan keluarga cerdas finansial.
                  </p>
                </div>

                <ul className="space-y-3 text-xs text-slate-200 mb-8">
                  <li className="flex items-center space-x-2 font-semibold text-white">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>Semua fitur Starter tanpa batas kuota (Unlimited)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>Input foto struk dengan AI Vision OCR cerdas</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>Unlimited dompet (BCA, Mandiri, Cash, GoPay, OVO, dll)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>AI Financial Advisor proaktif &amp; deteksi lonjakan biaya</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>Laporan lengkap filter lanjutan + Export PDF &amp; Excel</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2997FF] shrink-0" />
                    <span>Reminder kustom harian &amp; Prioritas support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 rounded-2xl apple-blue-gradient text-white text-xs font-extrabold text-center shadow-lg glow-blue hover:brightness-110 transition-all"
              >
                Ambil Akses Pro Seumur Hidup (Rp99.000) →
              </Link>
            </div>
          </div>
        </section>

        {/* 9. FAQ ACCORDION (MINIMAL 7 PERTANYAAN RELEVAN) */}
        <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#2997FF] uppercase tracking-widest block mb-1">
              PERTANYAAN UMUM
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#F8FAFC]">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Semua yang perlu kamu ketahui seputar SimpanUang dan integrasi bot Telegram.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="liquid-glass rounded-2xl border border-white/10 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-[#2997FF] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === index ? 'rotate-180 text-[#2997FF]' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 10. FINAL CTA (APPLE SAPPHIRE BLUE GRADIENT) */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="rounded-3xl apple-blue-gradient p-10 sm:p-14 text-white text-center shadow-2xl glow-blue space-y-6 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold tracking-wider uppercase inline-block">
                Mulai Hari Ini
              </span>
              <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
                Mulai kendalikan keuanganmu hari ini
              </h2>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Catat keuangan semudah chat — langsung dari Telegram kamu tanpa ribet dan tanpa boncos.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl bg-white text-[#0071E3] text-sm font-black shadow-xl hover:bg-slate-100 transition-all"
                >
                  <span>Mulai Gratis Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-300/20 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </section>

        {/* 11. FOOTER (4 KOLOM) */}
        <footer className="bg-[#0B0F19] text-slate-300 pt-16 pb-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 text-xs">
              
              {/* Kolom 1: Logo + Tagline + Sosmed */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <WalletLogo size="sm" />
                  <span className="text-xl font-black tracking-tight text-white">
                    Simpan<span className="apple-blue-text">Uang</span>
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Catat keuangan semudah chat — langsung dari Telegram kamu. Terintegrasi AI canggih dan Supabase PostgreSQL.
                </p>
                <div className="text-[11px] text-slate-500">
                  Powered by TataDana Engine Platform
                </div>
              </div>

              {/* Kolom 2: Produk */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Produk</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><a href="#fitur" className="hover:text-white transition-colors">Catat via Telegram</a></li>
                  <li><a href="#fitur" className="hover:text-white transition-colors">Vision OCR Struk Kasir</a></li>
                  <li><a href="#fitur" className="hover:text-white transition-colors">Laporan &amp; Export On-Demand</a></li>
                  <li><a href="#demo" className="hover:text-white transition-colors">Telegram Bot Simulator</a></li>
                  <li><a href="#kalkulator" className="hover:text-white transition-colors">Kalkulator Bocor Halus</a></li>
                </ul>
              </div>

              {/* Kolom 3: Perusahaan */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Perusahaan</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard Pengguna</Link></li>
                  <li><Link href="/admin" className="hover:text-white transition-colors">Superadmin Suite</Link></li>
                  <li><a href="#harga" className="hover:text-white transition-colors">Paket &amp; Harga</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">Bantuan &amp; FAQ</a></li>
                </ul>
              </div>

              {/* Kolom 4: Legal */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal &amp; Kontak</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Kebijakan Privasi (/privacy)</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Syarat &amp; Ketentuan (/terms)</Link></li>
                  <li><span className="text-slate-500">Kontak: halo@simpanuang.id</span></li>
                  <li><span className="text-slate-500">WIB (Asia/Jakarta) Active</span></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <div>
                © 2026 SimpanUang (TataDana). Seluruh hak cipta dilindungi undang-undang.
              </div>
              <div className="flex items-center space-x-4">
                <span>Fintech Standard Security</span>
                <span>•</span>
                <span>Bank-Grade 256-bit Encryption</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
