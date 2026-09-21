/**
 * Telegram Command Handlers
 * Processes /start, /saldo, /hari ini, /minggu ini, /bulan ini, /budget, /sheet, /bantuan.
 * Conforms to Specification Part 4.6
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { TelegramProfile } from './linking';
import { formatRupiah, formatBudgetProgressBar, getWIBDateString, formatWIBDisplay } from './formatter';

export interface CommandResult {
  action: string;
  replyText: string;
}

/**
 * Normalizes and parses incoming command text
 */
export function parseCommand(rawText: string): { command: string; args: string } | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('/')) return null;

  const lower = trimmed.toLowerCase();
  let command = '';
  let args = '';

  if (lower.startsWith('/start')) {
    command = '/start';
    args = trimmed.slice(6).trim();
  } else if (lower.startsWith('/saldo')) {
    command = '/saldo';
    args = trimmed.slice(6).trim();
  } else if (lower.startsWith('/hari ini') || lower.startsWith('/hari_ini') || lower === '/hari') {
    command = '/hari_ini';
  } else if (lower.startsWith('/minggu ini') || lower.startsWith('/minggu_ini') || lower === '/minggu') {
    command = '/minggu_ini';
  } else if (lower.startsWith('/bulan ini') || lower.startsWith('/bulan_ini') || lower === '/bulan') {
    command = '/bulan_ini';
  } else if (lower.startsWith('/budget')) {
    command = '/budget';
  } else if (lower.startsWith('/sheet') || lower.startsWith('/sheets') || lower.startsWith('/laporan')) {
    command = '/sheet';
    args = trimmed.slice(6).trim();
  } else if (lower.startsWith('/bantuan') || lower.startsWith('/help')) {
    command = '/bantuan';
  } else {
    command = lower.split(' ')[0];
    args = trimmed.split(' ').slice(1).join(' ');
  }

  return { command, args };
}

/**
 * Executes a parsed Telegram command against user data
 */
