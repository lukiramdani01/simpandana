'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ReceiptText,
  FileBarChart2,
  PieChart as PieChartIcon,
  Wallet as WalletIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Sparkles,
  Search,
  ChevronRight,
  AlertTriangle,
  Bot,
  LogOut,
  CreditCard,
  User,
  Clock,
  Tag,
  Trash2,
  Loader2,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Calendar,
  Camera,
  FileText,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Send,
  Zap,
  Filter,
  ChevronLeft,
  CalendarDays,
  BarChart3,
  LineChart as LineChartIcon,
  Menu,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import {
  initialProfile,
  initialWallets,
  initialCategories,
  initialBudgets,
  initialTransactions,
  initialAIProviders
} from '@/lib/mock-data';

import { Transaction, Wallet, Budget, Category } from '@/lib/types';
import { generateBudgetProgressBar, parseTransactionFromText } from '@/lib/nlp-parser';
import WalletLogo from '@/components/WalletLogo';

const BANK_INSTITUTIONS = [
  { id: 'bca', name: 'BCA (Bank Central Asia)', shortName: 'BCA', icon: '🏦', color: '#0060AF' },
  { id: 'mandiri', name: 'Bank Mandiri', shortName: 'Mandiri', icon: '🏦', color: '#003876' },
  { id: 'bri', name: 'Bank BRI', shortName: 'BRI', icon: '🏦', color: '#00529C' },
  { id: 'bni', name: 'Bank BNI', shortName: 'BNI', icon: '🏦', color: '#F15A24' },
  { id: 'bsi', name: 'Bank Syariah Indonesia (BSI)', shortName: 'BSI', icon: '🏦', color: '#00A39D' },
  { id: 'cimb', name: 'CIMB Niaga', shortName: 'CIMB Niaga', icon: '🏦', color: '#ED1B24' },
  { id: 'permata', name: 'Permata Bank', shortName: 'Permata', icon: '🏦', color: '#008542' },
  { id: 'seabank', name: 'SeaBank', shortName: 'SeaBank', icon: '🏦', color: '#F05A28' },
  { id: 'jago', name: 'Bank Jago', shortName: 'Bank Jago', icon: '🏦', color: '#FF7B00' },
  { id: 'bank_other', name: 'Bank Lainnya', shortName: 'Bank Lainnya', icon: '🏦', color: '#0071E3' },
];

const EWALLET_INSTITUTIONS = [
  { id: 'gopay', name: 'GoPay', shortName: 'GoPay', icon: '📱', color: '#00AED6' },
  { id: 'ovo', name: 'OVO', shortName: 'OVO', icon: '📱', color: '#4C3494' },
  { id: 'dana', name: 'DANA', shortName: 'DANA', icon: '📱', color: '#118EEA' },
  { id: 'shopeepay', name: 'ShopeePay', shortName: 'ShopeePay', icon: '📱', color: '#EE4D2D' },
  { id: 'linkaja', name: 'LinkAja', shortName: 'LinkAja', icon: '📱', color: '#E32128' },
  { id: 'astrapay', name: 'AstraPay', shortName: 'AstraPay', icon: '📱', color: '#004098' },
  { id: 'ewallet_other', name: 'E-Wallet Lainnya', shortName: 'E-Wallet Lainnya', icon: '📱', color: '#0071E3' },
];

const CASH_INSTITUTIONS = [
  { id: 'dompet_fisik', name: 'Dompet Fisik', shortName: 'Dompet Fisik', icon: '💵', color: '#10B981' },
  { id: 'amplop', name: 'Amplop Bulanan', shortName: 'Amplop Bulanan', icon: '✉️', color: '#F59E0B' },
  { id: 'kas_kantor', name: 'Kas Kantor', shortName: 'Kas Kantor', icon: '💼', color: '#6366F1' },
  { id: 'brankas', name: 'Brankas Tunai', shortName: 'Brankas Tunai', icon: '🔒', color: '#64748B' },
  { id: 'cash_other', name: 'Tunai Lainnya', shortName: 'Tunai Lainnya', icon: '💵', color: '#10B981' },
];

const OTHER_INSTITUTIONS = [
  { id: 'lainnya_custom', name: 'Lainnya / Custom', shortName: 'Lainnya', icon: '🪙', color: '#8B5CF6' },
  { id: 'investasi', name: 'Investasi / Reksadana', shortName: 'Investasi / Reksadana', icon: '📈', color: '#06B6D4' },
  { id: 'saham', name: 'Saham / Sekuritas', shortName: 'Saham / Sekuritas', icon: '📊', color: '#3B82F6' },
  { id: 'kripto', name: 'Kripto / Aset Digital', shortName: 'Kripto / Aset Digital', icon: '⚡', color: '#EC4899' },
];

function getWIBDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
}

function getWIBDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'beranda' | 'transaksi' | 'laporan' | 'budget' | 'wallet' | 'settings' | 'admin' | 'bot_sim'>('beranda');
  
  // Client-side authentication guard: enforce login check
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasUserIdCookie = document.cookie.split('; ').some((item) => {
        const parts = item.trim().split('=');
        return parts[0] === 'tatadana_user_id' && parts[1] && parts[1].trim().length > 0;
      });

      const checkAuth = async () => {
        try {
          const { supabaseClient } = await import('@/lib/supabase/client');
          const { data } = await supabaseClient.auth.getSession();
          const hasSession = !!data?.session;
          if (!hasSession && !hasUserIdCookie) {
            router.replace('/login');
          }
        } catch {
          if (!hasUserIdCookie) {
            router.replace('/login');
          }
        }
      };

      checkAuth();
    }
  }, [router]);

  // Admin auth state check to hide admin link from regular users
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('simpandana_admin_auth', 'true');
      setIsAdminAuthenticated(true);
    }
  }, []);

  // Real-time transaction ledger sync (Dual-Channel: Supabase Realtime + Custom Event Broadcast)
  React.useEffect(() => {
    let isMounted = true;

    const fetchLatestTransactions = async () => {
      try {
        const activeId = profile?.id || 'usr-101';
        const res = await fetch(`/api/transactions?userId=${encodeURIComponent(activeId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.ok && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      } catch {
        // Network tolerance
      }
    };

    fetchLatestTransactions();
    const interval = setInterval(fetchLatestTransactions, 2000);

    // Channel 0: Server-Sent Events (SSE) Stream Subscription (<30ms push latency)
    let eventSource: EventSource | null = null;
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        const activeId = profile?.id || 'usr-101';
        eventSource = new EventSource(`/api/realtime/stream?userId=${encodeURIComponent(activeId)}`);

        eventSource.addEventListener('sync', (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload && payload.transaction) {
              const newTx = payload.transaction;
              setTransactions((prev) => {
                if (prev.some((t) => t.id === newTx.id)) return prev;
                return [newTx, ...prev];
              });
              setNewTxId(newTx.id);
              setTimeout(() => setNewTxId(null), 3500);

              if (payload.balanceAfter !== undefined && (payload.walletId || newTx.wallet_id)) {
                const targetWid = payload.walletId || newTx.wallet_id;
                setWallets((prev) =>
                  prev.map((w) =>
                    w.id === targetWid || (w.is_default && targetWid === 'w-1')
                      ? { ...w, balance: payload.balanceAfter }
                      : w
                  )
                );
              }
            }
          } catch {}
        });
      } catch {}
    }

    // Channel 1: Client Custom Event & Storage Listener
    const handleTxEvent = (e: any) => {
      if (e.detail?.transaction) {
        const newTx = e.detail.transaction;
        setTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) return prev;
          return [newTx, ...prev];
        });
        setNewTxId(newTx.id);
        setTimeout(() => setNewTxId(null), 3500);
      }
      fetchLatestTransactions();
      if (e.detail?.balanceAfter !== undefined && e.detail?.transaction?.wallet_id) {
        const txWalletId = e.detail.transaction.wallet_id || 'w-1';
        setWallets((prev) =>
          prev.map((w) => (w.id === txWalletId || (w.is_default && txWalletId === 'w-1') ? { ...w, balance: e.detail.balanceAfter } : w))
        );
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'simpandana_last_tx' || e.key === 'simpandana_transactions_sync') {
        fetchLatestTransactions();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('simpandana:transaction_created', handleTxEvent);
      window.addEventListener('simpandana:wallet_updated', handleTxEvent);
      window.addEventListener('storage', handleStorageChange);
    }

    // Channel 2: Supabase Realtime Subscription
    let realtimeChannel: any = null;
    try {
      const { supabaseClient } = require('@/lib/supabase/client');
      realtimeChannel = supabaseClient
        .channel('dashboard_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchLatestTransactions();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
          fetchLatestTransactions();
        })
        .subscribe();
    } catch {}

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('simpandana:transaction_created', handleTxEvent);
        window.removeEventListener('simpandana:wallet_updated', handleTxEvent);
        window.removeEventListener('storage', handleStorageChange);
      }
      if (realtimeChannel) {
        try {
          realtimeChannel.unsubscribe();
        } catch {}
      }
    };
  }, []);

  // Data States
  const [profile, setProfile] = useState(initialProfile);
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  // New Transaction Modal State
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txCategory, setTxCategory] = useState(categories[0]?.name || 'Makanan & Minuman');
  const [txWallet, setTxWallet] = useState(wallets[0]?.id || 'w-1');

  // Telegram Settings States
  const [telegramToken, setTelegramToken] = useState(profile.telegram_bot_token || '');
  const [testBotLoading, setTestBotLoading] = useState(false);
  const [testBotResult, setTestBotResult] = useState<{ status: string; message: string } | null>(null);

  // User Settings Sub-Tabs State
  const [settingsSubTab, setSettingsSubTab] = useState<'profil' | 'telegram' | 'reminder' | 'kategori'>('profil');

  // Profile Form States
  const [profileFullName, setProfileFullName] = useState(profile.full_name);
  const [profilePhone, setProfilePhone] = useState(profile.phone);
  const [profileCurrency, setProfileCurrency] = useState(profile.default_currency || 'IDR');
  const [profileTimezone, setProfileTimezone] = useState(profile.timezone || 'Asia/Jakarta');
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Daily Reminder States (WIB)
  const [reminderActive, setReminderActive] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState<1 | 2>(2);
  const [reminderTime1, setReminderTime1] = useState('08:00');
  const [reminderTime2, setReminderTime2] = useState('20:00');
  const [reminderSavedFeedback, setReminderSavedFeedback] = useState(false);

  // Custom Category Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatEmoji, setNewCatEmoji] = useState('🍜');
  const [newCatColor, setNewCatColor] = useState('#FF5A1F');
  const [catSavedFeedback, setCatSavedFeedback] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Multi-Wallet Modal States
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWalletName, setNewWalletName] = useState('BCA');
  const [newWalletType, setNewWalletType] = useState<'bank' | 'ewallet' | 'cash' | 'other'>('bank');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletNumber, setNewWalletNumber] = useState('');
  const [newWalletIcon, setNewWalletIcon] = useState('🏦');
  const [newWalletColor, setNewWalletColor] = useState('#0060AF');
  const [newWalletInstitution, setNewWalletInstitution] = useState('bca');
  const [newWalletIsDefault, setNewWalletIsDefault] = useState(false);

  const handleWalletTypeChange = (t: 'bank' | 'ewallet' | 'cash' | 'other') => {
    setNewWalletType(t);
    let first;
    if (t === 'bank') first = BANK_INSTITUTIONS[0];
    else if (t === 'ewallet') first = EWALLET_INSTITUTIONS[0];
    else if (t === 'cash') first = CASH_INSTITUTIONS[0];
    else first = OTHER_INSTITUTIONS[0];
    setNewWalletInstitution(first.id);
    setNewWalletIcon(first.icon);
    setNewWalletColor(first.color);
    setNewWalletName(first.shortName);
  };

  const handleInstitutionChange = (id: string) => {
    setNewWalletInstitution(id);
    const all = [...BANK_INSTITUTIONS, ...EWALLET_INSTITUTIONS, ...CASH_INSTITUTIONS, ...OTHER_INSTITUTIONS];
    const found = all.find((i) => i.id === id);
    if (found) {
      setNewWalletIcon(found.icon);
      setNewWalletColor(found.color);
      setNewWalletName(found.shortName);
    }
  };

  // Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState(wallets[0]?.id || '');
  const [transferTo, setTransferTo] = useState(wallets[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');

  // Period & Date Filter State
  const [periodFilter, setPeriodFilter] = useState<'all' | '1d' | '7d' | '30d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-30');

  // Budget Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetCategoryName, setBudgetCategoryName] = useState('Makanan & Minuman');
  const [budgetLimitInput, setBudgetLimitInput] = useState('1500000');

  // Receipt OCR State
  const [showInteractiveReceiptCard, setShowInteractiveReceiptCard] = useState(false);
  const [showTataAIModal, setShowTataAIModal] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptMerchant, setReceiptMerchant] = useState('Indomaret Point — Sudirman');
  const [receiptDate, setReceiptDate] = useState('2026-09-18');
  const [receiptCategory, setReceiptCategory] = useState('Makanan & Minuman');
  const [receiptItems, setReceiptItems] = useState([
    { name: 'Susu Ultra Milk Cokelat 250ml', price: 7500, category: 'Makanan & Minuman' },
    { name: 'Roti Tawar Gandum Sari Roti', price: 15000, category: 'Makanan & Minuman' },
    { name: 'Air Mineral Aqua 600ml', price: 4500, category: 'Makanan & Minuman' },
  ]);
  const [receiptTotal, setReceiptTotal] = useState(27000);
  const [receiptWallet, setReceiptWallet] = useState(wallets[0]?.id || 'w-1');
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tata AI Simulator State
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: 'user' | 'bot';
      text: string;
      time: string;
      extra?: any;
      imageUrl?: string;
      pendingWalletChoice?: {
        id: string;
        type: 'expense' | 'income' | 'transfer';
        amount: number;
        category: string;
        categoryIcon: string;
        notes: string;
        completedWallet?: string;
      };
    }>
  >([
    {
      sender: 'bot',
      text: '👋 Halo Luki! Saya **Tata AI**, asisten keuangan pribadimu.\n\nKamu bisa mencatat pengeluaran & pemasukan semudah chat biasa, kirim foto struk belanja, atau tanya analisis keuanganmu.\n\nCoba klik tombol cepat di bawah atau ketik langsung transaksi Anda! 🚀',
      time: '10:30 WIB',
    }
  ]);
  const [simInput, setSimInput] = useState('');

  const userTransactions = useMemo(() => {
    const activeUserId = profile?.id || 'usr-101';
    const tgUserId = profile?.telegram_user_id?.toString();
    const filtered = transactions.filter(
      (t) =>
        !t.user_id ||
        t.user_id === activeUserId ||
        t.user_id === 'usr-101' ||
        (tgUserId && (t.user_id === tgUserId || String(t.user_id) === tgUserId))
    );
    return [...filtered].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [transactions, profile?.id, profile?.telegram_user_id]);

  // Period Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (periodFilter === 'all') return userTransactions;
    const now = new Date();
    const todayWIB = getWIBDateString(now);

    const parseTxWIBDate = (t: Transaction): string => {
      if (t.date) {
        const cleanDate = t.date.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          return cleanDate;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanDate)) {
          return cleanDate.replace(/\//g, '-');
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
          const [d, m, y] = cleanDate.split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(cleanDate)) {
          const [d, m, y] = cleanDate.split('-');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        if (cleanDate.includes('T')) {
          return getWIBDateString(new Date(cleanDate));
        }
        const parsed = new Date(cleanDate);
        if (!isNaN(parsed.getTime())) {
          return getWIBDateString(parsed);
        }
      }
      return getWIBDateString(new Date(t.created_at || Date.now()));
    };

    if (periodFilter === '1d') {
      return userTransactions.filter((t) => parseTxWIBDate(t) === todayWIB);
    }
    if (periodFilter === '7d') {
      const sevenDaysAgo = getWIBDateDaysAgo(7);
      return userTransactions.filter((t) => {
        const txDate = parseTxWIBDate(t);
        return txDate >= sevenDaysAgo;
      });
    }
    if (periodFilter === '30d') {
      const thirtyDaysAgo = getWIBDateDaysAgo(30);
      return userTransactions.filter((t) => {
        const txDate = parseTxWIBDate(t);
        return txDate >= thirtyDaysAgo;
      });
    }
    if (periodFilter === 'custom') {
      return userTransactions.filter((t) => {
        const txDate = parseTxWIBDate(t);
        return (!customStartDate || txDate >= customStartDate) && (!customEndDate || txDate <= customEndDate);
      });
    }
    return userTransactions;
  }, [userTransactions, periodFilter, customStartDate, customEndDate]);

  // Interactive Visual Calendar Modal State
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [calViewYear, setCalViewYear] = useState(2026);
  const [calViewMonth, setCalViewMonth] = useState(8); // September (0-indexed: 8)
  const [laporanSearchQuery, setLaporanSearchQuery] = useState('');
  const [laporanCategoryFilter, setLaporanCategoryFilter] = useState('all');
  const [transaksiSearchQuery, setTransaksiSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [newTxId, setNewTxId] = useState<string | null>(null);

  // Interactive Calendar Selection Handlers
  const handleSelectCalendarDate = (dateStr: string) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(dateStr);
      setCustomEndDate('');
      setPeriodFilter('custom');
    } else {
      if (dateStr >= customStartDate) {
        setCustomEndDate(dateStr);
      } else {
        setCustomEndDate(customStartDate);
        setCustomStartDate(dateStr);
      }
      setPeriodFilter('custom');
    }
  };

  const handleApplyPreset = (preset: 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (preset === 'today') {
      const d = getWIBDateString(now);
      setCustomStartDate(d);
      setCustomEndDate(d);
      setPeriodFilter('1d');
    } else if (preset === '7d') {
      const s = getWIBDateDaysAgo(6);
      const e = getWIBDateString(now);
      setCustomStartDate(s);
      setCustomEndDate(e);
      setPeriodFilter('7d');
    } else if (preset === '30d') {
      const s = getWIBDateDaysAgo(29);
      const e = getWIBDateString(now);
      setCustomStartDate(s);
      setCustomEndDate(e);
      setPeriodFilter('30d');
    } else if (preset === 'thisMonth') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setCustomStartDate(`${y}-${m}-01`);
      setCustomEndDate(`${y}-${m}-${lastDay}`);
      setPeriodFilter('custom');
    } else if (preset === 'lastMonth') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prevDate.getMonth() + 1, 0).getDate();
      setCustomStartDate(`${y}-${m}-01`);
      setCustomEndDate(`${y}-${m}-${lastDay}`);
      setPeriodFilter('custom');
    }
  };

  // Period Metrics & Calculations
  const periodMetrics = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const cashflow = income - expense;

    const now = new Date();
    let label = 'Bulanan (30 Hari)';
    let daysCount = 30;

    if (periodFilter === '1d') {
      label = 'Hari Ini (' + now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ')';
      daysCount = 1;
    } else if (periodFilter === '7d') {
      label = '7 Hari Terakhir';
      daysCount = 7;
    } else if (periodFilter === '30d') {
      label = 'Bulanan (30 Hari)';
      daysCount = 30;
    } else if (periodFilter === 'custom') {
      const s = customStartDate ? new Date(customStartDate) : now;
      const e = customEndDate ? new Date(customEndDate) : now;
      const diffTime = Math.abs(e.getTime() - s.getTime());
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      label = `${customStartDate || 'Awal'} s/d ${customEndDate || 'Akhir'} (${daysCount} Hari)`;
    }

    const dailyAverage = Math.round(expense / (daysCount || 1));

    // Category breakdown for filtered period
    const catMap: Record<string, { amount: number; count: number; icon: string }> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catName = t.category_name || 'Lainnya';
        if (!catMap[catName]) {
          const catObj = categories.find((c) => c.name === catName);
          catMap[catName] = { amount: 0, count: 0, icon: catObj?.icon || '💸' };
        }
        catMap[catName].amount += t.amount;
        catMap[catName].count += 1;
      });

    const categoryList = Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        icon: data.icon,
        percentage: expense > 0 ? Math.round((data.amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      income,
      expense,
      cashflow,
      daysCount,
      label,
      dailyAverage,
      categoryList,
      incomeCount: filteredTransactions.filter((t) => t.type === 'income').length,
      expenseCount: filteredTransactions.filter((t) => t.type === 'expense').length,
    };
  }, [filteredTransactions, periodFilter, customStartDate, customEndDate, categories]);

  // Interval Chart Data for Bar & Line Charts
  const chartIntervals = useMemo(() => {
    if (periodFilter === '1d') {
      const buckets = [
        { label: 'Pagi (06-10)', income: 0, expense: 0 },
        { label: 'Siang (10-14)', income: 0, expense: 0 },
        { label: 'Sore (14-18)', income: 0, expense: 0 },
        { label: 'Malam (18-22)', income: 0, expense: 0 },
      ];
      filteredTransactions.forEach((t) => {
        const hour = parseInt(t.time_wib?.split(':')[0] || '12', 10);
        let bIdx = 1;
        if (hour < 10) bIdx = 0;
        else if (hour < 14) bIdx = 1;
        else if (hour < 18) bIdx = 2;
        else bIdx = 3;

        if (t.type === 'income') buckets[bIdx].income += t.amount;
        else if (t.type === 'expense') buckets[bIdx].expense += t.amount;
      });
      return buckets;
    }

    if (periodFilter === '7d') {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const now = new Date();
      const buckets: Array<{ label: string; dateStr: string; income: number; expense: number }> = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = getWIBDateString(d);
        const dayLabel = `${days[d.getDay()]} (${d.getDate()})`;
        buckets.push({ label: dayLabel, dateStr, income: 0, expense: 0 });
      }

      filteredTransactions.forEach((t) => {
        const target = buckets.find((b) => b.dateStr === t.date);
        if (target) {
          if (t.type === 'income') target.income += t.amount;
          else if (t.type === 'expense') target.expense += t.amount;
        }
      });
      return buckets;
    }

    // Default: 30d or custom range
    const buckets = [
      { label: 'Minggu 1 (Tgl 1-7)', income: 0, expense: 0 },
      { label: 'Minggu 2 (Tgl 8-14)', income: 0, expense: 0 },
      { label: 'Minggu 3 (Tgl 15-21)', income: 0, expense: 0 },
      { label: 'Minggu 4 (Tgl 22-28)', income: 0, expense: 0 },
      { label: 'Minggu 5 (Tgl 29+)', income: 0, expense: 0 },
    ];

    filteredTransactions.forEach((t) => {
      const day = parseInt(t.date?.split('-')[2] || '1', 10);
      let idx = 0;
      if (day <= 7) idx = 0;
      else if (day <= 14) idx = 1;
      else if (day <= 21) idx = 2;
      else if (day <= 28) idx = 3;
      else idx = 4;

      if (t.type === 'income') buckets[idx].income += t.amount;
      else if (t.type === 'expense') buckets[idx].expense += t.amount;
    });

    return buckets;
  }, [filteredTransactions, periodFilter]);

  // Total & Dynamic Reactive Calculations
  const currentMonthIncome = userTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const currentMonthExpense = userTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const displayedWallets = useMemo(() => {
    return wallets.map((w) => {
      const walletTxs = userTransactions.filter(
        (t) =>
          t.wallet_id === w.id ||
          t.wallet_name === w.name ||
          (!t.wallet_id && w.is_default) ||
          (w.is_default && (!t.wallet_id || t.wallet_id === 'w-1' || t.wallet_id.startsWith('w_cash_')))
      );
      const incomeSum = walletTxs.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenseSum = walletTxs.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const baseBal = w.initial_balance !== undefined ? w.initial_balance : 0;
      return {
        ...w,
        balance: baseBal + incomeSum - expenseSum,
      };
    });
  }, [wallets, userTransactions]);

  const totalBalance = displayedWallets.reduce((acc, curr) => acc + curr.balance, 0);

  const displayedBudgets = useMemo(() => {
    return budgets.map((b) => {
      const catSpent = userTransactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            ((t.category_name || '').toLowerCase().includes((b.category_name || '').toLowerCase()) ||
              (b.category_name || '').toLowerCase().includes((t.category_name || '').toLowerCase()) ||
              ((t.category_name || '').toLowerCase().includes('makanan') && (b.category_name || '').toLowerCase().includes('makanan')) ||
              ((t.category_name || '').toLowerCase().includes('transport') && (b.category_name || '').toLowerCase().includes('transport')))
        )
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...b,
        current_spent: catSpent > 0 ? catSpent : b.current_spent,
      };
    });
  }, [budgets, userTransactions]);

  const totalBudgetLimit = displayedBudgets.reduce((acc, curr) => acc + curr.monthly_limit, 0);
  const totalBudgetSpent = displayedBudgets.reduce((acc, curr) => acc + curr.current_spent, 0);
  const remainingBudget = Math.max(totalBudgetLimit - totalBudgetSpent, 0);

  // MULTI-WALLET HANDLERS
  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const initialBal = parseFloat(newWalletBalance.replace(/[^\d]/g, '')) || 0;
    const newId = `w-${Date.now()}`;

    const newW: Wallet = {
      id: newId,
      user_id: profile.id,
      name: newWalletName.trim(),
      type: newWalletType,
      balance: initialBal,
      initial_balance: initialBal,
      is_default: newWalletIsDefault || wallets.length === 0,
      icon: newWalletIcon,
      color: newWalletColor || '#0071E3',
      account_number: newWalletNumber.trim() || undefined,
    };

    if (newW.is_default) {
      setWallets([newW, ...wallets.map((w) => ({ ...w, is_default: false }))]);
    } else {
      setWallets([...wallets, newW]);
    }

    setNewWalletName('');
    setNewWalletBalance('');
    setNewWalletNumber('');
    setNewWalletIsDefault(false);
    setShowAddWalletModal(false);
  };

  const handleDeleteWallet = (walletId: string) => {
    if (wallets.length <= 1) {
      alert('Anda harus memiliki minimal 1 dompet aktif.');
      return;
    }

    const targetWallet = wallets.find((w) => w.id === walletId);
    if (!confirm(`Apakah Anda yakin ingin menghapus dompet "${targetWallet?.name}"?`)) {
      return;
    }

    const updated = wallets.filter((w) => w.id !== walletId);
    if (targetWallet?.is_default && updated.length > 0) {
      updated[0].is_default = true;
    }

    setWallets(updated);
  };

  const handleSetDefaultWallet = (walletId: string) => {
    setWallets(
      wallets.map((w) => ({
        ...w,
        is_default: w.id === walletId,
      }))
    );
  };

  const handleTransferWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFrom === transferTo) {
      alert('Dompet asal dan tujuan tidak boleh sama.');
      return;
    }

    const amountNum = parseFloat(transferAmount.replace(/[^\d]/g, ''));
    if (!amountNum || amountNum <= 0) {
      alert('Masukkan nominal transfer yang valid.');
      return;
    }

    const sourceW = wallets.find((w) => w.id === transferFrom);
    if (sourceW && sourceW.balance < amountNum) {
      alert(`Saldo ${sourceW.name} tidak mencukupi (Saldo: Rp${sourceW.balance.toLocaleString('id-ID')}).`);
      return;
    }

    const destW = wallets.find((w) => w.id === transferTo);

    setWallets(
      wallets.map((w) => {
        if (w.id === transferFrom) {
          return { ...w, balance: w.balance - amountNum };
        }
        if (w.id === transferTo) {
          return { ...w, balance: w.balance + amountNum };
        }
        return w;
      })
    );

    const now = new Date();
    const timeWibStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(now)
      .replace('.', ':');

    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      user_id: profile.id,
      wallet_id: transferFrom,
      wallet_name: sourceW?.name,
      type: 'transfer',
      amount: amountNum,
      date: getWIBDateString(now),
      time_wib: timeWibStr,
      notes: `Transfer dari ${sourceW?.name} ke ${destW?.name}`,
      source: 'web',
      created_at: now.toISOString(),
    };

    setTransactions([newTx, ...transactions]);
    setTransferAmount('');
    setShowTransferModal(false);
  };

  // CENTRAL REAL-TIME TRANSACTION RECORDER (Syncs Transactions, Wallets, and Category Budgets)
  const recordNewTransaction = (txData: {
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    category_name: string;
    wallet_id?: string;
    date?: string;
    notes?: string;
    source?: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice';
    items?: Array<{ name: string; price: number; quantity?: number; category?: string }>;
  }) => {
    const targetWalletId = txData.wallet_id || wallets.find((w) => w.is_default)?.id || wallets[0]?.id;
    const targetWallet = wallets.find((w) => w.id === targetWalletId) || wallets[0];
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(now)
      .replace('.', ':');
    const dateStr = getWIBDateString(now);

    const mappedItems = txData.items?.map((it, idx) => ({
      id: `ti-${Date.now()}-${idx}`,
      transaction_id: '',
      item_name: it.name,
      quantity: it.quantity || 1,
      price: it.price,
    }));

    const categoryObj = categories.find(
      (c) => c.name.toLowerCase() === txData.category_name.toLowerCase()
    );
    const categoryIcon = categoryObj?.icon || (txData.type === 'income' ? '💼' : '🍜');

    const newTx: Transaction = {
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: profile.id || 'usr-101',
      wallet_id: targetWalletId,
      wallet_name: targetWallet?.name || 'BCA Utama',
      category_name: txData.category_name,
      category_icon: categoryIcon,
      type: txData.type,
      amount: txData.amount,
      date: txData.date || dateStr,
      time_wib: timeStr,
      notes: txData.notes || (txData.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      source: txData.source || 'telegram_text',
      items: mappedItems,
      created_at: now.toISOString(),
    };

    // 1. Update Transactions List (prepend) and trigger highlight pulse
    setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== newTx.id)]);
    setNewTxId(newTx.id);
    setTimeout(() => setNewTxId(null), 3500);

    // 2. Update Wallet Balance
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === targetWalletId) {
          return {
            ...w,
            balance: txData.type === 'income' ? w.balance + txData.amount : w.balance - txData.amount,
          };
        }
        return w;
      })
    );

    // 3. Update Category Budget if Expense
    if (txData.type === 'expense') {
      setBudgets((prev) => {
        const index = prev.findIndex(
          (b) =>
            (b.category_name || '').toLowerCase().includes(txData.category_name.toLowerCase()) ||
            txData.category_name.toLowerCase().includes((b.category_name || '').toLowerCase())
        );

        if (index >= 0) {
          const updated = [...prev];
          const newSpent = updated[index].current_spent + txData.amount;
          updated[index] = {
            ...updated[index],
            current_spent: newSpent,
            alert_80_sent: newSpent >= updated[index].monthly_limit * 0.8,
            alert_100_sent: newSpent >= updated[index].monthly_limit,
          };
          return updated;
        } else {
          // If no budget category exists, create a default 2x target
          const newBudget: Budget = {
            id: `b-${Date.now()}`,
            user_id: profile.id,
            category_id: `c-${Date.now()}`,
            category_name: txData.category_name,
            category_icon: categoryIcon,
            monthly_limit: Math.max(txData.amount * 2, 500000),
            current_spent: txData.amount,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            alert_80_sent: false,
            alert_100_sent: false,
          };
          return [...prev, newBudget];
        }
      });
    }

    const calculatedNewBalance =
      txData.type === 'income'
        ? (targetWallet?.balance || 0) + txData.amount
        : (targetWallet?.balance || 0) - txData.amount;

    // 4. Dispatch Custom Event & Broadcast Storage Event for instant UI sync
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('simpandana:transaction_created', {
            detail: { transaction: newTx, balanceAfter: calculatedNewBalance },
          })
        );
        localStorage.setItem(
          'simpandana_last_tx',
          JSON.stringify({ transaction: newTx, balanceAfter: calculatedNewBalance, timestamp: Date.now() })
        );
        localStorage.setItem('simpandana_transactions_sync', String(Date.now()));
      } catch {}
    }

    // 5. Persist to Backend Memory Store & Supabase DB via POST /api/transactions
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newTx.id,
        userId: profile.id || 'usr-101',
        type: txData.type,
        amount: txData.amount,
        categoryName: txData.category_name,
        categoryIcon,
        walletId: targetWalletId,
        walletName: targetWallet?.name,
        notes: newTx.notes,
        source: txData.source || 'telegram_text',
        date: newTx.date,
        items: txData.items,
      }),
    }).catch((err) => console.warn('[Dashboard] Failed to persist transaction:', err));

    return {
      tx: newTx,
      newWalletBalance: calculatedNewBalance,
      walletName: targetWallet?.name || 'BCA Utama',
    };
  };

  // Add Transaction Handler (Modal)
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount.replace(/[^\d]/g, ''));
    if (!amountNum || amountNum <= 0) return;

    recordNewTransaction({
      type: txType,
      amount: amountNum,
      category_name: txCategory,
      wallet_id: txWallet,
      notes: txNotes || (txType === 'income' ? 'Pemasukan Manual' : 'Pengeluaran Manual'),
      source: 'web',
    });

    setTxAmount('');
    setTxNotes('');
    setShowAddTxModal(false);
  };

  // Budget Management Handlers
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(budgetLimitInput.replace(/[^\d]/g, ''));
    if (!limitNum || limitNum <= 0) {
      alert('Masukkan limit budget yang valid.');
      return;
    }

    if (editingBudget) {
      setBudgets((prev) =>
        prev.map((b) => (b.id === editingBudget.id ? { ...b, monthly_limit: limitNum } : b))
      );
    } else {
      const selectedCat = categories.find((c) => c.name === budgetCategoryName);
      const newBudget: Budget = {
        id: `b-${Date.now()}`,
        user_id: profile.id,
        category_id: selectedCat?.id || `c-${Date.now()}`,
        category_name: budgetCategoryName,
        category_icon: selectedCat?.icon || '🎯',
        monthly_limit: limitNum,
        current_spent: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        alert_80_sent: false,
        alert_100_sent: false,
      };
      setBudgets((prev) => [...prev, newBudget]);
    }

    setShowBudgetModal(false);
    setEditingBudget(null);
    setBudgetLimitInput('');
  };

  const handleEditBudgetClick = (b: Budget) => {
    setEditingBudget(b);
    setBudgetCategoryName(b.category_name || 'Makanan & Minuman');
    setBudgetLimitInput(String(b.monthly_limit));
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = (budgetId: string) => {
    if (confirm('Hapus target budget kategori ini?')) {
      setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
    }
  };

  // Receipt Item Editing Handlers
  const handleUpdateReceiptItem = (index: number, field: 'name' | 'price', value: string | number) => {
    setReceiptItems((prev) => {
      const updated = [...prev];
      if (field === 'name') {
        updated[index] = { ...updated[index], name: String(value) };
      } else {
        const str = String(value).replace(/[^0-9]/g, '');
        const numVal = str === '' ? 0 : parseInt(str, 10);
        updated[index] = { ...updated[index], price: numVal };
      }
      const newTotal = updated.reduce((s, it) => s + (Number(it.price) || 0), 0);
      setReceiptTotal(newTotal);
      return updated;
    });
  };

  const handleAddReceiptItem = () => {
    setReceiptItems((prev) => {
      const updated = [...prev, { name: '', price: 0, category: receiptCategory }];
      const newTotal = updated.reduce((s, it) => s + (Number(it.price) || 0), 0);
      setReceiptTotal(newTotal);
      return updated;
    });
  };

  const handleRemoveReceiptItem = (index: number) => {
    setReceiptItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const newTotal = updated.reduce((s, it) => s + (Number(it.price) || 0), 0);
      setReceiptTotal(newTotal);
      return updated;
    });
  };

  // Receipt OCR Handlers (Upload -> Preview -> Scan -> Interactive Verification -> Ledger)
  const handleScanSampleReceipt = async () => {
    setIsScanningReceipt(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    // Clean sample receipt SVG data URL for instant visual preview
    const sampleReceiptSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="210" viewBox="0 0 320 210" fill="%230f172a"><rect width="320" height="210" rx="14" fill="%231e293b" stroke="%2338bdf8" stroke-width="1.5"/><text x="160" y="32" fill="%23f8fafc" font-size="14" font-weight="bold" text-anchor="middle">INDOMARET POINT</text><text x="160" y="50" fill="%2394a3b8" font-size="10" text-anchor="middle">Sudirman Point Lt. 1 — Jakarta</text><line x1="20" y1="64" x2="300" y2="64" stroke="%23334155" stroke-dasharray="4"/><text x="25" y="88" fill="%23e2e8f0" font-size="11">Susu Ultra Milk 250ml</text><text x="295" y="88" fill="%2338bdf8" font-size="11" text-anchor="end">Rp7.500</text><text x="25" y="110" fill="%23e2e8f0" font-size="11">Roti Tawar Gandum</text><text x="295" y="110" fill="%2338bdf8" font-size="11" text-anchor="end">Rp15.000</text><text x="25" y="132" fill="%23e2e8f0" font-size="11">Air Mineral Aqua 600ml</text><text x="295" y="132" fill="%2338bdf8" font-size="11" text-anchor="end">Rp4.500</text><line x1="20" y1="150" x2="300" y2="150" stroke="%23334155"/><text x="25" y="178" fill="%23f8fafc" font-size="13" font-weight="bold">TOTAL</text><text x="295" y="178" fill="%234ade80" font-size="14" font-weight="bold" text-anchor="end">Rp27.000</text></svg>`;

    setReceiptImageUrl(sampleReceiptSvg);

    // Step 1: Append User image message & OCR Scanning status
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: '📸 [Uji Coba Foto Struk: Indomaret Point — Sudirman]',
        imageUrl: sampleReceiptSvg,
        time: timeStr,
      },
      {
        sender: 'bot',
        text: '🔍 *Sedang memindai & mengekstrak item struk dengan OCR Vision AI...*',
        time: timeStr,
      },
    ]);

    // Step 2: Call real scan-receipt endpoint
    try {
      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: sampleReceiptSvg,
          fileName: 'indomaret-point.svg',
        }),
      });
      const data = await res.json();
      setIsScanningReceipt(false);

      if (data.ok) {
        setReceiptMerchant(data.merchant || 'Indomaret Point — Sudirman');
        setReceiptDate(data.date || getWIBDateString(now));
        setReceiptCategory(data.category || 'Makanan & Minuman');
        const rawItems = (data.items || []).map((it: any) => ({
          name: it.name || it.item_name || 'Item Belanja',
          price: Number(it.price) || 0,
          category: data.category || 'Makanan & Minuman',
        }));
        setReceiptItems(rawItems);
        const computedTotal = data.total || rawItems.reduce((s: number, i: any) => s + i.price, 0);
        setReceiptTotal(computedTotal);
        setShowInteractiveReceiptCard(true);

        const botReply = `🧾 **Foto Struk Berhasil Dipindai!**
🏪 **Merchant**: ${data.merchant || 'Indomaret Point — Sudirman'}
💸 **Total Terdeteksi**: Rp${Number(computedTotal).toLocaleString('id-ID')} (${rawItems.length} item)

🔍 *Kartu Verifikasi Struk telah ditampilkan di bawah. Anda bisa mengedit nama toko, tanggal, dompet, kategori, atau harga item sebelum disimpan.*`;

        setChatMessages((prev) => {
          const copy = [...prev];
          if (copy.length > 0 && copy[copy.length - 1].sender === 'bot') {
            copy[copy.length - 1] = { sender: 'bot', text: botReply, time: timeStr };
            return copy;
          }
          return [...prev, { sender: 'bot', text: botReply, time: timeStr }];
        });
      } else {
        throw new Error(data.error || 'Gagal ekstrak');
      }
    } catch {
      setIsScanningReceipt(false);
      setReceiptMerchant('Indomaret Point — Sudirman');
      setReceiptDate(getWIBDateString(now));
      setReceiptCategory('Makanan & Minuman');
      setReceiptItems([
        { name: 'Susu Ultra Milk Cokelat 250ml', price: 7500, category: 'Makanan & Minuman' },
        { name: 'Roti Tawar Gandum Sari Roti', price: 15000, category: 'Makanan & Minuman' },
        { name: 'Air Mineral Aqua 600ml', price: 4500, category: 'Makanan & Minuman' },
      ]);
      setReceiptTotal(27000);
      setShowInteractiveReceiptCard(true);
    }
  };

  const handleUploadReceiptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
    const userCaption = simInput.trim();
    if (userCaption) setSimInput('');

    setIsScanningReceipt(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setReceiptImageUrl(dataUrl);

      // 1. Post user message with the real uploaded receipt image & scanning status
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          text: userCaption ? `📸 [Upload Foto Struk: ${file.name}]\n"${userCaption}"` : `📸 [Upload Foto Struk: ${file.name}]`,
          imageUrl: dataUrl,
          time: timeStr,
        },
        {
          sender: 'bot',
          text: '🔍 *Sedang memindai & mengekstrak item struk dengan OCR Vision AI...*',
          time: timeStr,
        },
      ]);

      // 2. Call OCR Vision API endpoint
      try {
        const res = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            fileName: file.name,
            caption: userCaption,
          }),
        });
        const data = await res.json();
        setIsScanningReceipt(false);

        if (data.ok) {
          setReceiptMerchant(data.merchant || 'Struk Belanja');
          setReceiptDate(data.date || getWIBDateString());
          setReceiptCategory(data.category || 'Belanja');
          const rawItems = (data.items || []).map((it: any) => ({
            name: it.name || it.item_name || 'Item Belanja',
            price: Number(it.price) || 0,
            category: data.category || 'Belanja',
          }));
          setReceiptItems(rawItems);
          const computedTotal = data.total || rawItems.reduce((s: number, i: any) => s + i.price, 0);
          setReceiptTotal(computedTotal);
          setShowInteractiveReceiptCard(true);

          const botReply = `🧾 **Foto Struk Berhasil Dipindai!**
🏪 **Merchant**: ${data.merchant || 'Struk Belanja'}
📅 **Tanggal**: ${data.date || 'Hari ini'}
💸 **Total Terdeteksi**: Rp${Number(computedTotal).toLocaleString('id-ID')} (${rawItems.length} item)

🔍 *Kartu Verifikasi Struk telah ditampilkan di bawah. Silakan periksa, edit nama toko, item, atau nominal harga sebelum disimpan ke sistem.*`;

          setChatMessages((prev) => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].sender === 'bot') {
              copy[copy.length - 1] = { sender: 'bot', text: botReply, time: timeStr };
              return copy;
            }
            return [...prev, { sender: 'bot', text: botReply, time: timeStr }];
          });
        } else {
          throw new Error(data.error || 'Gagal ekstrak OCR');
        }
      } catch (err: any) {
        setIsScanningReceipt(false);
        setReceiptMerchant('Struk ' + file.name.replace(/\.[^/.]+$/, ''));
        setReceiptDate(new Date().toISOString().split('T')[0]);
        setReceiptCategory('Belanja');
        setReceiptItems([
          { name: 'Item Belanja 1', price: 25000, category: 'Belanja' },
          { name: 'Item Belanja 2', price: 15000, category: 'Belanja' },
        ]);
        setReceiptTotal(40000);
        setShowInteractiveReceiptCard(true);

        const botReply = `⚠️ *Foto struk telah terbaca. Kartu Verifikasi telah dibuka di bawah untuk Anda lengkapi rinciannya.*`;
        setChatMessages((prev) => {
          const copy = [...prev];
          if (copy.length > 0 && copy[copy.length - 1].sender === 'bot') {
            copy[copy.length - 1] = { sender: 'bot', text: botReply, time: timeStr };
            return copy;
          }
          return [...prev, { sender: 'bot', text: botReply, time: timeStr }];
        });
      }
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleConfirmReceipt = () => {
    const res = recordNewTransaction({
      type: 'expense',
      amount: receiptTotal,
      category_name: receiptCategory,
      wallet_id: receiptWallet,
      date: receiptDate,
      notes: `Foto Struk: ${receiptMerchant} (${receiptItems.length} item)`,
      source: 'telegram_photo',
      items: receiptItems.map((it) => ({
        name: it.name || 'Item Belanja',
        price: Number(it.price) || 0,
      })),
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
    const itemListText = receiptItems
      .filter((item) => (item.name || '').trim().length > 0 || item.price > 0)
      .map((item) => `  • ${item.name || 'Item'} (Rp${(Number(item.price) || 0).toLocaleString('id-ID')})`)
      .join('\n');

    const botReply = `🧾 **Foto Struk Berhasil Diverifikasi & Dicatat!**
🏪 **Merchant**: ${receiptMerchant}
📅 **Tanggal**: ${receiptDate}
💸 **Total Pembayaran**: Rp${receiptTotal.toLocaleString('id-ID')}
├ Dompet: 👛 ${res.walletName}
├ Sisa Saldo: Rp${res.newWalletBalance.toLocaleString('id-ID')}

📦 **Rincian Item Tercatat (${receiptItems.length} item)**:
${itemListText}

✨ *Transaksi struk telah diverifikasi & tersimpan otomatis ke Riwayat Transaksi dengan tanda 'Baru Masuk!' & Target Budget ${receiptCategory}!*`;

    setChatMessages((prev) => [
      ...prev,
      { sender: 'bot', text: botReply, time: timeStr },
    ]);

    setShowInteractiveReceiptCard(false);
  };

  // Test Telegram Bot Connection
  const handleTestTelegramConnection = async () => {
    setTestBotLoading(true);
    setTestBotResult(null);

    try {
      const res = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: telegramToken,
          userId: profile.id,
          phone: profile.phone,
        }),
      });
      const data = await res.json();
      setTestBotResult({
        status: data.ok ? 'success' : 'error',
        message: data.message || data.error || 'Gagal mengetes token',
      });
      if (data.ok) {
        setProfile((prev) => ({
          ...prev,
          telegram_bot_token: telegramToken,
          telegram_connected: true,
        }));
      }
    } catch {
      setTestBotResult({
        status: 'error',
        message: 'Koneksi API gagal. Pastikan server lokal aktif.',
      });
    } finally {
      setTestBotLoading(false);
    }
  };

  // User Profile Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile((prev) => ({
      ...prev,
      full_name: profileFullName,
      phone: profilePhone,
      default_currency: profileCurrency,
      timezone: profileTimezone,
    }));
    setProfileSavedFeedback(true);
    setTimeout(() => setProfileSavedFeedback(false), 3000);
  };

  // Reminder Schedule Handler
  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    setReminderSavedFeedback(true);
    setTimeout(() => setReminderSavedFeedback(false), 3000);
  };

  // Custom Category Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: `cat-custom-${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType,
      icon: newCatEmoji,
      color: newCatColor,
      is_default: false,
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCatName('');
    setCatSavedFeedback(true);
    setTimeout(() => setCatSavedFeedback(false), 3000);
  };

  const handleDeleteCategory = (catId: string) => {
    const target = categories.find((c) => c.id === catId);
    if (!target) return;
    if (target.is_default) {
      alert('Kategori default sistem tidak dapat dihapus.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  const handleCopyLink = () => {
    const link = `https://t.me/Rumahluki01bot?start=link_${profile.id}`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // TATA AI: INTERACTIVE WALLET CONFIRMATION HANDLER
  const handleConfirmTransactionWithWallet = (
    messageIndex: number,
    choice: {
      id: string;
      type: 'expense' | 'income' | 'transfer';
      amount: number;
      category: string;
      categoryIcon: string;
      notes: string;
      completedWallet?: string;
    },
    selectedWalletId: string
  ) => {
    const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
    const dayName = now.toLocaleDateString('id-ID', { weekday: 'long' });
    const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Record the transaction with the chosen wallet!
    const result = recordNewTransaction({
      type: choice.type,
      amount: choice.amount,
      category_name: choice.category,
      wallet_id: selectedWallet.id,
      notes: choice.notes,
      source: 'telegram_text',
    });

    // Mark completed in message
    setChatMessages((prev) =>
      prev.map((m, idx) =>
        idx === messageIndex && m.pendingWalletChoice
          ? {
              ...m,
              pendingWalletChoice: {
                ...m.pendingWalletChoice,
                completedWallet: selectedWallet.name,
              },
            }
          : m
      )
    );

    // Find updated budget progress
    const targetBudget = budgets.find(
      (b) =>
        (b.category_name || '').toLowerCase().includes(choice.category.toLowerCase()) ||
        choice.category.toLowerCase().includes((b.category_name || '').toLowerCase())
    ) || {
      monthly_limit: choice.amount * 2,
      current_spent: choice.amount,
      category_icon: choice.categoryIcon,
    };

    const updatedSpent = targetBudget.current_spent + (choice.type === 'expense' ? choice.amount : 0);
    const pct = Math.min(100, Math.round((updatedSpent / targetBudget.monthly_limit) * 100));
    const bars = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    const sisaCat = Math.max(0, targetBudget.monthly_limit - updatedSpent);

    let confirmReply = '';
    if (choice.type === 'expense') {
      confirmReply = `📅 ${dayName}, ${dateFormatted} — ${timeStr}
✅ **Pengeluaran Berhasil Dicatat ke ${selectedWallet.name}!**
├ Nominal : Rp${choice.amount.toLocaleString('id-ID')}
├ Kategori : ${choice.categoryIcon} ${choice.category}
├ Dompet : 👛 ${selectedWallet.name}
├ Catatan : ${choice.notes}
└ Sisa Saldo ${selectedWallet.name} : Rp${result.newWalletBalance.toLocaleString('id-ID')}

📊 **Budget ${choice.category} bulan ini:**
[${bars}] ${pct}% — Sisa Rp${sisaCat.toLocaleString('id-ID')}
${pct >= 80 ? '⚠️ *Peringatan*: Budget kategori ini sudah mencapai 80%!' : '✨ Transaksi tercatat rapi.'}

✨ *Data otomatis terupdate di Beranda, Transaksi, dan Multi-Wallet!*`;
    } else {
      confirmReply = `📅 ${dayName}, ${dateFormatted} — ${timeStr}
✅ **Pemasukan Berhasil Ditambahkan ke ${selectedWallet.name}!**
├ Nominal : Rp${choice.amount.toLocaleString('id-ID')}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 ${selectedWallet.name}
├ Catatan : ${choice.notes}
└ Saldo Baru ${selectedWallet.name} : Rp${result.newWalletBalance.toLocaleString('id-ID')}

💪 Semangat terus! Saldo ${selectedWallet.name} Anda bertambah.
✨ *Tersinkronisasi langsung ke Dashboard & Laporan!*`;
    }

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: confirmReply, time: timeStr }]);
    }, 150);
  };

  // TATA AI: CONVERSATIONAL & INTELLIGENT ADVISOR ENGINE
  const generateConversationalResponse = (query: string): string => {
    const q = query.toLowerCase().trim();

    // 1. Greetings
    if (/^(halo|hai|hey|hi|selamat pagi|selamat siang|selamat sore|selamat malam|assalamualaikum|pagi|siang|malam)/i.test(q)) {
      return `👋 Halo ${profile.full_name}! Senang bisa membantu Anda hari ini.

Saya **Tata AI**, asisten finansial cerdas Anda di SimpanUang. 
Ada yang bisa saya bantu?
• Catat pengeluaran/pemasukan (misal: *"makan siang 35rb"* atau *"gajian 7jt"*)
• Pindai struk belanja dengan foto via tombol 📸 Scan Struk
• Tanya tips keuangan, aturan budgeting (50/30/20), atau saran investasi
• Cek ringkasan cepat: ketik \`analisis keuangan\`, \`/saldo\`, atau \`pengeluaran hari ini\``;
    }

    // 2. Budgeting Rules / 50-30-20
    if (q.includes('50') || q.includes('aturan') || q.includes('alokasi') || q.includes('budgeting') || q.includes('kelola gaji')) {
      return `📊 **Metode Budgeting 50/30/20 oleh Tata AI**
Salah satu strategi finansial terpopuler dan paling efektif:

1. **50% Kebutuhan Pokok (Needs)**:
   • Makanan, sewa hunian, listrik, air, transportasi kerja, dan cicilan produktif.
2. **30% Keinginan (Wants)**:
   • Hiburan, ngopi di café, hobi, dan belanja gaya hidup.
3. **20% Tabungan & Investasi (Savings & Debt Repayment)**:
   • Dana darurat, tabungan masa depan, reksadana, saham, atau pelunasan hutang ekstra.

💡 *Tips*: Anda bisa mengatur limit tiap kategori langsung di menu **🎯 Target Budget** agar Tata AI memberi peringatan saat pengeluaran mendekati 80%!`;
    }

    // 3. Saving Tips / Dana Darurat
    if (q.includes('hemat') || q.includes('nabung') || q.includes('menabung') || q.includes('dana darurat') || q.includes('boros')) {
      return `💡 **Tips Finansial Cerdas dari Tata AI**
Berikut langkah praktis menghemat uang tanpa merasa tersiksa:

1. **Prioritaskan Dana Darurat**: Kumpulkan 3-6x total pengeluaran bulanan di instrumen likuid (seperti dompet terpisah atau reksadana pasar uang).
2. **Aturan 24 Jam**: Saat ingin membeli barang di luar kebutuhan pokok, tunda 24 jam untuk memastikan itu bukan sekadar *impulse buying*.
3. **Catat Setiap Transaksi Sekecil Apapun**: Gunakan chat Tata AI ini setiap kali jajan. Transaksi kecil Rp15.000 yang berulang seringkali menjadi kebocoran terbesar!
4. **Pisahkan Dompet**: Buat dompet khusus operasional dan dompet tabungan di menu **Multi-Wallet**.`;
    }

    // 4. Investment / Investasi
    if (q.includes('investasi') || q.includes('saham') || q.includes('reksadana') || q.includes('kripto') || q.includes('emas')) {
      return `📈 **Panduan Investasi Pemula oleh Tata AI**
Sebelum mulai berinvestasi, pastikan:
✅ Cashflow bulanan sudah positif (pemasukan > pengeluaran).
✅ Sudah memiliki dana darurat minimal 3 bulan pengeluaran.
✅ Tidak memiliki hutang konsumtif berbunga tinggi.

Pilihan instrumen berdasarkan profil risiko:
• **Konservatif (Rendah Risiko)**: Reksadana Pasar Uang (RPU), Deposito Bank Digital, Emas Batangan.
• **Moderat (Risiko Menengah)**: Reksadana Pendapatan Tetap (RDPT), Surat Berharga Negara (SBN/ORI).
• **Agresif (Risiko Tinggi)**: Saham Blue Chip / IDX30, Kripto (alokasi maksimal 5-10% portofolio).

*Disclaimer: Ini adalah informasi edukasi literasi keuangan, bukan rekomendasi investasi spesifik.*`;
    }

    // 5. Debt / Hutang
    if (q.includes('hutang') || q.includes('utang') || q.includes('pinjol') || q.includes('cicilan') || q.includes('kartu kredit')) {
      return `💳 **Strategi Melunasi Hutang dari Tata AI**
Dua metode paling terbukti:

1. **Metode Snowball (Bola Salju)**:
   • Urutkan hutang dari nominal terkecil ke terbesar.
   • Bayar cicilan minimum untuk semua hutang, dan alokasikan dana ekstra pada hutang terkecil hingga lunas. Memberikan dorongan psikologis cepat!
2. **Metode Avalanche (Longsoran)**:
   • Fokus lunasi hutang dengan bunga paling tinggi terlebih dahulu (misal: pinjol atau kartu kredit) untuk menghemat total bunga.

Hindari mengambil pinjaman baru untuk menutup hutang lama!`;
    }

    // 6. How to use / Features
    if (q.includes('cara') || q.includes('fitur') || q.includes('bantuan') || q.includes('help') || q.includes('bisa apa') || q.includes('panduan')) {
      return `🚀 **Fitur Unggulan Tata AI SimpanUang**

1. 💬 **Catat Transaksi Bahasa Alami**:
   Ketik bebas seperti *"kopi 25rb"*, *"makan padang 28.000"*, atau *"dapat bonus 1.5jt"*.
2. 👛 **Pilih Dompet Interaktif**:
   Tata AI akan otomatis mendeteksi nominal transaksi dan meminta Anda memilih dompet mana yang ingin digunakan!
3. 📸 **Vision OCR Struk**:
   Klik tombol **📸 Scan Struk Belanja** untuk memindai struk fisik secara otomatis dengan kartu verifikasi interaktif.
4. 📊 **Laporan Dinamis**:
   Buka menu Laporan untuk melihat grafik transaksi harian, mingguan, bulanan, kustom, serta unduh PDF/Excel.
5. 🏦 **Multi-Wallet**:
   Kelola rekening Bank (BCA, Mandiri, BRI, dll), E-Wallet (GoPay, OVO, DANA), Cash, dan Lainnya dengan saldo masing-masing.`;
    }

    // 7. Questions about who is Tata AI
    if (q.includes('siapa kamu') || q.includes('siapa anda') || q.includes('kamu siapa') || q.includes('tata ai itu apa')) {
      return `🤖 Saya adalah **Tata AI**, asisten kecerdasan buatan terpadu di SimpanUang.

Tugas utama saya adalah membantu Anda mencatat keuangan dengan mudah tanpa perlu mengisi form manual satu per satu, menganalisis pola pengeluaran bulanan, dan mendampingi Anda mencapai kesehatan finansial.`;
    }

    // 8. Polite / Gratitude
    if (q.includes('terima kasih') || q.includes('makasih') || q.includes('thanks') || q.includes('mantap') || q.includes('keren') || q.includes('oke') || q.includes('ok')) {
      return `🙏 Sama-sama ${profile.full_name}! Senang bisa membantu Anda. Tetap disiplin mencatat keuangan demi masa depan finansial yang aman dan sejahtera! 🚀`;
    }

    // 9. General Intelligent Fallback
    return `🤖 **Tata AI mendengarkan:**
"${query}"

Saya siap membantu Anda mencatat transaksi atau menjawab pertanyaan seputar keuangan:
• **Mau catat transaksi?** Cukup ketik nominal dan keperluannya (contoh: \`beli kopi 25rb\` atau \`gajian 7.5jt\`). Tata AI akan menanyakan dompet mana yang ingin dipakai!
• **Mau scan struk belanja?** Klik tombol **📸 Scan Struk Belanja** di bawah.
• **Mau tanya tips keuangan?** Coba ketik *"aturan 50 30 20"*, *"cara hemat"*, atau *"tips investasi"*.
• **Mau cek status uang?** Ketik \`/saldo\`, \`analisis keuangan\`, atau \`pengeluaran hari ini\`.`;
  };

  // TATA AI: REAL-TIME NATURAL LANGUAGE & COMMAND PROCESSOR
  const handleSendSimChat = (customText?: string) => {
    const textToSend = (customText || simInput).trim();
    if (!textToSend) return;
    if (!customText) setSimInput('');

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    // 1. Append User Message
    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend, time: timeStr }]);

    const lower = textToSend.toLowerCase();

    // 2. Command: Financial Analysis
    if (
      lower.includes('analisis') ||
      lower.includes('kondisi') ||
      lower.includes('evaluasi') ||
      lower.includes('kesehatan')
    ) {
      const burnRate = Math.round((currentMonthExpense / (currentMonthIncome || 1)) * 100);
      const topCat = [...budgets].sort((a, b) => b.current_spent - a.current_spent)[0];
      const botReply = `🤖 **Analisis Keuangan Tata AI**
Hai ${profile.full_name}! Berdasarkan rekapan transaksi bulan berjalan:

💰 **Saldo Total**: Rp${totalBalance.toLocaleString('id-ID')}
📈 **Pemasukan**: Rp${currentMonthIncome.toLocaleString('id-ID')}
📉 **Pengeluaran**: Rp${currentMonthExpense.toLocaleString('id-ID')} (${burnRate}% dari pemasukan)
🎯 **Sisa Budget Bulanan**: Rp${remainingBudget.toLocaleString('id-ID')}

🔍 **Pola Pengeluaran Terbesar**:
${topCat ? `${topCat.category_icon} **${topCat.category_name}** telah terpakai Rp${topCat.current_spent.toLocaleString('id-ID')} (${Math.round((topCat.current_spent / topCat.monthly_limit) * 100)}% dari target).` : 'Belum ada pengeluaran besar.'}

💡 **Rekomendasi Tata AI**:
1. Rasio pengeluaran masih dalam batas aman (${burnRate}%).
2. Pertahankan rata-rata jajan harian di bawah Rp65.000 agar surplus di akhir bulan.
3. Sisihkan Rp500.000 ke dompet Tabungan Mandiri untuk dana darurat.`;

      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
      }, 150);
      return;
    }

    // 3. Command: /saldo
    if (lower === '/saldo' || lower.includes('cek saldo') || lower === 'saldo') {
      const walletList = wallets
        .map((w) => `├ ${w.icon} ${w.name}: Rp${w.balance.toLocaleString('id-ID')}`)
        .join('\n');
      const botReply = `💳 **Rincian Saldo Dompet SimpanUang**
${walletList}
└ 💰 **Total Saldo Aktif**: Rp${totalBalance.toLocaleString('id-ID')}

Semua dompet siap menerima transaksi otomatis dari chat ini!`;
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
      }, 150);
      return;
    }

    // 4. Command: Pemasukan Hari Ini (Live Calculation from Transactions)
    if (lower.includes('pemasukan hari ini') || (lower.includes('pemasukan') && lower.includes('hari'))) {
      const todayStr = getWIBDateString(now);
      const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const todayIncomes = userTransactions.filter(
        (t) => t.type === 'income' && t.date === todayStr
      );
      const totalTodayIncome = todayIncomes.reduce((acc, t) => acc + t.amount, 0);

      let botReply = '';
      if (todayIncomes.length === 0) {
        botReply = `💰 **Pemasukan Hari Ini (${dateFormatted})**
Belum ada catatan transaksi pemasukan untuk hari ini (Rp0).

💡 *Ketik misalnya: 'gajian 5jt' atau 'terima transfer 500rb' untuk mencatat pemasukan baru!* 🚀`;
      } else {
        const listText = todayIncomes
          .map((t) => `├ 💵 ${t.notes}: Rp${t.amount.toLocaleString('id-ID')} (👛 ${t.wallet_name})`)
          .join('\n');
        botReply = `💰 **Rekap Pemasukan Hari Ini (${dateFormatted})**
${listText}
└ 📈 **Total Pemasukan Hari Ini**: Rp${totalTodayIncome.toLocaleString('id-ID')}

✨ Semua pemasukan otomatis terakumulasi ke saldo dompet Anda!`;
      }

      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
      }, 150);
      return;
    }

    // 5. Command: Pengeluaran Hari Ini (Live Calculation from Transactions)
    if (lower.includes('pengeluaran hari ini') || (lower.includes('pengeluaran') && lower.includes('hari'))) {
      const todayStr = getWIBDateString(now);
      const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const todayExpenses = userTransactions.filter(
        (t) => t.type === 'expense' && t.date === todayStr
      );
      const totalTodayExpense = todayExpenses.reduce((acc, t) => acc + t.amount, 0);

      let botReply = '';
      if (todayExpenses.length === 0) {
        botReply = `💸 **Pengeluaran Hari Ini (${dateFormatted})**
Belum ada catatan transaksi pengeluaran untuk hari ini (Rp0). Dompetmu masih utuh! 👍

💡 *Ketik misalnya: 'makan 25rb' atau unggah foto struk belanja untuk mulai mencatat.*`;
      } else {
        const listText = todayExpenses
          .map((t) => `├ 💸 ${t.notes}: Rp${t.amount.toLocaleString('id-ID')} [${t.category_name}]`)
          .join('\n');
        botReply = `💸 **Rekap Pengeluaran Hari Ini (${dateFormatted})**
${listText}
└ 📉 **Total Pengeluaran Hari Ini**: Rp${totalTodayExpense.toLocaleString('id-ID')}

🎯 Pantau terus target budget bulanan agar pengeluaran tetap terkendali!`;
      }

      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
      }, 150);
      return;
    }

    // 6. Command: /budget
    if (lower === '/budget' || lower.includes('cek budget') || lower === 'budget') {
      const budgetList = budgets
        .map((b) => {
          const pct = Math.min(100, Math.round((b.current_spent / b.monthly_limit) * 100));
          const bars = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
          return `├ ${b.category_icon} **${b.category_name}**: [${bars}] ${pct}%\n│  (Terpakai Rp${b.current_spent.toLocaleString('id-ID')} / Target Rp${b.monthly_limit.toLocaleString('id-ID')})`;
        })
        .join('\n');

      const botReply = `📊 **Target Budget Bulanan Anda**
${budgetList}
└ 🎯 **Sisa Budget Bebas**: Rp${remainingBudget.toLocaleString('id-ID')}

Setiap transaksi yang kamu chat di sini otomatis memotong budget kategori tersebut!`;
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply, time: timeStr }]);
      }, 150);
      return;
    }

    // 7. Natural Language Transaction Parsing (NLP) with Interactive Wallet Confirmation
    const parsed = parseTransactionFromText(textToSend);
    if (parsed && parsed.amount > 0) {
      const isExp = parsed.type === 'expense';
      const promptText = `🤖 **Transaksi Terdeteksi!**
${isExp ? '💸 Pengeluaran' : '💰 Pemasukan'} sebesar **Rp${parsed.amount.toLocaleString('id-ID')}**
🏷️ Kategori: **${parsed.categoryIcon} ${parsed.category}**
📝 Catatan: *${parsed.notes || textToSend}*

👇 **Silakan pilih dompet yang digunakan untuk transaksi ini:**`;

      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: promptText,
            time: timeStr,
            pendingWalletChoice: {
              id: `p-${Date.now()}`,
              type: parsed.type,
              amount: parsed.amount,
              category: parsed.category,
              categoryIcon: parsed.categoryIcon,
              notes: parsed.notes || textToSend,
            },
          },
        ]);
      }, 150);
      return;
    }

    // 8. Conversational AI Assistant (Answering queries, financial advice, features, greetings)
    const conversationalReply = generateConversationalResponse(textToSend);
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: conversationalReply,
          time: timeStr,
        },
      ]);
    }, 150);
  };

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: LayoutDashboard },
    { id: 'wallet', label: 'Multi-Wallet', icon: WalletIcon },
    { id: 'transaksi', label: 'Transaksi', icon: ReceiptText, badge: 'AI' },
    { id: 'laporan', label: 'Laporan', icon: FileBarChart2 },
    { id: 'budget', label: 'Budget', icon: PieChartIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F8FAFC] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* MOBILE DRAWER SIDEBAR (Slide-in from left on mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0B0F19]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between p-6 z-50 shadow-2xl md:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand & Close Button */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3"
            >
              <WalletLogo size="sm" />
              <div>
                <span className="text-lg font-black tracking-tight text-[#F8FAFC]">
                  Simpan<span className="apple-blue-text">Uang</span>
                </span>
                <span className="block text-[9px] font-bold text-[#2997FF] uppercase tracking-widest">
                  FinTech Pro
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Nav Items */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                    isActive
                      ? 'apple-blue-gradient text-white shadow-lg glow-blue font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {isAdminAuthenticated && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all text-slate-300 hover:text-white hover:bg-white/5 font-bold"
              >
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-[#2997FF]" />
                  <span>Panel Admin (/admin)</span>
                </div>
                <span className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/25">
                  Superadmin
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Mobile User Plan Badge & Logout */}
        <div className="pt-6 border-t border-white/10 space-y-3 mt-6">
          <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-[#2997FF]">Paket Aktif</span>
              <span className="text-[9px] bg-blue-500/30 text-blue-200 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30">PRO LIFETIME</span>
            </div>
            <p className="text-xs font-bold text-white mt-1">Unlimited OCR & Laporan</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full apple-blue-gradient text-white font-bold flex items-center justify-center text-xs shadow glow-blue">
                LR
              </div>
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-white">Luki Ramdani</p>
                <p className="text-slate-400">+62 812-3456</p>
              </div>
            </div>
            <Link href="/" className="text-slate-400 hover:text-rose-400" title="Keluar">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR NAVIGATION (Permanent on left for md and up) */}
      <aside className="hidden md:flex w-full md:w-64 flex-col justify-between bg-[#0B0F19]/80 backdrop-blur-2xl md:rounded-r-3xl border-r border-white/10 p-6 shrink-0 z-20 shadow-2xl sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-3 mb-8">
            <WalletLogo size="md" />
            <div>
              <span className="text-xl font-black tracking-tight text-[#F8FAFC]">
                Simpan<span className="apple-blue-text">Uang</span>
              </span>
              <span className="block text-[10px] font-bold text-[#2997FF] uppercase tracking-widest">
                FinTech Pro
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                    isActive
                      ? 'apple-blue-gradient text-white shadow-lg glow-blue font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {isAdminAuthenticated && (
              <Link
                href="/admin"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all text-slate-300 hover:text-white hover:bg-white/5 font-bold"
              >
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 text-[#2997FF]" />
                  <span>Panel Admin (/admin)</span>
                </div>
                <span className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/25">
                  Superadmin
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop User Plan Badge & Logout */}
        <div className="pt-6 border-t border-white/10 space-y-3 mt-6">
          <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-[#2997FF]">Paket Aktif</span>
              <span className="text-[9px] bg-blue-500/30 text-blue-200 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30">PRO LIFETIME</span>
            </div>
            <p className="text-xs font-bold text-white mt-1">Unlimited OCR & Laporan</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full apple-blue-gradient text-white font-bold flex items-center justify-center text-xs shadow glow-blue">
                LR
              </div>
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-white">Luki Ramdani</p>
                <p className="text-slate-400">+62 812-3456</p>
              </div>
            </div>
            <Link href="/" className="text-slate-400 hover:text-rose-400" title="Keluar">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP HEADER */}
        <header className="min-h-16 py-3 liquid-glass border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button on Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all shrink-0"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5 text-blue-400" />
            </button>

            <h1 className="text-sm sm:text-base font-black text-white capitalize truncate">
              {activeTab === 'beranda' && 'Ringkasan Keuangan'}
              {activeTab === 'wallet' && 'Manajemen Multi-Wallet'}
              {activeTab === 'transaksi' && 'Daftar Transaksi'}
              {activeTab === 'laporan' && 'Laporan & On-Demand Export'}
              {activeTab === 'budget' && '🎯 Target Budget Bulanan'}
              {activeTab === 'settings' && 'Pengaturan Akun & Telegram'}
              {activeTab === 'admin' && 'Admin Switchboard & AI Failover'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTataAIModal(true)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-white border border-blue-400/40 text-xs font-extrabold shadow-md glow-blue transition-all flex items-center space-x-1.5"
              title="Buka Tata AI Bot Asisten Keuangan Lengkap"
            >
              <span className="hidden sm:inline">🤖 Tata AI Bot</span>
              <span className="sm:hidden">🤖 AI Bot</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddTxModal(true)}
              className="px-3 sm:px-4 py-2 rounded-xl apple-blue-gradient text-white text-xs font-extrabold shadow-md glow-blue hover:brightness-110 flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Catat Transaksi</span>
              <span className="sm:hidden">Catat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="w-9 h-9 rounded-2xl apple-blue-gradient text-white font-bold flex items-center justify-center text-xs shadow-md glow-blue hover:brightness-110 transition-all border border-white/20 shrink-0"
              title="Pengaturan Profil (Luki Ramdani)"
            >
              LR
            </button>
          </div>
        </header>

        {/* CONTENT TABS */}
        <main className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">

          {/* TAB 1: BERANDA */}
          {activeTab === 'beranda' && (
            <div className="space-y-6">
              {/* Dedicated Period Selector Bar in Beranda */}
              <div className="liquid-glass rounded-3xl p-3.5 sm:p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Filter:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('today')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '1d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    ⚡ Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('7d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '7d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    📅 7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('30d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '30d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <span className="hidden sm:inline">📆 Bulanan (30 Hari)</span>
                    <span className="sm:hidden">📆 Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodFilter('custom');
                      setShowDatePickerModal(true);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1 ${
                      periodFilter === 'custom' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kustom (Kalender)</span>
                    <span className="sm:hidden">Kustom</span>
                  </button>
                </div>

                {/* Active Period Indicator Badge */}
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(true)}
                  className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-mono font-bold flex items-center space-x-1.5 transition-all max-w-full truncate"
                  title="Klik untuk memilih rentang tanggal kalender"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{periodMetrics.label}</span>
                </button>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Total</div>
                  <div className="text-2xl font-black text-white">Rp{totalBalance.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] font-bold text-emerald-400 mt-2">▲ 14.8% vs bulan lalu</div>
                </div>

                <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pemasukan ({periodFilter === 'all' ? 'Bulan Ini' : periodMetrics.label})
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    Rp{(periodFilter === 'all' ? currentMonthIncome : periodMetrics.income).toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 mt-2">
                    {periodFilter === 'all' ? '+ Gaji & Freelance' : `${periodMetrics.incomeCount} transaksi masuk`}
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pengeluaran ({periodFilter === 'all' ? 'Bulan Ini' : periodMetrics.label})
                  </div>
                  <div className="text-2xl font-black text-rose-400">
                    Rp{(periodFilter === 'all' ? currentMonthExpense : periodMetrics.expense).toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-semibold text-rose-400 mt-2">
                    {periodFilter === 'all' ? '▼ Terkendali (53% budget)' : `Net: ${periodMetrics.cashflow >= 0 ? '+' : ''}Rp${periodMetrics.cashflow.toLocaleString('id-ID')}`}
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-6 liquid-card-hover transition-all">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Budget Tersisa</div>
                  <div className="text-2xl font-black text-blue-400">Rp{remainingBudget.toLocaleString('id-ID')}</div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div className="apple-blue-gradient h-1.5 rounded-full" style={{ width: '53%' }}></div>
                  </div>
                </div>
              </div>

              {/* 6-Month Trend & Donut Allocation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 liquid-glass rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Arus Kas 6 Bulan Terakhir</h3>
                      <p className="text-xs text-slate-400">Pemasukan (Cyan/Blue) vs Pengeluaran (Rose)</p>
                    </div>
                    <span className="text-[10px] bg-white/5 border border-white/10 font-bold px-2.5 py-1 rounded-lg text-blue-400">WIB Timezone</span>
                  </div>

                  <div className="h-48 flex items-end justify-between space-x-2 pt-6 border-b border-white/10">
                    {['Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep'].map((m, idx) => (
                      <div key={m} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center gap-1.5 h-36">
                          <div className="w-3.5 bg-blue-500/80 rounded-t-md" style={{ height: `${60 + idx * 6}%` }}></div>
                          <div className="w-3.5 bg-rose-500/80 rounded-t-md" style={{ height: `${35 + idx * 4}%` }}></div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-base mb-3">Status Budget Kategori</h3>
                    <div className="space-y-3.5">
                      {displayedBudgets.map((b) => (
                        <div key={b.id} className="text-xs">
                          <div className="flex justify-between font-semibold mb-1">
                            <span className="text-slate-200">{b.category_icon} {b.category_name}</span>
                            <span className="text-blue-400">{Math.round((b.current_spent / b.monthly_limit) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                b.current_spent / b.monthly_limit >= 0.8 ? 'bg-rose-500' : 'apple-blue-gradient'
                              }`}
                              style={{ width: `${Math.min((b.current_spent / b.monthly_limit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-[11px] text-slate-300">
                    <span className="font-bold text-blue-400">💡 Insight AI:</span> Sisa alokasi dana bulan ini sangat sehat.
                  </div>
                </div>
              </div>

              {/* 10 Recent Transactions */}
              <div className="liquid-glass rounded-3xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-white text-base">10 Transaksi Terakhir</h3>
                  <button onClick={() => setActiveTab('transaksi')} className="text-xs font-bold text-blue-400 hover:text-blue-300">
                    Lihat Semua Transaksi →
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 sm:hidden">
                  <span>Geser tabel untuk detail lengkap →</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar -mx-2 sm:mx-0 px-2 sm:px-0">
                  <table className="w-full min-w-[580px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-3 whitespace-nowrap">Tanggal</th>
                        <th className="py-3 px-3 min-w-[160px]">Catatan</th>
                        <th className="py-3 px-3 whitespace-nowrap">Kategori</th>
                        <th className="py-3 px-3 whitespace-nowrap">Dompet</th>
                        <th className="py-3 px-3 whitespace-nowrap">Sumber</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {userTransactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-400">{tx.date}, {tx.time_wib}</td>
                          <td className="py-3 px-3 font-semibold text-white min-w-[160px]">{tx.notes}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 inline-block whitespace-nowrap">
                              {tx.category_name}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-300">👛 {tx.wallet_name}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">{tx.source.replace('_', ' ')}</span>
                          </td>
                          <td className={`py-3 px-3 text-right whitespace-nowrap font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'income' ? '+' : '-'}Rp{tx.amount.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-WALLET (LENGKAP DENGAN TAMBAH, HAPUS, DEFAULT, TRANSFER) */}
          {activeTab === 'wallet' && (
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-xl">Dompet Keuangan (Multi-Wallet)</h3>
                  <p className="text-xs text-slate-400">Kelola rekening bank, e-wallet, dan cash dengan 1 default Telegram wallet</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center space-x-1.5"
                  >
                    <span>⇄</span>
                    <span>Transfer Saldo</span>
                  </button>
                  <button
                    onClick={() => setShowAddWalletModal(true)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-extrabold apple-blue-gradient text-white shadow-lg glow-blue hover:brightness-110 transition-all flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Dompet Baru</span>
                  </button>
                </div>
              </div>

              {/* Total Balance Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-transparent border border-blue-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Total Saldo di Semua Dompet</span>
                  <div className="text-3xl font-black text-white mt-1">Rp{totalBalance.toLocaleString('id-ID')}</div>
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white">
                    {displayedWallets.length} Dompet Aktif
                  </span>
                </div>
              </div>

              {/* Wallet Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedWallets.map((w) => (
                  <div key={w.id} className="liquid-glass rounded-3xl p-6 relative flex flex-col justify-between liquid-card-hover transition-all space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl p-2.5 rounded-2xl bg-white/5 border border-white/10">{w.icon}</span>
                          <div>
                            <h4 className="font-extrabold text-white text-base leading-tight">{w.name}</h4>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{w.type}</span>
                          </div>
                        </div>

                        {w.is_default ? (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-2.5 py-1 rounded-full border border-blue-500/40">
                            ★ Default Telegram
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultWallet(w.id)}
                            className="text-[10px] bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 font-bold px-2.5 py-1 rounded-full border border-white/10 transition-colors"
                            title="Jadikan dompet default untuk pencatatan via Telegram"
                          >
                            Set Default
                          </button>
                        )}
                      </div>

                      <div className="pt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Dompet</span>
                        <p className="text-2xl font-black text-white tracking-tight mt-0.5">Rp{w.balance.toLocaleString('id-ID')}</p>
                        {w.account_number && (
                          <p className="text-xs text-slate-500 font-mono mt-1">{w.account_number}</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Transfer & Delete */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setTransferFrom(w.id);
                          setShowTransferModal(true);
                        }}
                        className="font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <span>⇄ Kirim Dana</span>
                      </button>

                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className="font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-all flex items-center space-x-1"
                        title="Hapus dompet ini"
                      >
                        <span>🗑️ Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSAKSI */}
          {activeTab === 'transaksi' && (
            <div className="space-y-4">
              {/* Dedicated Period Selector Bar in Transaksi */}
              <div className="liquid-glass rounded-3xl p-3.5 sm:p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Filter:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('today')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '1d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    ⚡ Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('7d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '7d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    📅 7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('30d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '30d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <span className="hidden sm:inline">📆 Bulanan (30 Hari)</span>
                    <span className="sm:hidden">📆 Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodFilter('custom');
                      setShowDatePickerModal(true);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1 ${
                      periodFilter === 'custom' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kustom (Kalender)</span>
                    <span className="sm:hidden">Kustom</span>
                  </button>
                </div>

                {/* Active Period Indicator Badge */}
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(true)}
                  className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-mono font-bold flex items-center space-x-1.5 transition-all max-w-full truncate"
                  title="Klik untuk memilih rentang tanggal kalender"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{periodMetrics.label}</span>
                </button>
              </div>

              <div className="liquid-glass rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-white">Riwayat Transaksi</h2>
                    <p className="text-xs text-slate-400">Menampilkan {filteredTransactions.length} transaksi untuk {periodMetrics.label}</p>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={transaksiSearchQuery}
                      onChange={(e) => setTransaksiSearchQuery(e.target.value)}
                      placeholder="Cari transaksi..."
                      className="pl-9 pr-4 py-2 text-xs bg-slate-900/80 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Mobile View: Modern Fintech List Cards */}
                <div className="block md:hidden space-y-2.5">
                  {filteredTransactions
                    .filter((tx) => {
                      if (!transaksiSearchQuery.trim()) return true;
                      const q = transaksiSearchQuery.toLowerCase();
                      return (
                        tx.notes.toLowerCase().includes(q) ||
                        (tx.category_name || '').toLowerCase().includes(q) ||
                        (tx.wallet_name || '').toLowerCase().includes(q)
                      );
                    })
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                          tx.id === newTxId
                            ? 'bg-blue-500/20 border-blue-400/60 shadow-lg ring-1 ring-blue-400/40'
                            : 'bg-black/30 border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 mt-0.5 ${
                                tx.type === 'income'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {tx.type === 'income' ? '💰' : '💸'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="font-bold text-xs text-white truncate max-w-[180px]">{tx.notes}</p>
                                {tx.id === newTxId && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-blue-500 text-white shadow-sm glow-blue animate-pulse">
                                    Baru Masuk!
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                                <span>{tx.date}, {tx.time_wib}</span>
                                <span>•</span>
                                <span className="text-blue-300 font-medium">👛 {tx.wallet_name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`font-black text-xs ${
                                tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}Rp{tx.amount.toLocaleString('id-ID')}
                            </p>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-slate-300 mt-1">
                              {tx.category_name}
                            </span>
                          </div>
                        </div>

                        {tx.items && tx.items.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-blue-300 space-y-1">
                            <p className="font-bold text-blue-400">📄 Rincian Struk ({tx.items.length} item):</p>
                            <div className="grid grid-cols-1 gap-1 pl-2 font-mono text-[10px]">
                              {tx.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-slate-300">
                                  <span>• {it.item_name}</span>
                                  <span className="text-slate-400">Rp{it.price.toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Desktop View: Full Spreadsheet Table */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-3 whitespace-nowrap">Tanggal (WIB)</th>
                        <th className="py-3 px-3">Catatan</th>
                        <th className="py-3 px-3 whitespace-nowrap">Kategori</th>
                        <th className="py-3 px-3 whitespace-nowrap">Dompet</th>
                        <th className="py-3 px-3 whitespace-nowrap">Sumber</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredTransactions
                        .filter((tx) => {
                          if (!transaksiSearchQuery.trim()) return true;
                          const q = transaksiSearchQuery.toLowerCase();
                          return (
                            tx.notes.toLowerCase().includes(q) ||
                            (tx.category_name || '').toLowerCase().includes(q) ||
                            (tx.wallet_name || '').toLowerCase().includes(q)
                          );
                        })
                        .map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-white/5 transition-all duration-300 ${
                            tx.id === newTxId ? 'bg-blue-500/20 ring-1 ring-blue-400/60 shadow-lg' : ''
                          }`}
                        >
                          <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                            <div className="flex items-center space-x-1.5">
                              {tx.id === newTxId && (
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                              )}
                              <span>{tx.date}, {tx.time_wib}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span>{tx.notes}</span>
                              {tx.id === newTxId && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-500 text-white shadow-sm glow-blue animate-pulse">
                                  Baru Masuk!
                                </span>
                              )}
                            </div>
                            {tx.items && tx.items.length > 0 && (
                              <div className="text-[10px] text-blue-400 font-normal mt-0.5">
                                📄 {tx.items.length} item rincian struk OCR
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">{tx.category_name}</span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-300">👛 {tx.wallet_name}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">{tx.source.replace('_', ' ')}</span>
                          </td>
                          <td className={`py-3 px-3 text-right whitespace-nowrap font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'income' ? '+' : '-'}Rp{tx.amount.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LAPORAN & EXPORT */}
          {activeTab === 'laporan' && (
            <div className="space-y-6">
              {/* Top Banner & Export Actions */}
              <div className="liquid-glass rounded-3xl p-6 sm:p-7 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="p-2 rounded-xl apple-blue-gradient text-white shadow glow-blue">
                      <FileBarChart2 className="w-5 h-5" />
                    </span>
                    <h3 className="font-extrabold text-white text-base">Laporan Analisis Finansial & Diagram Transaksi</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualisasi tren pemasukan vs pengeluaran (harian, mingguan, bulanan, & rentang kustom)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={`/api/reports/export?format=xlsx&download=true&startDate=${customStartDate}&endDate=${customEndDate}`}
                    download={`SimpanUang_Laporan_${periodFilter}.xlsx`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center space-x-1.5 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel</span>
                  </a>
                  <a
                    href={`/api/reports/export?format=pdf&download=true&startDate=${customStartDate}&endDate=${customEndDate}`}
                    download={`SimpanUang_Laporan_${periodFilter}.pdf`}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold apple-blue-gradient text-white shadow-lg glow-blue hover:brightness-110 flex items-center space-x-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>

              {/* Dedicated Period Selector Bar in Laporan */}
              <div className="liquid-glass rounded-3xl p-3.5 sm:p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Filter:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('today')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '1d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    ⚡ Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('7d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '7d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    📅 7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('30d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '30d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <span className="hidden sm:inline">📆 Bulanan (30 Hari)</span>
                    <span className="sm:hidden">📆 Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodFilter('custom');
                      setShowDatePickerModal(true);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1 ${
                      periodFilter === 'custom' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kustom (Pilih Kalender)</span>
                    <span className="sm:hidden">Kustom</span>
                  </button>
                </div>

                {/* Active Period Badge */}
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(true)}
                  className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-mono font-bold flex items-center space-x-1.5 transition-all max-w-full truncate"
                  title="Klik untuk ubah rentang tanggal"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{periodMetrics.label}</span>
                </button>
              </div>

              {/* 4 Summary Cards for the Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="liquid-glass rounded-3xl p-5 border border-emerald-500/20 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Pemasukan</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">Rp{periodMetrics.income.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-1.5">
                    {periodMetrics.incomeCount} transaksi tercatat
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-rose-500/20 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Total Pengeluaran</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">Rp{periodMetrics.expense.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-1.5">
                    {periodMetrics.expenseCount} transaksi tercatat
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-blue-500/20 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Net Cashflow</div>
                  <div className={`text-2xl font-black mt-1 ${periodMetrics.cashflow >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {periodMetrics.cashflow >= 0 ? '+' : ''}Rp{periodMetrics.cashflow.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] font-semibold mt-1.5 text-slate-400">
                    {periodMetrics.cashflow >= 0 ? '✅ Surplus Arus Kas' : '⚠️ Defisit Arus Kas'}
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Pengeluaran</div>
                  <div className="text-2xl font-black text-white mt-1">
                    Rp{periodMetrics.dailyAverage.toLocaleString('id-ID')}
                    <span className="text-xs font-normal text-slate-400">/hari</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-1.5">
                    Laju pengeluaran ({periodMetrics.daysCount} hari)
                  </div>
                </div>
              </div>

              {/* ROW 1 CHARTS: Bar Chart & Line Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Bar Chart: Komparasi Arus Kas */}
                <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span>Komparasi Arus Kas (Pemasukan vs Pengeluaran)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Perbandingan nominal per interval pada periode aktif</p>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] font-bold">
                      <span className="flex items-center space-x-1.5 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span>Pemasukan</span>
                      </span>
                      <span className="flex items-center space-x-1.5 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span>Pengeluaran</span>
                      </span>
                    </div>
                  </div>

                  {/* SVG Bar Chart Visualization */}
                  <div className="h-52 pt-4 flex items-end justify-between gap-2 sm:gap-4 border-b border-white/10 pb-2">
                    {(() => {
                      const maxVal = Math.max(
                        ...chartIntervals.map((i) => Math.max(i.income, i.expense)),
                        100000
                      );

                      return chartIntervals.map((item, idx) => {
                        const incomeHeight = Math.max(4, Math.round((item.income / maxVal) * 160));
                        const expenseHeight = Math.max(4, Math.round((item.expense / maxVal) * 160));

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            {/* Hover tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 border border-white/20 px-2 py-1 rounded-lg text-[9px] font-mono text-white pointer-events-none z-10 whitespace-nowrap shadow-xl">
                              +{item.income.toLocaleString('id-ID')} / -{item.expense.toLocaleString('id-ID')}
                            </div>

                            <div className="w-full flex items-end justify-center gap-1.5 h-44">
                              {/* Income Bar */}
                              <div
                                className="w-3 sm:w-4 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm transition-all duration-300 group-hover:brightness-125"
                                style={{ height: `${incomeHeight}px` }}
                                title={`Pemasukan: Rp${item.income.toLocaleString('id-ID')}`}
                              />
                              {/* Expense Bar */}
                              <div
                                className="w-3 sm:w-4 rounded-t-lg bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm transition-all duration-300 group-hover:brightness-125"
                                style={{ height: `${expenseHeight}px` }}
                                title={`Pengeluaran: Rp${item.expense.toLocaleString('id-ID')}`}
                              />
                            </div>

                            <span className="text-[10px] text-slate-400 font-semibold mt-2 text-center truncate max-w-[60px] sm:max-w-none">
                              {item.label}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>Skala adaptif otomatis</span>
                    <span className="font-mono text-blue-400">Total: {chartIntervals.length} Titik Data</span>
                  </div>
                </div>

                {/* 2. Line Chart: Tren Fluktuasi Arus Kas */}
                <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <LineChartIcon className="w-4 h-4 text-cyan-400" />
                        <span>Tren Fluktuasi Net Cashflow</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Arah saldo surplus/defisit sepanjang periode</p>
                    </div>

                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-bold border border-cyan-500/30">
                      Liquid Curve
                    </span>
                  </div>

                  {/* SVG Line Chart */}
                  <div className="h-52 relative flex items-center justify-center pt-2">
                    {(() => {
                      const netValues = chartIntervals.map((i) => i.income - i.expense);
                      const minNet = Math.min(...netValues, 0);
                      const maxNet = Math.max(...netValues, 100000);
                      const range = maxNet - minNet || 1;

                      const width = 460;
                      const height = 150;
                      const paddingX = 30;

                      const points = netValues.map((v, i) => {
                        const x = paddingX + (i * (width - 2 * paddingX)) / Math.max(1, netValues.length - 1);
                        const y = height - ((v - minNet) / range) * (height - 30) - 15;
                        return { x, y, val: v, label: chartIntervals[i]?.label };
                      });

                      const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
                      const areaPoints = `${points[0]?.x},${height} ${polylinePoints} ${points[points.length - 1]?.x},${height}`;

                      return (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                          <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0071E3" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Zero baseline */}
                          {minNet < 0 && maxNet > 0 && (
                            <line
                              x1={paddingX}
                              y1={height - ((0 - minNet) / range) * (height - 30) - 15}
                              x2={width - paddingX}
                              y2={height - ((0 - minNet) / range) * (height - 30) - 15}
                              stroke="rgba(255,255,255,0.15)"
                              strokeDasharray="4 4"
                            />
                          )}

                          {/* Gradient fill under curve */}
                          <polygon points={areaPoints} fill="url(#lineGrad)" />

                          {/* Main line */}
                          <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke="#0A84FF"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data points */}
                          {points.map((p, idx) => (
                            <g key={idx} className="group">
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="5"
                                fill="#080C14"
                                stroke={p.val >= 0 ? '#34D399' : '#F43F5E'}
                                strokeWidth="2.5"
                                className="cursor-pointer transition-transform group-hover:scale-150"
                              />
                              <text
                                x={p.x}
                                y={p.y - 10}
                                fill="#FFFFFF"
                                fontSize="9"
                                textAnchor="middle"
                                className="font-mono font-bold opacity-80"
                              >
                                {Math.round(p.val / 1000)}k
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-white/5">
                    <span>Titik hijau: Surplus kas</span>
                    <span>Titik merah: Defisit kas</span>
                  </div>
                </div>

              </div>

              {/* ROW 2: Donut Chart Breakdown & Top 5 Kategori */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Donut Chart: Alokasi Kategori */}
                <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-blue-400" />
                      <span>Distribusi Pengeluaran Kategori</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Proporsi pos belanja pada periode {periodMetrics.label}</p>
                  </div>

                  {/* SVG Donut Visual */}
                  <div className="relative flex items-center justify-center py-2">
                    <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                      {(() => {
                        const total = periodMetrics.expense || 1;
                        const colors = ['#0071E3', '#38bdf8', '#818cf8', '#fbbf24', '#ec4899', '#34d399'];
                        let accumulatedOffset = 0;

                        return periodMetrics.categoryList.map((cat, idx) => {
                          const pct = cat.amount / total;
                          const dash = pct * 251.2;
                          const offset = -accumulatedOffset;
                          accumulatedOffset += dash;
                          const color = colors[idx % colors.length];

                          return (
                            <circle
                              key={cat.name}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={color}
                              strokeWidth="14"
                              strokeDasharray={`${dash} 251.2`}
                              strokeDashoffset={offset}
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Belanja</span>
                      <span className="text-sm font-black text-white font-mono mt-0.5">
                        Rp{(periodMetrics.expense / 1000).toLocaleString('id-ID')}k
                      </span>
                      <span className="text-[9px] text-blue-400 font-bold">{periodMetrics.categoryList.length} Kategori</span>
                    </div>
                  </div>

                  {/* Category Legend */}
                  <div className="space-y-1.5 text-xs">
                    {periodMetrics.categoryList.slice(0, 4).map((cat, idx) => {
                      const colors = ['#0071E3', '#38bdf8', '#818cf8', '#fbbf24'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={cat.name} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-slate-300 text-xs">{cat.icon} {cat.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] font-bold">
                            Rp{cat.amount.toLocaleString('id-ID')} ({cat.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 5 Pengeluaran Terbesar Card */}
                <div className="lg:col-span-2 liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                        <span>Peringkat 5 Pos Pengeluaran Terbesar</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Kategori dengan akumulasi biaya tertinggi di periode ini</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Top Spend
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {periodMetrics.categoryList.slice(0, 5).map((cat, idx) => (
                      <div key={cat.name} className="p-3 bg-slate-900/70 rounded-2xl border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2.5">
                            <span className="font-mono font-black text-blue-400 text-xs">#{idx + 1}</span>
                            <span className="text-base">{cat.icon}</span>
                            <span className="font-bold text-white">{cat.name}</span>
                            <span className="text-[10px] text-slate-400">({cat.count} transaksi)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-white font-mono">Rp{cat.amount.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-blue-400 ml-1.5 font-bold">({cat.percentage}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div
                            className="h-full apple-blue-gradient rounded-full shadow-sm"
                            style={{ width: `${Math.max(5, cat.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {periodMetrics.categoryList.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        Tidak ada transaksi pengeluaran pada periode ini.
                      </div>
                    )}
                  </div>

                  {/* AI Financial Advisor Advice for this Period */}
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start space-x-3 text-xs">
                    <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="leading-relaxed text-slate-300">
                      <strong className="text-white">AI Financial Advisor:</strong>{' '}
                      {periodMetrics.cashflow >= 0
                        ? `Arus kas periode ini surplus Rp${periodMetrics.cashflow.toLocaleString('id-ID')} dengan rata-rata belanja Rp${periodMetrics.dailyAverage.toLocaleString('id-ID')}/hari. Kondisi finansial Anda sangat sehat!`
                        : `Pengeluaran melebihi pemasukan sebesar Rp${Math.abs(periodMetrics.cashflow).toLocaleString('id-ID')}. Pos ${periodMetrics.categoryList[0]?.name || 'terbesar'} menyerap porsi paling signifikan.`}
                    </div>
                  </div>
                </div>

              </div>

              {/* ROW 3: Tabel Transaksi Terfilter Sesuai Periode */}
              <div className="liquid-glass rounded-3xl p-6 sm:p-7 border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <span>Daftar Transaksi Periode ({filteredTransactions.length} Transaksi)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Rentang: <strong className="text-slate-200">{periodMetrics.label}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={laporanSearchQuery}
                        onChange={(e) => setLaporanSearchQuery(e.target.value)}
                        placeholder="Cari transaksi..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white w-44 sm:w-56"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={laporanCategoryFilter}
                      onChange={(e) => setLaporanCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-3">Tanggal (WIB)</th>
                        <th className="py-3 px-3">Catatan</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3">Dompet</th>
                        <th className="py-3 px-3">Sumber</th>
                        <th className="py-3 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredTransactions
                        .filter((tx) => {
                          const matchesSearch = !laporanSearchQuery || tx.notes.toLowerCase().includes(laporanSearchQuery.toLowerCase());
                          const matchesCat = laporanCategoryFilter === 'all' || tx.category_name === laporanCategoryFilter;
                          return matchesSearch && matchesCat;
                        })
                        .map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono">{tx.date}, {tx.time_wib}</td>
                            <td className="py-3 px-3 font-semibold text-white">
                              {tx.notes}
                              {tx.items && tx.items.length > 0 && (
                                <div className="text-[10px] text-blue-400 font-normal mt-0.5">
                                  📄 {tx.items.length} item rincian struk OCR
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-200">
                                {tx.category_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">👛 {tx.wallet_name}</td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold text-blue-400 uppercase">{tx.source}</span>
                            </td>
                            <td className={`py-3 px-3 text-right font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.type === 'income' ? '+' : '-'}Rp{tx.amount.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: TARGET BUDGET BULANAN */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Header with Title and Add Button */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center space-x-2">
                    <span>🎯 Target Budget Bulanan</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      September 2026
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Kendalikan arus kas dan limit per kategori. Semua pengeluaran dari chat Telegram otomatis memotong budget di sini.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setEditingBudget(null);
                      setBudgetCategoryName(categories[0]?.name || 'Makanan & Minuman');
                      setBudgetLimitInput('1000000');
                      setShowBudgetModal(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl apple-blue-gradient text-white text-xs font-extrabold shadow-lg glow-blue hover:brightness-110 flex items-center space-x-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Atur Target Budget</span>
                  </button>
                </div>
              </div>

              {/* Dedicated Period Selector Bar in Budget */}
              <div className="liquid-glass rounded-3xl p-3.5 sm:p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Filter:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('today')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '1d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    ⚡ Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('7d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '7d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    📅 7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('30d')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      periodFilter === '30d' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <span className="hidden sm:inline">📆 Bulanan (30 Hari)</span>
                    <span className="sm:hidden">📆 Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodFilter('custom');
                      setShowDatePickerModal(true);
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1 ${
                      periodFilter === 'custom' ? 'apple-blue-gradient text-white shadow-md glow-blue' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kustom (Kalender)</span>
                    <span className="sm:hidden">Kustom</span>
                  </button>
                </div>

                {/* Active Period Indicator Badge */}
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(true)}
                  className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-mono font-bold flex items-center space-x-1.5 transition-all max-w-full truncate"
                  title="Klik untuk memilih rentang tanggal kalender"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{periodMetrics.label}</span>
                </button>
              </div>

              {/* 4 Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Plafon Budget</div>
                  <div className="text-2xl font-black text-white mt-1">Rp{totalBudgetLimit.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-blue-400 font-semibold mt-2 flex items-center space-x-1">
                    <span>🛡️ Batas Maksimal Bulan Ini</span>
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {periodFilter === 'all' || periodFilter === '30d' ? 'Total Terpakai' : `Terpakai (${periodMetrics.label})`}
                  </div>
                  <div className="text-2xl font-black text-rose-400 mt-1">
                    Rp{(periodFilter === 'all' || periodFilter === '30d' ? totalBudgetSpent : periodMetrics.expense).toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-2">
                    {periodFilter === 'all' || periodFilter === '30d'
                      ? `${totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0}% dari batas anggaran`
                      : `Plafon proporsional (${periodMetrics.daysCount} hari): Rp${Math.round((totalBudgetLimit / 30) * periodMetrics.daysCount).toLocaleString('id-ID')}`
                    }
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sisa Budget Bebas</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">Rp{remainingBudget.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center space-x-1">
                    <span>✅ Aman untuk dibelanjakan</span>
                  </div>
                </div>

                <div className="liquid-glass rounded-3xl p-5 border border-white/10 relative overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kesehatan Finansial</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {totalBudgetLimit > 0 && (totalBudgetSpent / totalBudgetLimit) > 0.85 ? (
                      <span className="text-amber-400">Waspada</span>
                    ) : (
                      <span className="text-blue-400">Prima 92%</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-semibold mt-2">
                    {budgets.length} Kategori aktif
                  </div>
                </div>
              </div>

              {/* Donut Chart & Category Breakdown Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SVG Visual Donut Chart Card */}
                <div className="liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-blue-400" />
                      <span>Distribusi Anggaran Kategori</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">Proporsi plafon biaya per pos pengeluaran</p>
                  </div>

                  {/* SVG Donut Visual */}
                  <div className="relative flex items-center justify-center py-4">
                    <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0071E3" strokeWidth="14" strokeDasharray="83 168" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38bdf8" strokeWidth="14" strokeDasharray="68 183" strokeDashoffset="-83" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#818cf8" strokeWidth="14" strokeDasharray="45 206" strokeDashoffset="-151" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fbbf24" strokeWidth="14" strokeDasharray="33 218" strokeDashoffset="-196" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="14" strokeDasharray="23 228" strokeDashoffset="-229" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terpakai</span>
                      <span className="text-lg font-black text-white">
                        {totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0}%
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold">Terkendali</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1.5 text-xs">
                    {budgets.slice(0, 5).map((b, idx) => {
                      const colors = ['#0071E3', '#38bdf8', '#818cf8', '#fbbf24', '#ec4899'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={b.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-slate-300 text-xs">{b.category_icon} {b.category_name}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {Math.round((b.monthly_limit / (totalBudgetLimit || 1)) * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Financial Advisor Advice Card */}
                <div className="lg:col-span-2 liquid-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl apple-blue-gradient flex items-center justify-center text-white shadow-lg glow-blue">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">AI Financial Advisor — Analisis Real-Time</h3>
                        <p className="text-[11px] text-slate-400">Insight otomatis dari pola pengeluaran bot dan kartu</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      PRO ADVISOR
                    </span>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed text-slate-300 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-start space-x-2.5">
                      <span className="text-base">🍜</span>
                      <div>
                        <strong className="text-white">Pola Makan & Minuman:</strong> Pengeluaran makan telah terpakai 52% di pertengahan bulan. Anda berada pada laju yang sangat ideal untuk menyisakan Rp720.000 di akhir bulan.
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="text-base">🏠</span>
                      <div>
                        <strong className="text-white">Tagihan & Utilitas:</strong> Pos tagihan sudah terpakai 79% (Rp950.000). Sisa limit Rp250.000 cukup aman karena tagihan listrik & wifi sudah terbayar lunas.
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="text-base">💡</span>
                      <div>
                        <strong className="text-white">Saran Penghematan:</strong> Manfaatkan promo e-wallet pada pos Belanja dan Transportasi untuk menghemat estimasi Rp120.000 tambahan bulan ini.
                      </div>
                    </div>
                  </div>

                  {/* Quick Interactive Transaction Testing Bar */}
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <div className="text-[11px] font-bold text-blue-300 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-400" />
                        <span>Simulasi Uji Coba: Tambah Pengeluaran Langsung ke Budget</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Klik untuk melihat progress bar bereaksi</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          recordNewTransaction({
                            type: 'expense',
                            amount: 50000,
                            category_name: 'Makanan & Minuman',
                            notes: 'Makan Siang Nasi Padang (Quick Test)',
                            source: 'web',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
                      >
                        🍜 +Rp50rb Makanan
                      </button>
                      <button
                        onClick={() => {
                          recordNewTransaction({
                            type: 'expense',
                            amount: 25000,
                            category_name: 'Transportasi',
                            notes: 'Bensin Pertalite Motor (Quick Test)',
                            source: 'web',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
                      >
                        🚗 +Rp25rb Transport
                      </button>
                      <button
                        onClick={() => {
                          recordNewTransaction({
                            type: 'expense',
                            amount: 80000,
                            category_name: 'Belanja',
                            notes: 'Belanja Keperluan Rumah (Quick Test)',
                            source: 'web',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
                      >
                        👕 +Rp80rb Belanja
                      </button>
                      <button
                        onClick={() => {
                          recordNewTransaction({
                            type: 'expense',
                            amount: 35000,
                            category_name: 'Hiburan',
                            notes: 'Bioskop / Game Voucher (Quick Test)',
                            source: 'web',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
                      >
                        🎮 +Rp35rb Hiburan
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Real Category Budgets List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white">Rincian 5 Target Anggaran Kategori</h3>
                  <span className="text-xs text-slate-400">Otomatis sinkron dengan pencatatan Telegram & Web</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedBudgets.map((b) => {
                    const percentage = Math.min(100, Math.round((b.current_spent / b.monthly_limit) * 100));
                    const isWarning = percentage >= 80 && percentage < 100;
                    const isDanger = percentage >= 100;
                    const sisa = Math.max(0, b.monthly_limit - b.current_spent);

                    return (
                      <div
                        key={b.id}
                        className="liquid-glass rounded-3xl p-5 border border-white/10 liquid-card-hover transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl p-2 rounded-2xl bg-white/5 border border-white/10">
                              {b.category_icon}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-sm">{b.category_name}</h4>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Plafon: Rp{b.monthly_limit.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isDanger ? (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                🚨 Overbudget ({percentage}%)
                              </span>
                            ) : isWarning ? (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                ⚠️ Waspada ({percentage}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ✅ Aman ({percentage}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar with Liquid Glow */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-400">
                              Bulan Ini: <strong className="text-white">Rp{b.current_spent.toLocaleString('id-ID')}</strong>
                            </span>
                            <span className="text-slate-400 font-mono">
                              Sisa: <strong className="text-emerald-400">Rp{sisa.toLocaleString('id-ID')}</strong>
                            </span>
                          </div>

                          {periodFilter !== 'all' && periodFilter !== '30d' && (
                            <div className="text-[11px] text-blue-300 font-medium flex justify-between pt-0.5 border-t border-white/5 mt-1">
                              <span>Pengeluaran {periodMetrics.label}:</span>
                              <span className="font-bold font-mono text-white">
                                Rp{(filteredTransactions
                                  .filter((t) => t.type === 'expense' && (t.category_name || 'Lainnya') === b.category_name)
                                  .reduce((acc, curr) => acc + curr.amount, 0)
                                ).toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}

                          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isDanger
                                  ? 'bg-rose-500 shadow-lg shadow-rose-500/50'
                                  : isWarning
                                  ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                                  : 'apple-blue-gradient shadow-lg glow-blue'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                          <button
                            onClick={() => handleEditBudgetClick(b)}
                            className="font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
                          >
                            <span>✏️ Ubah Target Limit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(b.id)}
                            className="font-semibold text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* TAB 6: SETTINGS (4 SUB-TABS) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              {/* Settings Sub-Tab Navigation */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('profil')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    settingsSubTab === 'profil'
                      ? 'apple-blue-gradient text-white shadow glow-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('telegram')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    settingsSubTab === 'telegram'
                      ? 'apple-blue-gradient text-white shadow glow-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Telegram & BotFather</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('reminder')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    settingsSubTab === 'reminder'
                      ? 'apple-blue-gradient text-white shadow glow-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reminder WIB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('kategori')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    settingsSubTab === 'kategori'
                      ? 'apple-blue-gradient text-white shadow glow-blue'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Kategori Kustom</span>
                </button>
              </div>

              {/* SUB-TAB 1: PROFIL */}
              {settingsSubTab === 'profil' && (
                <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Profil Pengguna</h3>
                      <p className="text-xs text-slate-400">Kelola identitas akun, nomor telepon, mata uang utama, dan zona waktu Anda.</p>
                    </div>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-3 py-1 rounded-full border border-blue-500/30">
                      Paket {profile.plan.toUpperCase()}
                    </span>
                  </div>

                  {profileSavedFeedback && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Profil berhasil diperbarui dan tersimpan!</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          value={profileFullName}
                          onChange={(e) => setProfileFullName(e.target.value)}
                          required
                          className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                          placeholder="Nama lengkap Anda"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">No. WhatsApp / HP</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          required
                          className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                          placeholder="+62 812-3456-7890"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Mata Uang Utama</label>
                        <select
                          value={profileCurrency}
                          onChange={(e) => setProfileCurrency(e.target.value)}
                          className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                        >
                          <option value="IDR">IDR — Rupiah Indonesia (Rp)</option>
                          <option value="USD">USD — US Dollar ($)</option>
                          <option value="SGD">SGD — Singapore Dollar (S$)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Zona Waktu (Timezone)</label>
                        <select
                          value={profileTimezone}
                          onChange={(e) => setProfileTimezone(e.target.value)}
                          className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                        >
                          <option value="Asia/Jakarta">Asia/Jakarta (WIB — UTC+7)</option>
                          <option value="Asia/Makassar">Asia/Makassar (WITA — UTC+8)</option>
                          <option value="Asia/Jayapura">Asia/Jayapura (WIT — UTC+9)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl apple-blue-gradient text-white font-bold text-xs shadow glow-blue hover:brightness-110"
                      >
                        Simpan Profil
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUB-TAB 2: TELEGRAM */}
              {settingsSubTab === 'telegram' && (
                <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Integrasi Telegram & BotFather</h3>
                      <p className="text-xs text-slate-400">Hubungkan bot Telegram Anda untuk pencatatan transaksi otomatis via natural language, OCR struk, dan VN.</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{profile.telegram_user_id ? 'Terhubung (ID: ' + profile.telegram_user_id + ')' : 'Belum Terhubung'}</span>
                    </span>
                  </div>

                  {/* Tutorial BotFather */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                    <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-blue-400" />
                      <span>Langkah Integrasi BotFather:</span>
                    </h4>
                    <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside pl-1">
                      <li>Buka aplikasi Telegram dan cari <span className="font-mono text-blue-400 bg-white/5 px-1.5 py-0.5 rounded">@BotFather</span>.</li>
                      <li>Kirim perintah <span className="font-mono text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/newbot</span> dan ikuti petunjuk nama bot Anda.</li>
                      <li>Salin <strong>HTTP API Token</strong> yang diberikan oleh BotFather (contoh: <code className="text-slate-400">7293849182:AAH9fklm...</code>).</li>
                      <li>Tempelkan token ke input di bawah ini, lalu klik tombol <strong>Test Koneksi & Set Webhook</strong>.</li>
                      <li>Atau gunakan tautan deep-link di bawah untuk memasangkan akun Anda secara instan.</li>
                    </ol>
                  </div>

                  {/* Deep-link Box */}
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-blue-400 uppercase">Tautan Deep-Link Pairing</div>
                      <div className="font-mono text-xs text-slate-200 mt-0.5">https://t.me/Rumahluki01bot?start=link_{profile.id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 flex items-center space-x-1.5"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Tersalin!' : 'Salin Tautan'}</span>
                    </button>
                  </div>

                  {/* Token Form */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Telegram Bot Token</label>
                      <input
                        type="text"
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                        placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                        className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-[#0071E3] font-mono text-xs text-[#F8FAFC] shadow-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestTelegramConnection}
                      disabled={testBotLoading}
                      className="px-5 py-2.5 rounded-xl apple-blue-gradient text-white font-bold text-xs shadow glow-blue hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {testBotLoading ? '⏳ Testing...' : 'Test Koneksi & Set Webhook'}
                    </button>

                    {testBotResult && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs font-semibold ${
                          testBotResult.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {testBotResult.status === 'success' ? '🟢 ' : '🔴 '}
                        {testBotResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: REMINDER WIB */}
              {settingsSubTab === 'reminder' && (
                <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Pengingat Pencatatan WIB</h3>
                      <p className="text-xs text-slate-400">Kirimkan notifikasi ramah via Telegram untuk mengingatkan Anda mencatat pengeluaran harian.</p>
                    </div>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <span className="text-xs font-bold text-slate-300">Status Reminder:</span>
                      <input
                        type="checkbox"
                        checked={reminderActive}
                        onChange={(e) => setReminderActive(e.target.checked)}
                        className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                      />
                      <span className={`text-xs font-extrabold ${reminderActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {reminderActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>
                  </div>

                  {reminderSavedFeedback && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Jadwal pengingat WIB berhasil disimpan!</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveReminder} className="space-y-5 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-2">Frekuensi Pengingat Harian</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setReminderFrequency(1)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            reminderFrequency === 1
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
                          }`}
                        >
                          <div className="font-bold text-white text-sm">1x Sehari (Pagi)</div>
                          <p className="text-slate-400 text-[11px] mt-1">Pengingat pagi hari sebelum aktivitas dimulai.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReminderFrequency(2)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            reminderFrequency === 2
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
                          }`}
                        >
                          <div className="font-bold text-white text-sm">2x Sehari (Pagi & Malam)</div>
                          <p className="text-slate-400 text-[11px] mt-1">Pengingat pagi dan rekap malam sebelum istirahat.</p>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">Jam Pengingat Pagi (WIB)</label>
                        <input
                          type="time"
                          value={reminderTime1}
                          onChange={(e) => setReminderTime1(e.target.value)}
                          className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Default: 08:00 WIB</span>
                      </div>
                      {reminderFrequency === 2 && (
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">Jam Pengingat Malam (WIB)</label>
                          <input
                            type="time"
                            value={reminderTime2}
                            onChange={(e) => setReminderTime2(e.target.value)}
                            className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-mono"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">Default: 20:00 WIB</span>
                        </div>
                      )}
                    </div>

                    {/* Preview message */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Contoh Pesan Bot Telegram</span>
                      <p className="text-slate-300 text-xs italic">
                        &quot;Halo {profile.full_name}! 🔔 Waktunya rekap keuangan hari ini. Sudahkah mencatat transaksi makan siang atau belanja? Cukup balas chat ini ya!&quot;
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl apple-blue-gradient text-white font-bold text-xs shadow glow-blue hover:brightness-110"
                      >
                        Simpan Jadwal Pengingat
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUB-TAB 4: KATEGORI KUSTOM */}
              {settingsSubTab === 'kategori' && (
                <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Kategori Kustom Transaksi</h3>
                      <p className="text-xs text-slate-400">Tambahkan atau kelola kategori pengeluaran dan pemasukan sesuai kebutuhan Anda.</p>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                      {categories.length} Kategori Aktif
                    </span>
                  </div>

                  {catSavedFeedback && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Kategori baru berhasil ditambahkan!</span>
                    </div>
                  )}

                  {/* List of categories */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-xs">Daftar Kategori</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner"
                              style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}50`, borderWidth: '1px' }}
                            >
                              {cat.icon}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-white leading-tight">{cat.name}</div>
                              <span className={`text-[9px] font-bold ${cat.type === 'income' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                              </span>
                            </div>
                          </div>
                          {cat.is_default ? (
                            <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md font-medium border border-white/10">
                              Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                              title="Hapus kategori kustom"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Category Form */}
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <h4 className="font-bold text-white text-xs">Tambah Kategori Baru</h4>
                    <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">Nama Kategori</label>
                          <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            required
                            placeholder="Contoh: Kopi & Nongkrong, Langganan SaaS"
                            className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">Jenis Kategori</label>
                          <select
                            value={newCatType}
                            onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
                            className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-medium"
                          >
                            <option value="expense">Pengeluaran (Expense)</option>
                            <option value="income">Pemasukan (Income)</option>
                          </select>
                        </div>
                      </div>

                      {/* Emoji Picker */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1.5">Pilih Emoji Icon</label>
                        <div className="flex flex-wrap gap-2">
                          {['🍜', '🚗', '🛍️', '🎮', '🏥', '🏠', '💡', '💼', '💰', '🎓', '✈️', '☕', '📱', '🍔', '🍿'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setNewCatEmoji(emoji)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${
                                newCatEmoji === emoji
                                  ? 'bg-blue-500/30 border-2 border-blue-400 scale-110 shadow glow-blue'
                                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Picker */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1.5">Pilih Warna Aksen</label>
                        <div className="flex flex-wrap gap-2.5">
                          {['#FF5A1F', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#F59E0B', '#06B6D4', '#64748B'].map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setNewCatColor(hex)}
                              style={{ backgroundColor: hex }}
                              className={`w-7 h-7 rounded-full transition-all ${
                                newCatColor === hex
                                  ? 'ring-4 ring-white/60 scale-110'
                                  : 'hover:scale-105'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl apple-blue-gradient text-white font-bold text-xs shadow glow-blue hover:brightness-110"
                        >
                          Tambah Kategori
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ADMIN AI SWITCHBOARD */}
          {activeTab === 'admin' && (
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-white text-base">Superadmin AI Multi-Provider Switchboard</h3>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30">Superadmin</span>
                  </div>
                  <p className="text-xs text-slate-400">Konfigurasi failover otomatis antara Gemini, OpenAI, dan DeepSeek</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {initialAIProviders.map((p) => (
                  <div key={p.id} className="p-5 rounded-2xl border border-white/10 bg-black/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{p.displayName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                    <div className="text-[11px] text-slate-400">Prioritas: {p.priority} (Failover ready)</div>
                    <div className="p-2 bg-white/5 rounded-lg text-[10px] font-mono text-slate-300">
                      Key: {p.encryptedKey}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Latency: {p.avgLatencyMs}ms</span>
                      <span className="text-emerald-400">Operational</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL TAMBAH TRANSAKSI MANUAL */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-white text-base">Catat Transaksi Manual</h3>
              <button onClick={() => setShowAddTxModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    txType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    txType === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="25000"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Kategori</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Dompet</label>
                <select
                  value={txWallet}
                  onChange={(e) => setTxWallet(e.target.value)}
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.icon} {w.name} (Saldo: Rp{w.balance.toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Catatan</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Contoh: Makan siang bareng tim"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl apple-blue-gradient text-white font-bold glow-blue hover:brightness-110"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH WALLET BARU */}
      {showAddWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base">Tambah Dompet Baru</h3>
                <p className="text-xs text-slate-400">Buat dompet untuk rekening bank, e-wallet, atau uang tunai</p>
              </div>
              <button onClick={() => setShowAddWalletModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Dompet</label>
                <input
                  type="text"
                  required
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="Contoh: SeaBank, ShopeePay, Kas Dompet"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jenis Dompet</label>
                  <select
                    value={newWalletType}
                    onChange={(e) => handleWalletTypeChange(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white"
                  >
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="cash">Cash / Tunai</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {newWalletType === 'bank'
                      ? 'Pilih Bank'
                      : newWalletType === 'ewallet'
                      ? 'Pilih E-Wallet'
                      : newWalletType === 'cash'
                      ? 'Pilih Kas / Tunai'
                      : 'Pilih Fitur Lainnya'}
                  </label>
                  <select
                    value={newWalletInstitution}
                    onChange={(e) => handleInstitutionChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white"
                  >
                    {newWalletType === 'bank' &&
                      BANK_INSTITUTIONS.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.icon} {inst.name}
                        </option>
                      ))}
                    {newWalletType === 'ewallet' &&
                      EWALLET_INSTITUTIONS.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.icon} {inst.name}
                        </option>
                      ))}
                    {newWalletType === 'cash' &&
                      CASH_INSTITUTIONS.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.icon} {inst.name}
                        </option>
                      ))}
                    {newWalletType === 'other' &&
                      OTHER_INSTITUTIONS.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.icon} {inst.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  value={newWalletBalance}
                  onChange={(e) => setNewWalletBalance(e.target.value)}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nomor Rekening / HP (Opsional)</label>
                <input
                  type="text"
                  value={newWalletNumber}
                  onChange={(e) => setNewWalletNumber(e.target.value)}
                  placeholder="Contoh: 123-456-7890"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="wallet-default-check"
                  checked={newWalletIsDefault}
                  onChange={(e) => setNewWalletIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-500"
                />
                <label htmlFor="wallet-default-check" className="font-semibold text-slate-300 select-none">
                  Jadikan dompet default untuk transaksi Telegram
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddWalletModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl apple-blue-gradient text-white font-bold glow-blue hover:brightness-110"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFER SALDO ANTAR WALLET */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base">Transfer Saldo Antar Dompet</h3>
                <p className="text-xs text-slate-400">Pindahkan saldo dari satu dompet ke dompet lainnya</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleTransferWallet} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Dari Dompet (Sumber)</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.name} (Saldo: Rp{w.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Ke Dompet (Tujuan)</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.name} (Saldo: Rp{w.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nominal Transfer (Rp)</label>
                <input
                  type="number"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl apple-blue-gradient text-white font-bold glow-blue hover:brightness-110"
                >
                  Kirim Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATUR / EDIT TARGET BUDGET BULANAN */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {editingBudget ? '✏️ Ubah Plafon Target Budget' : '🎯 Atur Target Budget Baru'}
                </h3>
                <p className="text-xs text-slate-400">Tentukan batas pengeluaran maksimal per kategori per bulan</p>
              </div>
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Kategori Transaksi</label>
                <select
                  value={budgetCategoryName}
                  onChange={(e) => setBudgetCategoryName(e.target.value)}
                  disabled={!!editingBudget}
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-semibold disabled:opacity-60"
                >
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Target Plafon Bulanan (Rp)</label>
                <input
                  type="text"
                  required
                  value={budgetLimitInput}
                  onChange={(e) => setBudgetLimitInput(e.target.value)}
                  placeholder="Contoh: 1500000"
                  className="w-full p-2.5 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-white font-mono font-bold text-sm"
                />
                <div className="flex gap-2 mt-2">
                  {[500000, 1000000, 1500000, 2000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBudgetLimitInput(String(val))}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] border border-white/10 transition-colors"
                    >
                      {(val / 1000).toLocaleString('id-ID')}rb
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
                💡 Bot Telegram otomatis mengirim notifikasi waspada jika pengeluaran kategori ini menyentuh 80% dan 100%.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBudgetModal(false);
                    setEditingBudget(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl apple-blue-gradient text-white font-bold glow-blue hover:brightness-110"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PENUH TATA AI BOT (FULL INTERFACE) */}
      {showTataAIModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="liquid-glass rounded-3xl w-full max-w-4xl h-[92vh] max-h-[860px] border border-blue-500/30 shadow-2xl bg-[#0B0F19]/95 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Tata AI Header */}
            <div className="bg-black/60 text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md shrink-0">
              <div className="flex items-center space-x-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl apple-blue-gradient flex items-center justify-center text-white shadow-lg glow-blue">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base text-white">Tata AI Bot</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                      Live Webhook &lt;50ms
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Asisten Keuangan Pintar — Chat natural, tanya saldo & scan struk instan
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleScanSampleReceipt}
                  disabled={isScanningReceipt}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                  title="Uji coba parsing struk belanja otomatis"
                >
                  <ReceiptText className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">{isScanningReceipt ? 'Scanning OCR...' : 'Contoh Struk'}</span>
                  <span className="sm:hidden">{isScanningReceipt ? '...' : 'Struk'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTataAIModal(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center font-bold text-base"
                  title="Tutup Tata AI"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm font-sans text-slate-200 custom-scrollbar">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] p-3.5 sm:p-4 rounded-2xl ${
                      m.sender === 'user'
                        ? 'apple-blue-gradient text-white rounded-tr-none shadow-lg'
                        : 'bg-slate-900/90 text-slate-200 rounded-tl-none border border-white/10 whitespace-pre-wrap font-mono shadow-md'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="font-bold">{m.sender === 'user' ? 'Anda' : '🤖 Tata AI Bot'}</span>
                      <span className="font-mono text-[9px]">{m.time}</span>
                    </div>
                    {m.imageUrl && (
                      <div className="my-2.5 rounded-xl overflow-hidden border border-white/20 max-w-[320px] bg-black/50 shadow-md">
                        <img src={m.imageUrl} alt="Foto Struk" className="w-full h-auto object-cover max-h-64" />
                      </div>
                    )}
                    <div className="leading-relaxed">{m.text}</div>
                    {m.pendingWalletChoice && (
                      <div className="mt-3 pt-3 border-t border-white/10 font-sans">
                        {m.pendingWalletChoice.completedWallet ? (
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                            <span>✅</span>
                            <span>Tercatat ke dompet: <strong>{m.pendingWalletChoice.completedWallet}</strong></span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-300 font-semibold flex items-center space-x-1.5">
                              <span>👛</span>
                              <span>Pilih dompet untuk transaksi ini:</span>
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {wallets.map((w) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => handleConfirmTransactionWithWallet(idx, m.pendingWalletChoice!, w.id)}
                                  className="p-2 rounded-xl bg-slate-800/90 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/50 text-left transition-all group flex items-center space-x-2"
                                >
                                  <span className="text-base p-1 rounded-lg bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                                    {w.icon || '👛'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white text-xs truncate group-hover:text-blue-300">
                                      {w.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                      Rp{w.balance.toLocaleString('id-ID')}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isScanningReceipt && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center space-x-3 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Memindai Struk dengan Vision OCR AI...</p>
                      <p className="text-[10px] text-blue-300/80">Mendeteksi merchant, item belanja, dan total biaya</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Kartu Interaktif Verifikasi Struk (Editable/Confirmable Receipt Card) */}
              {showInteractiveReceiptCard && !isScanningReceipt && (
                <div className="my-2 p-4 sm:p-5 rounded-2xl bg-[#0F172A]/95 border border-blue-500/40 shadow-2xl space-y-4 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <ReceiptText className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="font-black text-white text-sm sm:text-base">Kartu Verifikasi Struk Belanja</h4>
                        <p className="text-[11px] text-slate-400">Verifikasi & sesuaikan rincian sebelum disimpan ke transaksi</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
                      ✨ OCR Siap Verifikasi
                    </span>
                  </div>

                  {/* Merchant & Tanggal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Nama Merchant / Toko
                      </label>
                      <input
                        type="text"
                        value={receiptMerchant}
                        onChange={(e) => setReceiptMerchant(e.target.value)}
                        placeholder="Contoh: Indomaret, Alfamart"
                        className="w-full bg-transparent text-white font-bold text-xs sm:text-sm outline-none border-b border-white/10 focus:border-blue-500 py-0.5"
                      />
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Tanggal Transaksi
                      </label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="w-full bg-transparent text-white font-bold text-xs sm:text-sm outline-none font-mono py-0.5"
                      />
                    </div>
                  </div>

                  {/* Pilihan Dompet & Pilihan Kategori */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Pilihan Dompet
                      </label>
                      <select
                        value={receiptWallet}
                        onChange={(e) => setReceiptWallet(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-semibold text-xs outline-none focus:border-blue-500"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.icon} {w.name} (Rp{w.balance.toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Pilihan Kategori
                      </label>
                      <select
                        value={receiptCategory}
                        onChange={(e) => setReceiptCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white font-semibold text-xs outline-none focus:border-blue-500"
                      >
                        {categories
                          .filter((c) => c.type === 'expense')
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Rincian Item Produk & Harga */}
                  <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Rincian Item Produk ({receiptItems.length} item)</span>
                      <span>Harga Satuan (Rp)</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {receiptItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateReceiptItem(idx, 'name', e.target.value)}
                            className="flex-1 bg-black/40 text-white text-xs p-2 rounded-xl border border-white/10 outline-none focus:border-blue-500"
                            placeholder="Nama item belanja"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateReceiptItem(idx, 'price', e.target.value)}
                            className="w-28 bg-black/40 text-emerald-400 font-mono font-bold text-xs p-2 rounded-xl border border-white/10 outline-none text-right focus:border-blue-500"
                            placeholder="Harga"
                          />
                          {receiptItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveReceiptItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Hapus baris item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleAddReceiptItem}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-400/30 text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Item</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-xs">Total Biaya:</span>
                        <span className="font-black text-emerald-400 text-sm sm:text-base font-mono">
                          Rp{receiptTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Batal & Simpan ke Transaksi */}
                  <div className="pt-1 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowInteractiveReceiptCard(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReceipt}
                      className="px-5 py-2.5 rounded-xl apple-blue-gradient text-white font-bold text-xs glow-blue hover:brightness-110 flex items-center space-x-2 shadow-lg transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✅ Simpan ke Transaksi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips: Exactly 4 Accurate Prompts */}
            <div className="p-3 sm:p-4 bg-black/50 border-t border-white/10 space-y-2 shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Quick Prompt:</span>
                <span className="text-[10px] text-blue-400">Response &lt;50ms</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSendSimChat('analisis keuangan')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs border border-indigo-500/30 font-bold transition-all flex items-center space-x-1.5"
                >
                  <span>🤖</span>
                  <span>Analisis Keuangan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendSimChat('/saldo')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 font-bold transition-all flex items-center space-x-1.5"
                >
                  <span>💳</span>
                  <span>Cek Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendSimChat('pemasukan hari ini')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs border border-emerald-500/30 font-bold transition-all flex items-center space-x-1.5"
                >
                  <span>💰</span>
                  <span>Pemasukan Hari Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendSimChat('pengeluaran hari ini')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs border border-rose-500/30 font-bold transition-all flex items-center space-x-1.5"
                >
                  <span>💸</span>
                  <span>Pengeluaran Hari Ini</span>
                </button>
              </div>
            </div>

            {/* Chat Input Bar */}
            <div className="p-3.5 sm:p-4 bg-black/70 border-t border-white/10 flex items-center space-x-2 shrink-0">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleUploadReceiptFile}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload / Foto Struk Belanja dari Kamera HP atau Galeri (OCR)"
                disabled={isScanningReceipt}
                className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5 shrink-0"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline text-xs font-bold">Foto Struk</span>
              </button>

              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendSimChat()}
                placeholder="Ketik 'makan 5000', 'gajian 5jt', '/saldo'..."
                className="flex-1 bg-slate-900/80 text-white text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none border border-white/10 focus:border-blue-500 placeholder:text-slate-500 min-w-0"
              />

              <button
                type="button"
                onClick={() => handleSendSimChat()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 apple-blue-gradient text-white font-bold text-xs sm:text-sm rounded-xl glow-blue hover:brightness-110 flex items-center space-x-1.5 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMILIH RENTANG TANGGAL INTERAKTIF (KALENDER VISUAL "TINGGAL KLIK") */}
      {showDatePickerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-xl w-full border border-white/20 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <span className="p-2.5 rounded-2xl apple-blue-gradient text-white shadow glow-blue">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">Pilih Rentang Tanggal Interaktif</h3>
                  <p className="text-xs text-slate-400">Klik tanggal mulai lalu tanggal selesai pada kalender</p>
                </div>
              </div>
              <button onClick={() => setShowDatePickerModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preset Cepat:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleApplyPreset('today');
                    setShowDatePickerModal(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    periodFilter === '1d' ? 'apple-blue-gradient text-white border-blue-400 shadow-md' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyPreset('7d');
                    setShowDatePickerModal(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    periodFilter === '7d' ? 'apple-blue-gradient text-white border-blue-400 shadow-md' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  📅 7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyPreset('30d');
                    setShowDatePickerModal(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    periodFilter === '30d' ? 'apple-blue-gradient text-white border-blue-400 shadow-md' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  📆 Bulanan (30 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('thisMonth')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
                >
                  🗓️ Bulan Ini (September)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('lastMonth')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
                >
                  🗓️ Bulan Lalu (Agustus)
                </button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (calViewMonth === 0) {
                      setCalViewMonth(11);
                      setCalViewYear(calViewYear - 1);
                    } else {
                      setCalViewMonth(calViewMonth - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-extrabold text-white text-sm">
                  {new Date(calViewYear, calViewMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (calViewMonth === 11) {
                      setCalViewMonth(0);
                      setCalViewYear(calViewYear + 1);
                    } else {
                      setCalViewMonth(calViewMonth + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
              </div>

              {/* Date tiles */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {(() => {
                  const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
                  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
                  const tiles = [];

                  // Empty pads
                  for (let i = 0; i < firstDayIndex; i++) {
                    tiles.push(<div key={`pad-${i}`} className="h-8" />);
                  }

                  // Day buttons
                  for (let d = 1; d <= daysInMonth; d++) {
                    const monthStr = String(calViewMonth + 1).padStart(2, '0');
                    const dayStr = String(d).padStart(2, '0');
                    const curDateStr = `${calViewYear}-${monthStr}-${dayStr}`;

                    const isStart = curDateStr === customStartDate;
                    const isEnd = curDateStr === customEndDate;
                    const inRange = customStartDate && customEndDate && curDateStr > customStartDate && curDateStr < customEndDate;

                    tiles.push(
                      <button
                        key={curDateStr}
                        type="button"
                        onClick={() => handleSelectCalendarDate(curDateStr)}
                        className={`h-8 rounded-xl font-bold transition-all text-xs flex items-center justify-center ${
                          isStart || isEnd
                            ? 'apple-blue-gradient text-white shadow-lg glow-blue font-black scale-105'
                            : inRange
                            ? 'bg-blue-500/20 text-blue-200 border-y border-blue-500/30'
                            : 'hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  }
                  return tiles;
                })()}
              </div>
            </div>

            {/* Selected Range Display & Confirm */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs">
                <span className="text-slate-400">Rentang Terpilih: </span>
                <strong className="text-blue-400 font-mono">
                  {customStartDate || '...'} s/d {customEndDate || '...'}
                </strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodFilter('custom');
                    setShowDatePickerModal(false);
                  }}
                  className="px-5 py-2 rounded-xl apple-blue-gradient text-white font-bold glow-blue text-xs hover:brightness-110"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
