'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Users,
  CreditCard,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Lock,
  Unlock,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  UserCheck,
  Eye,
  LogOut,
  RefreshCw,
  Bot,
  Send
} from 'lucide-react';
import { initialAIProviders, initialAILogs } from '@/lib/mock-data';
import { AIProviderConfig, AILog } from '@/lib/types';

interface AdminUser {
  id: string;
  full_name: string;
  phone: string;
  plan: 'starter' | 'pro';
  approval_status?: 'pending_approval' | 'approved' | 'rejected';
  is_active?: boolean;
  quota_used: number;
  quota_limit: number;
  telegram_connected: boolean;
  telegram_user_id?: number;
  telegram_username?: string;
  created_at: string;
}

interface ManualOrder {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  bank_name: string;
  receipt_filename: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string;
  target_user_name: string;
  action: string;
  reason: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  // Superadmin RBAC role state (simulated for live demonstration)
  const [currentRole, setCurrentRole] = useState<'superadmin' | 'user'>('superadmin');

  // Admin Auth State (lramdanie02@gmail.com / Dys010420)
  const ADMIN_EMAIL = 'lramdanie02@gmail.com';
  const ADMIN_PASSWORD = 'Dys010420';
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(true);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserStr = localStorage.getItem('tatadana_user');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          if (u?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || u?.role === 'superadmin') {
            setAdminAuthenticated(true);
            localStorage.setItem('simpandana_admin_auth', 'true');
          } else {
            setAdminAuthenticated(false);
            localStorage.removeItem('simpandana_admin_auth');
          }
        } else {
          setAdminAuthenticated(false);
        }
      } catch {
        setAdminAuthenticated(false);
      }
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      adminEmailInput.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      adminPasswordInput === ADMIN_PASSWORD
    ) {
      setAdminAuthenticated(true);
      localStorage.setItem('simpandana_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Email atau password admin tidak valid! Gunakan: lramdanie02@gmail.com');
    }
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    localStorage.removeItem('simpandana_admin_auth');
  };

  // Navigation tab within Admin
  const [activeSection, setActiveSection] = useState<'switchboard' | 'users' | 'payments' | 'audit' | 'simulator'>('users');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec && ['switchboard', 'users', 'payments', 'audit', 'simulator'].includes(sec)) {
        setActiveSection(sec as any);
      }
    }
  }, []);

  // Omnichannel State for Admin
  const [omniSimChannel, setOmniSimChannel] = useState<'whatsapp' | 'telegram' | 'webchat' | 'webhook'>('whatsapp');
  const [omniSimSender, setOmniSimSender] = useState('+6281234567890');
  const [omniSimText, setOmniSimText] = useState('Beli kopi 25rb pakai BCA');
  const [omniSimLoading, setOmniSimLoading] = useState(false);
  const [omniChannels, setOmniChannels] = useState<any[]>([]);
  const [omniTraces, setOmniTraces] = useState<any[]>([]);
  const [omniSimResult, setOmniSimResult] = useState<any>(null);

  const fetchOmniData = async () => {
    try {
      const [chRes, trRes] = await Promise.all([
        fetch('/api/omnichannel/channels'),
        fetch('/api/omnichannel/traces')
      ]);
      const chData = await chRes.json();
      const trData = await trRes.json();
      if (chData.ok && chData.channels) setOmniChannels(chData.channels);
      if (trData.ok && trData.traces) setOmniTraces(trData.traces);
    } catch {}
  };

  const handleSendOmniSim = async () => {
    if (!omniSimText.trim() || omniSimLoading) return;
    setOmniSimLoading(true);
    setOmniSimResult(null);
    try {
      const res = await fetch('/api/omnichannel/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: omniSimChannel,
          sender: omniSimSender,
          text: omniSimText,
        }),
      });
      const data = await res.json();
      setOmniSimResult(data.result);
      fetchOmniData();
    } catch (err: any) {
      setOmniSimResult({ ok: false, error: err.message });
    } finally {
      setOmniSimLoading(false);
    }
  };

  // Telegram Simulator State for Admin
  const [adminSimInput, setAdminSimInput] = useState('beli bakso 25rb');
  const [adminSimType, setAdminSimType] = useState<'text' | 'photo' | 'voice'>('text');
  const [adminSimLoading, setAdminSimLoading] = useState(false);
  const [processedTraces, setProcessedTraces] = useState<any[]>([]);
  const [lastUsedUpdateId, setLastUsedUpdateId] = useState<number | null>(null);
  const [adminSimLog, setAdminSimLog] = useState<Array<{ sender: 'admin' | 'bot'; text: string; payload?: any; time: string }>>([
    {
      sender: 'bot',
      text: '🤖 Simulator Webhook Telegram Siap.\nEndpoint: /api/telegram/webhook\nIdempotency Check: Aktif (update_id unik)',
      time: '14:00 WIB',
    }
  ]);

  const fetchTraces = async () => {
    try {
      const res = await fetch('/api/telegram/traces');
      const data = await res.json();
      if (data.ok && Array.isArray(data.traces)) {
        setProcessedTraces(data.traces);
      }
    } catch {}
  };

  React.useEffect(() => {
    fetchTraces();
    
  }, [activeSection]);

  const traceStats = React.useMemo(() => {
    const list = processedTraces || [];
    if (list.length === 0) {
      return {
        count: 0,
        subSecondRate: 100,
        avgLatencyMs: 14,
        p95LatencyMs: 32,
        waterfall: [
          { name: '1. Ingress & Received', ms: 1, color: 'bg-blue-500' },
          { name: '2. User Mapping', ms: 2, color: 'bg-cyan-500' },
          { name: '3. NLP Parsing', ms: 2, color: 'bg-emerald-500' },
          { name: '4. Multi-Wallet Lookup', ms: 1, color: 'bg-purple-500' },
          { name: '5. DB Tx & Balance', ms: 3, color: 'bg-amber-500' },
          { name: '6. Dashboard Sync (SSE)', ms: 2, color: 'bg-rose-500' },
          { name: '7. Outbound Response', ms: 1, color: 'bg-indigo-500' },
        ],
      };
    }

    const completed = list.filter((t: any) => t.latencyBreakdown?.totalMs !== undefined);
    const totalCount = completed.length || list.length;
    const subSecCount = completed.filter((t: any) => Number(t.latencyBreakdown?.totalMs || 0) < 1000).length;
    const subSecondRate = completed.length > 0 ? Math.round((subSecCount / completed.length) * 100) : 100;

    const sumLatency = completed.reduce((acc: number, t: any) => acc + Number(t.latencyBreakdown?.totalMs || 0), 0);
    const avgLatencyMs = completed.length > 0 ? Math.round(sumLatency / completed.length) : 18;

    const latencies = completed.map((t: any) => Number(t.latencyBreakdown?.totalMs || 0)).sort((a: number, b: number) => a - b);
    const p95LatencyMs = latencies.length > 0 ? (latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] || 25) : 25;

    const avgStep = (key: string) => {
      if (completed.length === 0) return 1;
      const sum = completed.reduce((acc: number, t: any) => acc + Number(t.latencyBreakdown?.[key] || 0), 0);
      return Math.max(1, Math.round(sum / completed.length));
    };

    return {
      count: totalCount,
      subSecondRate,
      avgLatencyMs,
      p95LatencyMs,
      waterfall: [
        { name: '1. Ingress & Received', ms: avgStep('webhookReceivedMs'), color: 'bg-blue-500' },
        { name: '2. User Mapping', ms: avgStep('userMappingMs'), color: 'bg-cyan-500' },
        { name: '3. NLP Parsing', ms: avgStep('parsingMs'), color: 'bg-emerald-500' },
        { name: '4. Multi-Wallet Lookup', ms: avgStep('walletLookupMs'), color: 'bg-purple-500' },
        { name: '5. DB Tx & Balance', ms: avgStep('transactionInsertMs') + avgStep('balanceUpdateMs'), color: 'bg-amber-500' },
        { name: '6. Dashboard Sync (SSE)', ms: avgStep('realtimeSyncMs'), color: 'bg-rose-500' },
        { name: '7. Outbound Response', ms: avgStep('telegramResponseMs'), color: 'bg-indigo-500' },
      ],
    };
  }, [processedTraces]);

  // AI Providers & Observability
  const [providers, setProviders] = useState<AIProviderConfig[]>(initialAIProviders);
  const [failoverMode, setFailoverMode] = useState<'single' | 'parallel'>('parallel');
  const [aiLogs, setAiLogs] = useState<AILog[]>(initialAILogs);

  // AI Central Configuration State (Google AI Studio Gemini - Image 1 Reference)
  const [aiBaseUrl, setAiBaseUrl] = useState('https://generativelanguage.googleapis.com');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [connLog, setConnLog] = useState('');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; displayName: string; description?: string }>>([
    { id: 'gemini-2.5-flash', displayName: 'gemini-2.5-flash', description: 'Google Generasi Terbaru Serba Bisa' },
    { id: 'gemini-2.5-pro', displayName: 'gemini-2.5-pro', description: 'Model Penalaran Kompleks Multimodal' },
    { id: 'gemini-2.0-flash', displayName: 'gemini-2.0-flash', description: 'Cepat & Hemat Kuota' },
    { id: 'gemini-1.5-flash', displayName: 'gemini-1.5-flash', description: 'Vision & STT Multimodal' },
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isSavingAIConfig, setIsSavingAIConfig] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Telegram Real Bot Sync & Polling State (Localhost Bridge)
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState('');
  const [isAutoPolling, setIsAutoPolling] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [pollStatusMsg, setPollStatusMsg] = useState('');
  const [pollSuccess, setPollSuccess] = useState<boolean | null>(null);
  const [pollLogs, setPollLogs] = useState<string[]>([]);

  const handleSyncTelegram = async () => {
    setPollLoading(true);
    setPollSuccess(null);
    try {
      const activeToken = telegramBotTokenInput.trim();

      const testRes = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken || undefined, userId: 'usr-101' }),
      });
      const testData = await testRes.json().catch(() => ({}));

      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken || undefined, notify: true }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.ok || testData.ok) {
        setPollSuccess(true);
        const msg = data.message || testData.message || 'Sync Telegram berhasil! Notifikasi telah dikirim ke Telegram HP Anda.';
        setPollStatusMsg(msg);
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setPollLogs((prev) => [...data.logs, ...prev]);
        }
        if (testData.message) {
          setPollLogs((prev) => [`[Koneksi Test] ${testData.message}`, ...prev]);
        }
      } else {
        setPollSuccess(false);
        setPollStatusMsg(`⚠️ ${data.error || testData.error || 'Gagal sync Telegram'}`);
        if (data.log) setPollLogs((prev) => [data.log, ...prev]);
        if (testData.error) setPollLogs((prev) => [`[Koneksi Error] ${testData.error}`, ...prev]);
      }
    } catch (err: any) {
      setPollSuccess(false);
      setPollStatusMsg(`❌ Sync Error: ${err.message}`);
    } finally {
      setPollLoading(false);
    }
  };

  React.useEffect(() => {
    fetch('/api/telegram/test-connection')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.token) {
          setTelegramBotTokenInput(data.token);
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    let interval: any = null;
    if (isAutoPolling) {
      interval = setInterval(() => {
        handleSyncTelegram();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPolling, telegramBotTokenInput]);

  React.useEffect(() => {
    fetch('/api/ai/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.config) {
          if (data.config.baseUrl) setAiBaseUrl(data.config.baseUrl);
          if (data.config.apiKey) setAiApiKey(data.config.apiKey);
          if (data.config.defaultModel) setSelectedModel(data.config.defaultModel);
          if (data.config.apiKey) setConnStatus('connected');
        }
      })
      .catch(() => {});
  }, []);

  const handleTestAIConnection = async () => {
    setIsTestingConn(true);
    setConnStatus('idle');
    setConnMessage('');
    setConnLog('');
    setSaveToast('');

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiApiKey, baseUrl: aiBaseUrl }),
      });
      const data = await res.json();

      if (data.ok) {
        setConnStatus('connected');
        setConnMessage(data.message || 'Terhubung ke Google AI Studio!');
        setConnLog(data.log || '');
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          if (!data.models.some((m: any) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
        }
      } else {
        setConnStatus('error');
        setConnMessage(data.error || 'Gagal terhubung ke Google AI Studio');
        setConnLog(data.log || 'Terjadi kesalahan saat memverifikasi API key.');
      }
    } catch (err: any) {
      setConnStatus('error');
      setConnMessage(`Koneksi Gagal: ${err.message}`);
      setConnLog(`[CLIENT_ERROR] ${err.stack || err.message}`);
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSaveAIConfig = async () => {
    setIsSavingAIConfig(true);
    setSaveToast('');

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: aiBaseUrl,
          apiKey: aiApiKey,
          defaultModel: selectedModel,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSaveToast('💾 Pengaturan AI Central berhasil disimpan!');
        setTimeout(() => setSaveToast(''), 4000);
      } else {
        alert(`Gagal menyimpan: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error menyimpan pengaturan: ${err.message}`);
    } finally {
      setIsSavingAIConfig(false);
    }
  };

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: 'usr-101',
      full_name: 'Luki Ramdani',
      phone: '+6281234567890',
      plan: 'pro',
      approval_status: 'approved',
      is_active: true,
      quota_used: 0,
      quota_limit: Infinity,
      telegram_connected: true,
      telegram_user_id: 182938491,
      telegram_username: 'lukiramdani',
      created_at: '2026-09-01',
    },
    {
      id: 'usr-102',
      full_name: 'Budi Santoso (Telegram User)',
      phone: '+6281398765432',
      plan: 'pro',
      approval_status: 'approved',
      is_active: true,
      quota_used: 0,
      quota_limit: Infinity,
      telegram_connected: true,
      telegram_user_id: 994821034,
      telegram_username: 'budisantoso99',
      created_at: '2026-09-19',
    },
  ]);

  React.useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.users) && data.users.length > 0) {
          const mappedUsers = data.users.map((u: any) => ({
            id: u.id,
            full_name: u.full_name || 'User Telegram',
            phone: u.phone || '-',
            plan: u.plan || 'pro',
            approval_status: u.approval_status || 'approved',
            is_active: u.is_active ?? true,
            quota_used: u.quota_used || 0,
            quota_limit: u.plan === 'pro' ? Infinity : 50,
            telegram_connected: !!u.telegram_user_id,
            telegram_user_id: u.telegram_user_id,
            telegram_username: u.telegram_username,
            created_at: u.created_at || '2026-09-19',
          }));
          setUsers(mappedUsers);
        }
      })
      .catch(() => {});
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message || 'Pengguna berhasil disetujui!');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, approval_status: 'approved', is_active: true } : u))
        );
      } else {
        alert(`Gagal menyetujui: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', userId }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message || 'Pengguna telah ditolak!');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, approval_status: 'rejected', is_active: false } : u))
        );
      } else {
        alert(`Gagal menolak: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleUserActiveState = async (userId: string, currentActive?: boolean) => {
    const nextActive = !currentActive;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', userId, isActive: nextActive }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: nextActive } : u))
        );
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Midtrans Manual Orders
  const [pendingOrders, setPendingOrders] = useState<ManualOrder[]>([
    {
      id: 'ord-1',
      order_id: 'TRX-MDT-2026-9041',
      user_id: 'usr-102',
      user_name: 'Budi Santoso',
      amount: 99000,
      bank_name: 'BCA Virtual Account',
      receipt_filename: 'bukti_transfer_bca_99k.jpg',
      status: 'pending',
      created_at: '2026-09-16 14:10 WIB',
    },
    {
      id: 'ord-2',
      order_id: 'TRX-MDT-2026-9042',
      user_id: 'usr-105',
      user_name: 'Ahmad Fauzan',
      amount: 99000,
      bank_name: 'Mandiri Bill Payment',
      receipt_filename: 'mandiri_struk_transfer_ahmad.pdf',
      status: 'pending',
      created_at: '2026-09-16 15:35 WIB',
    },
    {
      id: 'ord-3',
      order_id: 'TRX-MDT-2026-8910',
      user_id: 'usr-104',
      user_name: 'Dewi Lestari',
      amount: 99000,
      bank_name: 'BNI Virtual Account',
      receipt_filename: 'bni_mobile_receipt.jpg',
      status: 'paid',
      created_at: '2026-09-14 10:20 WIB',
    },
  ]);

  // Impersonation & Audit Trail
  const [impersonatingUser, setImpersonatingUser] = useState<AdminUser | null>(null);
  const [impersonationModalUser, setImpersonationModalUser] = useState<AdminUser | null>(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'aud-001',
      admin_id: 'adm-001',
      target_user_id: 'usr-102',
      target_user_name: 'Budi Santoso',
      action: 'IMPERSONATE_USER',
      reason: 'Investigasi limit kuota transaksi starter tercapai',
      created_at: '2026-09-15 16:45 WIB',
    },
    {
      id: 'aud-002',
      admin_id: 'adm-001',
      target_user_id: 'usr-104',
      target_user_name: 'Dewi Lestari',
      action: 'APPROVE_MANUAL_PAYMENT',
      reason: 'Verifikasi mutasi rekening BCA valid Rp99.000',
      created_at: '2026-09-14 10:25 WIB',
    },
  ]);

  // HANDLERS
  const handleToggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= providers.length) return;
    const clone = [...providers];
    const temp = clone[index];
    clone[index] = clone[newIdx];
    clone[newIdx] = temp;
    // re-assign priorities
    clone.forEach((p, idx) => {
      p.priority = idx + 1;
    });
    setProviders(clone);
  };

  const handleToggleUserPlan = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextPlan = u.plan === 'pro' ? 'starter' : 'pro';
          return {
            ...u,
            plan: nextPlan,
            quota_limit: nextPlan === 'pro' ? Infinity : 50,
          };
        }
        return u;
      })
    );
  };

  const handleApproveOrder = (orderId: string) => {
    const order = pendingOrders.find((o) => o.id === orderId);
    if (!order) return;

    setPendingOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o))
    );

    // Upgrade user to Pro
    setUsers((prev) =>
      prev.map((u) => (u.id === order.user_id ? { ...u, plan: 'pro', quota_limit: Infinity } : u))
    );

    // Audit Log
    const newAudit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      admin_id: 'adm-001',
      target_user_id: order.user_id,
      target_user_name: order.user_name,
      action: 'APPROVE_MANUAL_PAYMENT',
      reason: `Approval manual transfer order ${order.order_id} sebesar Rp${order.amount.toLocaleString('id-ID')}`,
      created_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleRejectOrder = (orderId: string) => {
    const order = pendingOrders.find((o) => o.id === orderId);
    if (!order) return;

    setPendingOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o))
    );

    const newAudit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      admin_id: 'adm-001',
      target_user_id: order.user_id,
      target_user_name: order.user_name,
      action: 'REJECT_MANUAL_PAYMENT',
      reason: `Penolakan manual transfer order ${order.order_id}`,
      created_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleStartImpersonation = () => {
    if (!impersonationModalUser) return;
    const reason = impersonationReason.trim() || 'Pemeriksaan audit diagnostik sistem';

    const newAudit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      admin_id: 'adm-001',
      target_user_id: impersonationModalUser.id,
      target_user_name: impersonationModalUser.full_name,
      action: 'IMPERSONATE_USER',
      reason,
      created_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
    setImpersonatingUser(impersonationModalUser);
    setImpersonationModalUser(null);
    setImpersonationReason('');
  };

  const handleStopImpersonation = () => {
    setImpersonatingUser(null);
  };

  const handleRunAdminSimulator = async (opts?: {
    customTgUserId?: number;
    customUpdateId?: number;
    simulateDbFailure?: boolean;
    simulateParsingFailure?: boolean;
    customInput?: string;
    customType?: 'text' | 'photo' | 'voice';
  }) => {
    const inputVal = opts?.customInput !== undefined ? opts.customInput : adminSimInput;
    const typeVal = opts?.customType || adminSimType;
    if (!inputVal.trim() && typeVal === 'text') return;

    setAdminSimLoading(true);
    const updateId = opts?.customUpdateId || Date.now();
    setLastUsedUpdateId(updateId);
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const tgUserId = opts?.customTgUserId !== undefined ? opts.customTgUserId : 182938491;

    setAdminSimLog((prev) => [
      ...prev,
      {
        sender: 'admin',
        text: `[${typeVal.toUpperCase()}] ${inputVal || '[Media]'} (Update ID: ${updateId}, Telegram User ID: ${tgUserId})`,
        time: nowStr,
      },
    ]);

    try {
      const payload: any = {
        update_id: updateId,
        simulate_db_failure: !!opts?.simulateDbFailure,
        simulate_parsing_failure: !!opts?.simulateParsingFailure,
      };

      if (typeVal === 'text') {
        payload.message = {
          message_id: 1001,
          date: Math.floor(Date.now() / 1000),
          from: { id: tgUserId, first_name: tgUserId === 182938491 ? 'Luki' : 'Guest', is_bot: false },
          chat: { id: tgUserId, type: 'private' },
          text: inputVal,
        };
      } else if (typeVal === 'photo') {
        payload.message = {
          message_id: 1002,
          date: Math.floor(Date.now() / 1000),
          from: { id: tgUserId, first_name: 'Luki', is_bot: false },
          chat: { id: tgUserId, type: 'private' },
          caption: inputVal || 'Struk Supermarket',
          photo: [{ file_id: 'sample_photo_id', file_unique_id: 'ph1', width: 800, height: 1200 }],
        };
      } else if (typeVal === 'voice') {
        payload.message = {
          message_id: 1003,
          date: Math.floor(Date.now() / 1000),
          from: { id: tgUserId, first_name: 'Luki', is_bot: false },
          chat: { id: tgUserId, type: 'private' },
          voice: { file_id: 'sample_voice_id', duration: 12 },
        };
      }

      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      setAdminSimLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.replyText || data.reply_preview || `Status: ${data.status || 'OK'}`,
          payload: data,
          time: nowStr,
        },
      ]);

      await fetchTraces();
    } catch (err: any) {
      setAdminSimLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `❌ Error memanggil webhook: ${err.message}`,
          time: nowStr,
        },
      ]);
    } finally {
      setAdminSimLoading(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase());
    const matchesPlan = planFilter === 'all' ? true : u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  if (!adminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0D111D] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-[#2997FF] shadow-lg glow-blue">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Superadmin Access</h1>
            <p className="text-xs text-slate-400">Masukkan kredensial Administrator untuk mengakses Admin Suite</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Administrator</label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="lramdanie02@gmail.com"
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 apple-blue-gradient font-extrabold text-white text-xs rounded-xl shadow-lg glow-blue hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Masuk ke Admin Suite</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Kembali ke Dashboard User
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080C14] text-[#F8FAFC]">
      {/* ACTIVE IMPERSONATION ALERT BANNER */}
      {currentRole === 'superadmin' && impersonatingUser && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xl sticky top-0 z-50 animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>
              SEDANG MENGIMPERSONASI: <strong>{impersonatingUser.full_name}</strong> ({impersonatingUser.phone}) — Mode Audit Superadmin Aktif.
            </span>
          </div>
          <button
            onClick={handleStopImpersonation}
            className="px-3 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-white text-[11px] font-extrabold border border-white/20 transition-all"
          >
            Hentikan Impersonasi
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl apple-blue-gradient flex items-center justify-center text-white shadow glow-blue">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-[#F8FAFC]">
                Simpan<span className="apple-blue-text">Uang</span> <span className="text-[#2997FF] font-mono text-xs">/admin</span>
              </span>
              <span className="block text-[9px] font-extrabold text-[#2997FF] uppercase tracking-widest">
                Superadmin Control Suite
              </span>
            </div>
          </Link>
        </div>

        {/* Global Controls & Role Switcher */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-[11px] flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Superadmin Mode</span>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold flex items-center space-x-1.5"
          >
            <span>Buka Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold flex items-center space-x-1.5 transition-all"
            title="Keluar dari Admin Suite"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </header>

      {/* ADMIN SUB-NAVIGATION BAR */}
      <div className="px-6 pt-5 pb-2 border-b border-white/10 bg-[#0B0F19]/70 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveSection('switchboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'switchboard'
                ? 'apple-blue-gradient text-white shadow glow-blue'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Provider Switchboard</span>
          </button>

          <button
            onClick={() => setActiveSection('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'users'
                ? 'apple-blue-gradient text-white shadow glow-blue'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('payments')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'payments'
                ? 'apple-blue-gradient text-white shadow glow-blue'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Approval Midtrans ({pendingOrders.filter((o) => o.status === 'pending').length} pending)</span>
          </button>

          <button
            onClick={() => setActiveSection('audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'audit'
                ? 'apple-blue-gradient text-white shadow glow-blue'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('simulator')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'simulator'
                ? 'apple-blue-gradient text-white shadow glow-blue'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Telegram Webhook Simulator</span>
          </button>

          
        </div>
      </div>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* SECTION 1: AI PROVIDER SWITCHBOARD */}
        {activeSection === 'switchboard' && (
          <div className="space-y-6">
            {/* AI CONFIGURATION CARD (GOOGLE AI STUDIO - MATCHING REFERENCE IMAGE 1) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0c162d] via-[#0f1d3a] to-[#0a1124] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 border-b border-cyan-500/20 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow glow-cyan">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>🤖 AI Configuration</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      Google AI Studio
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Konfigurasi AI central untuk semua edge function. API key dan model dipilih di sini — user biasa tidak bisa mengubah.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {/* Base URL Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">Base URL</label>
                  <input
                    type="text"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://generativelanguage.googleapis.com"
                    className="w-full px-4 py-3 bg-[#080d1a] border border-cyan-500/20 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    LiteLLM compatible API URL atau Google AI Studio Endpoint (contoh: <code className="text-cyan-300">https://generativelanguage.googleapis.com</code>)
                  </p>
                </div>

                {/* API Key Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">Google AI Studio API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Masukkan Google AI Studio API Key (AIzaSy...)"
                      className="w-full pl-4 pr-12 py-3 bg-[#080d1a] border border-cyan-500/20 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-cyan-300 transition-colors"
                      title={showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {aiApiKey.includes(':') && (
                    <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium space-y-1 mt-2">
                      <div className="flex items-center space-x-2 font-bold text-amber-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Token Bot Telegram Terdeteksi! (Mengandung karakter ':')</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        String ini adalah Token Bot Telegram. Kunci API Google AI Studio harus didapatkan dari{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-bold text-amber-100 hover:text-white"
                        >
                          https://aistudio.google.com/app/apikey
                        </a>{' '}
                        (biasanya diawali dengan <code className="bg-black/30 px-1 py-0.5 rounded font-mono">AIzaSy...</code>).
                      </p>
                    </div>
                  )}
                </div>

                {/* Fetch / Test Connection Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestAIConnection}
                    disabled={isTestingConn || !aiApiKey.trim()}
                    className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isTestingConn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Memeriksa Koneksi & Model...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-slate-950" />
                        <span>Fetch Models / Test Koneksi</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Connection Status & Error Console Output */}
                {connStatus === 'connected' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>{connMessage}</span>
                    </div>
                    {connLog && (
                      <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-emerald-200/90 whitespace-pre-wrap border border-emerald-500/20">
                        {connLog}
                      </div>
                    )}
                  </div>
                )}

                {connStatus === 'error' && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-3 animate-fadeIn">
                    <div className="flex items-center space-x-2 font-bold text-sm text-red-400">
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <span>{connMessage}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block">
                        Console Log Detail Penyebab Failure:
                      </span>
                      <pre className="p-3 bg-black/80 rounded-xl font-mono text-[11px] text-red-300 whitespace-pre-wrap border border-red-500/30 max-h-60 overflow-y-auto">
                        {connLog}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Default Model Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-200 block">Default Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-3 bg-[#080d1a] border border-cyan-500/20 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white font-mono">
                        {m.displayName} {m.description ? `— ${m.description}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Model yang dipilih akan digunakan oleh semua AI edge functions & Telegram Bot (Teks, Struk OCR, & Voice Note)
                  </p>
                </div>

                {/* Save AI Settings Button */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAIConfig}
                    disabled={isSavingAIConfig}
                    className="px-6 py-3 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/20 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>{isSavingAIConfig ? 'Menyimpan...' : '💾 Simpan Pengaturan AI'}</span>
                  </button>

                  {saveToast && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-pulse">
                      {saveToast}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div>
                <h2 className="text-lg font-black text-white">AI Multi-Provider Switchboard & Telemetri</h2>
                <p className="text-xs text-slate-400">Atur prioritas cascade failover, mode eksekusi, serta pantau latensi panggilan LLM secara real-time.</p>
              </div>

              {/* Mode Toggle: Single vs Parallel */}
              <div className="flex items-center space-x-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 text-xs">
                <span className="text-slate-400 text-[11px] font-bold px-2">Failover Mode:</span>
                <button
                  onClick={() => setFailoverMode('single')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    failoverMode === 'single'
                      ? 'bg-blue-600 text-white shadow glow-blue'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single (Cascade)
                </button>
                <button
                  onClick={() => setFailoverMode('parallel')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    failoverMode === 'parallel'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parallel (Race / Consensus)
                </button>
              </div>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {providers.map((p, idx) => (
                <div
                  key={p.id}
                  className={`liquid-glass rounded-3xl p-6 space-y-4 border transition-all ${
                    p.isActive ? 'border-white/15' : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                        #{p.priority}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">{p.displayName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{p.modelName}</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={() => handleToggleProvider(p.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-black/40 rounded-xl font-mono text-[10px] text-slate-300 flex justify-between items-center">
                      <span className="text-slate-400">Key:</span>
                      <span>{p.encryptedKey}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 bg-white/5 rounded-xl text-[11px]">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Rata-rata Latensi</span>
                        <span className="font-mono font-bold text-emerald-400">{p.avgLatencyMs} ms</span>
                      </div>
                      <div className="p-2.5 bg-white/5 rounded-xl text-[11px]">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Status Endpoint</span>
                        <span className="font-bold text-slate-200 capitalize flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{p.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority re-order buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-[11px] text-slate-400">Urutan Prioritas:</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleMovePriority(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 disabled:opacity-30"
                        title="Naikkan prioritas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePriority(idx, 'down')}
                        disabled={idx === providers.length - 1}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 disabled:opacity-30"
                        title="Turunkan prioritas"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Latency & Error Observability Logs Table */}
            <div className="liquid-glass rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className="font-extrabold text-white text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Log Observabilitas AI & Latensi Panggilan</span>
                </h3>
                <span className="text-[10px] text-slate-400">Real-time Telemetri</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/10 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Provider</th>
                      <th className="py-2.5 px-3">Aksi</th>
                      <th className="py-2.5 px-3">Prompt Tokens</th>
                      <th className="py-2.5 px-3">Completion Tokens</th>
                      <th className="py-2.5 px-3">Latensi</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {aiLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{log.created_at}</td>
                        <td className="py-2.5 px-3 font-bold text-white uppercase">{log.provider}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-300 text-[11px]">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">{log.prompt_tokens}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">{log.completion_tokens}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{log.latency_ms} ms</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: USER MANAGEMENT & APPROVAL SYSTEM */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            {/* PENDING APPROVAL USERS CARD */}
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                    ⏳
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Pengguna Menunggu Persetujuan (Pending Approval)</h3>
                    <p className="text-xs text-slate-400">Pengguna baru yang mendaftar via Telegram Bot dan menunggu persetujuan dari Administrator.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {users.filter((u) => u.approval_status?.toLowerCase() === 'pending_approval' || u.approval_status?.toLowerCase() === 'pending').length} Menunggu
                </span>
              </div>

              {users.filter((u) => u.approval_status?.toLowerCase() === 'pending_approval' || u.approval_status?.toLowerCase() === 'pending').length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  ✓ Tidak ada pengguna baru yang menunggu persetujuan. Semua pendaftaran telah diproses!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/10 font-bold">
                      <tr>
                        <th className="py-3 px-3">Nama Pengguna</th>
                        <th className="py-3 px-3">Email Terdaftar</th>
                        <th className="py-3 px-3">Telegram / ID</th>
                        <th className="py-3 px-3">Waktu Daftar</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Aksi Persetujuan Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {users.filter((u) => u.approval_status?.toLowerCase() === 'pending_approval' || u.approval_status?.toLowerCase() === 'pending').map((u) => (
                        <tr key={u.id} className="hover:bg-white/5">
                          <td className="py-3 px-3 font-bold text-white">{u.full_name}</td>
                          <td className="py-3 px-3 text-amber-300 font-mono">{(u as any).email || '-'}</td>
                          <td className="py-3 px-3 text-cyan-400 font-mono">
                            {u.telegram_username ? `@${u.telegram_username}` : (u.telegram_user_id || u.id)}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">{u.created_at}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PENDING
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => handleApproveUser(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40 font-bold text-[11px] transition-all flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Setujui (Send Welcome Msg)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectUser(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/40 font-bold text-[11px] transition-all flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ALL REGISTERED USERS TABLE */}
            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-black text-white">Semua Pengguna Terdaftar & Access Controls</h2>
                  <p className="text-xs text-slate-400">Daftar pengguna terdaftar, aktivasi akses, integrasi bot Telegram, serta impersonation.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Cari nama, nomor HP, ID..."
                      className="pl-9 pr-4 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 text-xs w-60"
                    />
                  </div>

                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 text-xs font-semibold"
                  >
                    <option value="all">Semua Paket</option>
                    <option value="pro">Pro Only</option>
                    <option value="starter">Starter Only</option>
                  </select>
                </div>
              </div>

              {/* User Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/10 font-bold">
                    <tr>
                      <th className="py-3 px-3">User ID</th>
                      <th className="py-3 px-3">Nama Pengguna</th>
                      <th className="py-3 px-3">Telegram Username</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3">Status Persetujuan</th>
                      <th className="py-3 px-3">Akses Akun</th>
                      <th className="py-3 px-3">Tgl Daftar</th>
                      <th className="py-3 px-3 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5">
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{user.id}</td>
                        <td className="py-3 px-3 font-bold text-white">{user.full_name}</td>
                        <td className="py-3 px-3 text-cyan-400 font-mono">@{user.telegram_username || 'tidak_ada'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              user.plan === 'pro'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {user.plan}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              user.approval_status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : user.approval_status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {user.approval_status || 'approved'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              user.is_active !== false
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {user.is_active !== false ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">{user.created_at}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActiveState(user.id, user.is_active)}
                              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                user.is_active !== false
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                              }`}
                            >
                              {user.is_active !== false ? '🔒 Nonaktifkan' : '🔓 Aktifkan'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setImpersonationModalUser(user)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-[10px] font-bold flex items-center space-x-1 transition-all"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>👁️ Buka Dashboard</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: MIDTRANS MANUAL APPROVALS */}
        {activeSection === 'payments' && (
          <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-black text-white">Verifikasi & Approval Manual Midtrans</h2>
                <p className="text-xs text-slate-400">Validasi bukti transfer bank manual untuk aktivasi paket SimpanUang Pro Lifetime.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/10 font-bold">
                  <tr>
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Pengguna</th>
                    <th className="py-3 px-3">Nominal</th>
                    <th className="py-3 px-3">Bank Tujuan</th>
                    <th className="py-3 px-3">Bukti Transfer</th>
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className="py-3 px-3 font-mono font-bold text-white text-[11px]">{order.order_id}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">{order.user_name}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">Rp{order.amount.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-slate-300">{order.bank_name}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-400 underline cursor-pointer">
                        {order.receipt_filename}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">{order.created_at}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            order.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : order.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {order.status === 'pending' ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-[11px] transition-all flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-[11px] transition-all flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Terselesaikan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: AUDIT TRAIL */}
        {activeSection === 'audit' && (
          <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-black text-white">Audit Trail Logging (`audit_logs`)</h2>
                <p className="text-xs text-slate-400">Rekaman kronologis aksi administrator, impersonation sesi user, dan verifikasi persetujuan pembayaran.</p>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                Idempotent Audit Log
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/10 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Log ID</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Target Pengguna</th>
                    <th className="py-2.5 px-3">Alasan / Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{log.id}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-300 font-bold">{log.admin_id}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px] font-bold text-amber-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">{log.target_user_name} ({log.target_user_id})</td>
                      <td className="py-2.5 px-3 text-slate-300">{log.reason}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 5: TELEGRAM WEBHOOK SIMULATOR & REAL BOT SYNC */}
        {activeSection === 'simulator' && (
          <div className="space-y-6">
            {/* REAL TELEGRAM BOT CONNECTOR & LOCALHOST SYNC BRIDGE */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1829] via-[#0f243f] to-[#081220] border border-blue-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 border-b border-blue-500/20 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow glow-blue">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>📱 Hubungkan Bot Telegram Asli (Localhost Bridge)</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Sync Real-Time
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Agar pesan dari aplikasi Telegram di HP Anda bisa dibalas & dicatat secara langsung saat running di localhost.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Bot Token Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">Telegram Bot Token (dari @BotFather)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={telegramBotTokenInput}
                      onChange={(e) => setTelegramBotTokenInput(e.target.value)}
                      placeholder="Masukkan Token Bot Telegram (Contoh: 7293849182:AAH9fklmN2x...)"
                      className="w-full pl-4 pr-12 py-3 bg-[#060b14] border border-blue-500/20 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncTelegram}
                    disabled={pollLoading}
                    className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {pollLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-white" />
                    )}
                    <span>🔄 Sync Pesan Telegram Sekarang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAutoPolling(!isAutoPolling)}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs border flex items-center space-x-2 transition-all active:scale-95 ${
                      isAutoPolling
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/20 animate-pulse'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isAutoPolling ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                    <span>{isAutoPolling ? '⚡ Auto-Sync Aktif (Setiap 3 Detik)' : '⚡ Aktifkan Auto-Sync Otomatis'}</span>
                  </button>
                </div>

                {/* Status Toast & Success Badge */}
                {pollStatusMsg && (
                  <div className={`p-4 rounded-2xl border font-mono space-y-2 text-xs shadow-lg transition-all ${
                    pollSuccess
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : pollSuccess === false
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-slate-900/90 border-blue-500/20 text-slate-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {pollSuccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Sync Telegram Berhasil
                          </span>
                        ) : pollSuccess === false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-400/40">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            Sync Telegram Gagal
                          </span>
                        ) : null}
                        <span className="font-bold">{pollStatusMsg}</span>
                      </div>
                      {pollSuccess && (
                        <span className="text-[10px] text-emerald-400/90 font-sans flex items-center gap-1">
                          <Send className="w-3 h-3 text-emerald-400" /> Notifikasi Terkirim ke Telegram HP
                        </span>
                      )}
                    </div>
                    {pollLogs.length > 0 && (
                      <div className="pt-2 border-t border-white/10 max-h-32 overflow-y-auto space-y-1 text-[11px] text-slate-300">
                        {pollLogs.slice(0, 5).map((l, i) => (
                          <div key={i}>• {l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-[#2997FF]" />
                  <span>Interactive Telegram Webhook Simulator</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Uji coba endpoint public /api/telegram/webhook secara langsung dengan proteksi idempotency update_id dan telemetri 7-langkah.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Webhook 200 OK
                </span>
              </div>
            </div>

            {/* 8 SIMULATOR SCENARIO PRESET BUTTONS (REQUIREMENT 12) */}
            <div className="liquid-glass rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-extrabold text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>8 Skenario Pengujian Webhook Simulator (Requirement 12)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Pilih skenario untuk menguji webhook</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'beli bakso 15rb', customType: 'text', customTgUserId: 182938491 })}
                  className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">1. Text Transaksi</span>
                  <span className="text-[10px] text-blue-300/80 font-mono">"beli bakso 15rb"</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'bensin pertamax 50rb', customType: 'voice', customTgUserId: 182938491 })}
                  className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">2. Voice Note STT</span>
                  <span className="text-[10px] text-indigo-300/80 font-mono">🎙️ Voice Note (12s)</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'Struk Indomaret Belanja', customType: 'photo', customTgUserId: 182938491 })}
                  className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">3. Photo Struk OCR</span>
                  <span className="text-[10px] text-purple-300/80 font-mono">📸 Photo Receipt</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'beli bakso 15rb', customType: 'text', customUpdateId: lastUsedUpdateId || 999111, customTgUserId: 182938491 })}
                  className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">4. Duplicate Update ID</span>
                  <span className="text-[10px] text-purple-300/80 font-mono">Idempotency DUPLICATE</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'beli bakso 15rb', customType: 'text', customTgUserId: 999888777 })}
                  className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">5. Unknown User</span>
                  <span className="text-[10px] text-amber-300/80 font-mono">USER_NOT_CONNECTED</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'gajian 5jt', customType: 'text', customTgUserId: 182938491 })}
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">6. Connected User</span>
                  <span className="text-[10px] text-emerald-300/80 font-mono">COMPLETED (Tg ID: 182938491)</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'makan siang 35rb', customType: 'text', customTgUserId: 182938491, simulateDbFailure: true })}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">7. DB Failure Sim</span>
                  <span className="text-[10px] text-rose-300/80 font-mono">Status FAILED Rollback</span>
                </button>

                <button
                  type="button"
                  disabled={adminSimLoading}
                  onClick={() => handleRunAdminSimulator({ customInput: 'xyzabc999', customType: 'text', customTgUserId: 182938491, simulateParsingFailure: true })}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-[11px] font-bold text-left transition-all disabled:opacity-50"
                >
                  <span className="block font-black text-white text-xs">8. Parsing Failure Sim</span>
                  <span className="text-[10px] text-slate-400 font-mono">PARSING_FAILED</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Input */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">Tipe Pesan Telegram</label>
                  <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAdminSimType('text')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminSimType === 'text' ? 'apple-blue-gradient text-white shadow glow-blue' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Teks Natural
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSimType('photo')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminSimType === 'photo' ? 'apple-blue-gradient text-white shadow glow-blue' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Foto Struk (Pro)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSimType('voice')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminSimType === 'voice' ? 'apple-blue-gradient text-white shadow glow-blue' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Voice Note (60s)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    {adminSimType === 'text' && 'Teks Input Natural'}
                    {adminSimType === 'photo' && 'Keterangan / Caption Struk'}
                    {adminSimType === 'voice' && 'Simulasi Transkripsi Suara'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminSimInput}
                      onChange={(e) => setAdminSimInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRunAdminSimulator()}
                      placeholder="Ketik input contoh..."
                      className="flex-1 px-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#0071E3]"
                    />
                    <button
                      type="button"
                      disabled={adminSimLoading}
                      onClick={() => handleRunAdminSimulator()}
                      className="px-5 py-2.5 rounded-xl apple-blue-gradient text-white text-xs font-bold shadow glow-blue hover:brightness-110 flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {adminSimLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Kirim</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Chat Log & Response */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-3 flex flex-col h-[320px]">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white">Live Execution Feed</span>
                  <button
                    type="button"
                    onClick={() => setAdminSimLog([])}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Bersihkan Feed
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {adminSimLog.map((log, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${log.sender === 'admin' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-3.5 ${
                          log.sender === 'admin'
                            ? 'apple-blue-gradient text-white shadow glow-blue rounded-tr-none'
                            : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-none font-mono whitespace-pre-line'
                        }`}
                      >
                        {log.text}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BREAKDOWN CARDS FOR THE 10 MOST RECENT PROCESSED UPDATES (REQUIREMENT 2 & 12) */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center space-x-2">
                    <History className="w-5 h-5 text-blue-400" />
                    <span>Audit Breakdown 10 Pesan Telegram Terproses</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rincian telemetri 14-poin & alur eksekusi 7-langkah untuk setiap update yang diterima webhook.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchTraces}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Trace Log</span>
                </button>
              </div>

              {/* AGGREGATE LATENCY TELEMETRY CARDS (REQUIREMENT R3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Sub-Second SLA */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Sub-Second SLA</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Target &lt;1.0s
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{traceStats.subSecondRate}%</div>
                  <p className="text-[11px] text-slate-400">
                    Tingkat kepatuhan respons &lt;1.0s pada transaksi Telegram real-time ({traceStats.count} sampel).
                  </p>
                </div>

                {/* Card 2: Average E2E Latency */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Rerata Latensi E2E</span>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">P95: {traceStats.p95LatencyMs}ms</span>
                  </div>
                  <div className="text-2xl font-black text-white flex items-baseline space-x-1.5">
                    <span>{traceStats.avgLatencyMs}</span>
                    <span className="text-sm font-semibold text-slate-400">ms</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rata-rata durasi siklus lengkap 7-tahap dari ingress hingga response terkirim.
                  </p>
                </div>

                {/* Card 3: 7-Step Waterfall Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Waterfall 7-Langkah</span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">Monotonic Timing</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {traceStats.waterfall.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300 truncate max-w-[150px]">{step.name}</span>
                        <span className="font-mono text-slate-400">{step.ms}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {processedTraces.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  Belum ada update webhook yang tercatat. Jalankan simulasi di atas untuk melihat alur telemetri real-time!
                </div>
              ) : (
                <div className="space-y-4">
                  {processedTraces.slice(0, 10).map((tr: any, idx: number) => (
                    <div
                      key={tr.updateId || idx}
                      className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-blue-500/40 transition-all"
                    >
                      {/* Top Header & Status Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center space-x-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold font-mono">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-mono font-bold text-white">Update ID: {tr.updateId}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Waktu: {tr.processedAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              tr.finalStatus === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : tr.finalStatus === 'USER_NOT_CONNECTED'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : tr.finalStatus === 'DUPLICATE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : tr.finalStatus === 'PARSING_FAILED'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            Final: {tr.finalStatus}
                          </span>
                        </div>
                      </div>

                      {/* 14 Breakdown Detail Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Update ID</span>
                          <span className="font-mono text-white font-bold">{tr.updateId}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Telegram User ID</span>
                          <span className="font-mono text-cyan-300 font-bold">{tr.telegramUserId || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Message ID</span>
                          <span className="font-mono text-slate-300">{tr.messageId || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">4. Isi Pesan</span>
                          <span className="font-mono text-amber-200 truncate block">{tr.messageText}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">5. SaaS User ID & Nama</span>
                          <span className="font-mono text-white font-bold">{tr.saasUserId ? `${tr.saasUserName || ''} (${tr.saasUserId})` : 'TIDAK TERHUBUNG'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">6. Parser Result</span>
                          <span className="font-mono text-emerald-300">
                            {tr.parserResult?.type ? `${tr.parserResult.type.toUpperCase()} Rp${(tr.parserResult.amount || 0).toLocaleString('id-ID')}` : 'N/A'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">7. Dompet (Wallet)</span>
                          <span className="font-mono text-slate-200">{tr.wallet?.name || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">8. Kategori (Category)</span>
                          <span className="font-mono text-slate-200">{tr.category?.name || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">9. Transaction ID</span>
                          <span className="font-mono text-blue-300">{tr.transactionId || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">10. Database Status</span>
                          <span className={`font-mono font-bold ${tr.databaseStatus === 'SUCCESS' ? 'text-emerald-400' : tr.databaseStatus === 'FAILED' ? 'text-rose-400' : 'text-slate-400'}`}>
                            {tr.databaseStatus}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">11. Balance Status</span>
                          <span className={`font-mono font-bold ${tr.balanceStatus === 'SUCCESS' ? 'text-emerald-400' : tr.balanceStatus === 'FAILED' ? 'text-rose-400' : 'text-slate-400'}`}>
                            {tr.balanceStatus}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">12. Realtime Sync Status</span>
                          <span className={`font-mono font-bold ${tr.realtimeStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {tr.realtimeStatus}
                          </span>
                        </div>
                      </div>

                      {/* Latency Telemetry Breakdown */}
                      <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-slate-300 space-y-1.5 border border-white/10">
                        <div className="flex justify-between items-center text-slate-400 border-b border-white/10 pb-1">
                          <span className="font-bold text-white text-[10px] uppercase">13. Latency Breakdown per Step:</span>
                          <span className="text-emerald-400 font-bold">TOTAL: {tr.latencyBreakdown?.totalMs || 0} ms</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-300">
                          <span>Received: <strong className="text-white">{tr.latencyBreakdown?.webhookReceivedMs || 0}ms</strong></span>
                          <span>Mapping: <strong className="text-white">{tr.latencyBreakdown?.userMappingMs || 0}ms</strong></span>
                          <span>Parsing: <strong className="text-white">{tr.latencyBreakdown?.parsingMs || 0}ms</strong></span>
                          <span>Wallet: <strong className="text-white">{tr.latencyBreakdown?.walletLookupMs || 0}ms</strong></span>
                          <span>Category: <strong className="text-white">{tr.latencyBreakdown?.categoryLookupMs || 0}ms</strong></span>
                          <span>TxInsert: <strong className="text-white">{tr.latencyBreakdown?.transactionInsertMs || 0}ms</strong></span>
                          <span>BalUpdate: <strong className="text-white">{tr.latencyBreakdown?.balanceUpdateMs || 0}ms</strong></span>
                          <span>Realtime: <strong className="text-white">{tr.latencyBreakdown?.realtimeSyncMs || 0}ms</strong></span>
                          <span>TgResp: <strong className="text-white">{tr.latencyBreakdown?.telegramResponseMs || 0}ms</strong></span>
                        </div>
                      </div>

                      {/* 7-Step Trace Timeline */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Alur Eksekusi 7-Langkah (7-Step Trace Flow):</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          {tr.steps?.map((s: any, sIdx: number) => (
                            <React.Fragment key={sIdx}>
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  s.status === 'COMPLETED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : s.status === 'USER_NOT_CONNECTED'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : s.status === 'DUPLICATE'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : s.status === 'FAILED'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-white/10 text-slate-300 border border-white/10'
                                }`}
                                title={s.message}
                              >
                                {s.status} ({s.latencyMs}ms)
                              </span>
                              {sIdx < tr.steps.length - 1 && <span className="text-slate-600">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL IMPERSONATION CONFIRMATION */}
      {impersonationModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl p-6 max-w-md w-full border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-white text-base">Konfirmasi Impersonasi Pengguna</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda akan mengimpersonasi sesi pengguna <strong>{impersonationModalUser.full_name}</strong> ({impersonationModalUser.phone}). Sesi ini akan dicatat ke dalam tabel <code className="text-amber-300 font-mono bg-white/5 px-1 py-0.5 rounded">audit_logs</code> demi keamanan dan akuntabilitas.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Alasan Impersonasi (Wajib dicatat)</label>
              <textarea
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="Contoh: Investigasi kendala parsing struk OCR atau sinkronisasi saldo BCA..."
                className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-xs text-white resize-none h-24"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setImpersonationModalUser(null);
                  setImpersonationReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStartImpersonation}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition-all"
              >
                Mulai Impersonasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