export async function executeCommand(
  cmd: string,
  args: string,
  user: TelegramProfile | null
): Promise<CommandResult> {
  // Command /start (Unauthenticated OK)
  if (cmd === '/start') {
    return {
      action: 'cmd_start',
      replyText: `👋 Halo! Selamat datang di SimpanUang.\n\nCatat keuangan semudah chatting! Cukup ketik:\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "kopi starbucks 55k"\n\nAtau kirim 📸 foto struk / 🎙️ voice note kamu.\n\nKetik /bantuan untuk melihat semua perintah.`,
    };
  }

  // Command /bantuan (Unauthenticated OK)
  if (cmd === '/bantuan') {
    return {
      action: 'cmd_bantuan',
      replyText: `📖 Bantuan SimpanUang:\nKirim pesan natural:\n• "beli nasi padang 25rb"\n• "gajian 10jt"\n• "transfer ke bca 500k"\n\nPerintah yang tersedia:\n/saldo — cek saldo semua dompet\n/hari ini — rekap transaksi hari ini\n/minggu ini — rekap 7 hari terakhir\n/bulan ini — rekap bulan berjalan & breakdown kategori\n/budget — status semua budget bulan ini\n/sheet — link dashboard laporan & spreadsheet\n/bantuan — panduan perintah`,
    };
  }

  // Check user linking for financial commands
  if (!user) {
    return {
      action: 'unlinked_account',
      replyText: 'Halo! Akun Telegram Anda belum terhubung dengan SimpanUang. Buka Pengaturan > Telegram di dashboard untuk menghubungkan.',
    };
  }

  // Command /saldo
  if (cmd === '/saldo') {
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('name, balance, is_default, type')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    const userWallets = wallets || [];
    const total = userWallets.reduce((acc, w) => acc + Number(w.balance), 0);
    const walletLines = userWallets.map(
      (w) => `• ${w.name}: Rp ${formatRupiah(Number(w.balance))}`
    );

    return {
      action: 'cmd_saldo',
      replyText: `💳 Ringkasan Saldo Anda:\n${walletLines.join('\n')}\n\nTotal Saldo: Rp ${formatRupiah(total)}`,
    };
  }

  // Command /hari_ini
  if (cmd === '/hari_ini') {
    const today = getWIBDateString();
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, notes')
      .eq('user_id', user.id)
      .eq('date', today);

    const expenseTxs = (txs || []).filter((t) => t.type === 'expense');
    const totalExpense = expenseTxs.reduce((acc, t) => acc + Number(t.amount), 0);

    const expenseLines = expenseTxs.map(
      (t) => `├ ${t.notes || 'Pengeluaran'} (Rp ${formatRupiah(Number(t.amount))})`
    );

    const reply = `📅 Rekap Transaksi Hari Ini (${formatWIBDisplay()})\n\n💸 Pengeluaran:\n${
      expenseLines.length > 0 ? expenseLines.join('\n') + '\n' : ''
    }└ Total: Rp ${formatRupiah(totalExpense)}\n\nTetap hemat dan kendalikan pengeluaran ya! 💪`;

    return {
      action: 'cmd_hari_ini',
      replyText: reply,
    };
  }

  // Command /minggu_ini
  if (cmd === '/minggu_ini') {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 6);
    const startDate = getWIBDateString(past7);
    const endDate = getWIBDateString(today);

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    const income = (txs || []).filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = (txs || []).filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const net = income - expense;
    const netSign = net >= 0 ? '+' : '-';

    return {
      action: 'cmd_minggu_ini',
      replyText: `📊 Rekap 7 Hari Terakhir\n\n💰 Total Pemasukan : Rp ${formatRupiah(income)}\n💸 Total Pengeluaran : Rp ${formatRupiah(expense)}\n📈 Net Cashflow: ${netSign}Rp ${formatRupiah(Math.abs(net))}`,
    };
  }

  // Command /bulan_ini (with category breakdown)
  if (cmd === '/bulan_ini') {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, date, created_at, categories(name, icon)')
      .eq('user_id', user.id);

    const monthTxs = (txs || []).filter((t: any) => {
      const dStr = t.date || t.created_at;
      if (!dStr) return false;
      const d = new Date(dStr);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    });

    const income = monthTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const expense = monthTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);

    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('monthly_limit, current_spent')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear);

    const totalLimit = (budgets || []).reduce((acc: number, b: any) => acc + Number(b.monthly_limit), 0);
    const totalSpent = (budgets || []).reduce((acc: number, b: any) => acc + Number(b.current_spent), 0);
    const sisa = Math.max(0, totalLimit - totalSpent);

    // Breakdown per category
    const catMap: Record<string, { total: number; icon: string }> = {};
    for (const t of monthTxs) {
      if (t.type === 'expense') {
        const catName = t.categories?.name || 'Lainnya';
        const catIcon = t.categories?.icon || '📦';
        if (!catMap[catName]) {
          catMap[catName] = { total: 0, icon: catIcon };
        }
        catMap[catName].total += Number(t.amount);
      }
    }

    const catEntries = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    const catBreakdown = catEntries.length > 0
      ? `\n\n📂 Breakdown Pengeluaran:\n` + catEntries.slice(0, 5).map(([name, val]) => `• ${val.icon} ${name}: Rp ${formatRupiah(val.total)}`).join('\n')
      : '';

    return {
      action: 'cmd_bulan_ini',
      replyText: `📊 Rekap Bulan Berjalan\n\n💰 Total Pemasukan : Rp ${formatRupiah(income)}\n💸 Total Pengeluaran : Rp ${formatRupiah(expense)}\n🎯 Sisa Budget : Rp ${formatRupiah(sisa)}${catBreakdown}`,
    };
  }

  // Command /budget
  if (cmd === '/budget') {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('monthly_limit, current_spent, categories(name, icon)')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear);

    if (!budgets || budgets.length === 0) {
      return {
        action: 'cmd_budget',
        replyText: `🎯 Status Budget Bulan Ini\n\nBelum ada batas budget yang diatur. Silakan atur di Dashboard SimpanUang.`,
      };
    }

    const budgetLines = budgets.map((b: any) => {
      const catName = b.categories?.name || 'Kategori';
      const catIcon = b.categories?.icon || '🎯';
      const bar = formatBudgetProgressBar(Number(b.current_spent), Number(b.monthly_limit));
      return `${catIcon} ${catName}:\n${bar}`;
    });

    return {
      action: 'cmd_budget',
      replyText: `🎯 Status Budget Bulan Ini\n\n${budgetLines.join('\n\n')}`,
    };
  }

  // Command /sheet (Specification Part 4.6)
  if (cmd === '/sheet') {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://simpanuang.com';
    return {
      action: 'cmd_sheet',
      replyText: `📊 Link Laporan & Spreadsheet SimpanUang:\n\nAkses dashboard laporan lengkap dan ekspor data kamu di:\n🔗 ${baseUrl}/dashboard?tab=laporan\n\n💡 Tips: Di paket Pro, kamu bisa generate dan download riwayat transaksi ke format Excel (.xlsx) dan PDF tanpa batas kapan saja!`,
    };
  }

  return {
    action: 'cmd_unknown',
    replyText: `Perintah tidak dikenal. Ketik /bantuan untuk melihat daftar perintah.`,
  };
}
