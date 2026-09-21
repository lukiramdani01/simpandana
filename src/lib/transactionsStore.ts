/**
 * Shared Real-Time Transactions Store & Ledger Persistence Engine
 * Synchronizes transactions across Telegram Webhook, Voice Processing, and Dashboard UI.
 */

import { Transaction } from './types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { initialTransactions, initialWallets, initialProfile } from './mock-data';

import { getWIBDateString } from '@/lib/telegram/formatter';
import { withDbTimeout } from '@/lib/dbTimeout';
import { realtimeEventBus } from '@/lib/realtime/eventBus';

declare global {
  var __transactionsMemoryStore__: Transaction[] | undefined;
}

if (!globalThis.__transactionsMemoryStore__) {
  globalThis.__transactionsMemoryStore__ = [...initialTransactions];
}

export const transactionsMemoryStore: Transaction[] = globalThis.__transactionsMemoryStore__;

export async function getAllTransactions(userId: string = 'usr-101'): Promise<Transaction[]> {
  const activeUserId = userId || 'usr-101';
  const tgUserIdStr = initialProfile.telegram_user_id ? String(initialProfile.telegram_user_id) : '';

  try {
    let query = supabaseAdmin
      .from('transactions')
      .select('id, user_id, wallet_id, category_id, type, amount, date, notes, source, created_at, wallets(name), categories(name, icon)');

    if (tgUserIdStr && tgUserIdStr !== activeUserId) {
      query = query.or(`user_id.eq.${activeUserId},user_id.eq.usr-101,user_id.eq.${tgUserIdStr}`);
    } else {
      query = query.or(`user_id.eq.${activeUserId},user_id.eq.usr-101`);
    }

    const { data, error } = await withDbTimeout(
      query.order('created_at', { ascending: false }),
      50
    );

    const dbTxs: Transaction[] = (!error && data) ? data.map((t: any) => {
      const memMatch = transactionsMemoryStore.find((m) => m.id === t.id);
      const wName = t.wallets?.name || memMatch?.wallet_name || (t.wallet_id === 'w-1' ? 'BCA Utama' : 'Dompet Utama');
      return {
        id: t.id,
        user_id: t.user_id || activeUserId,
        wallet_id: t.wallet_id || `w-1`,
        wallet_name: wName,
        category_id: t.category_id || undefined,
        category_name: t.categories?.name || memMatch?.category_name || 'Lainnya',
        category_icon: t.categories?.icon || memMatch?.category_icon || '💸',
        type: t.type,
        amount: Number(t.amount),
        date: t.date || getWIBDateString(new Date(t.created_at || Date.now())),
        time_wib: new Date(t.created_at || Date.now()).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }),
        notes: t.notes || '',
        source: t.source || 'telegram',
        created_at: t.created_at || new Date().toISOString(),
      };
    }) : [];

    const dbIds = new Set(dbTxs.map((t) => t.id));
    const extraMem = transactionsMemoryStore.filter(
      (t) =>
        (!t.user_id ||
          t.user_id === activeUserId ||
          t.user_id === 'usr-101' ||
          (tgUserIdStr && String(t.user_id) === tgUserIdStr)) &&
        !dbIds.has(t.id)
    );
    const combined = [...extraMem, ...dbTxs];
    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return combined;
  } catch {
    // Fallback on DB exception
  }

  const result = transactionsMemoryStore.filter(
    (t) =>
      !t.user_id ||
      t.user_id === activeUserId ||
      t.user_id === 'usr-101' ||
      (initialProfile.telegram_user_id && String(t.user_id) === String(initialProfile.telegram_user_id))
  );
  result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return result;
}

export async function recordTransactionInStore(params: {
  id?: string;
  userId: string;
  walletId?: string;
  walletName?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  notes: string;
  source?: string;
  date?: string;
  telegramUpdateId?: number;
  items?: any[];
  simulatedError?: 'db_insert_fail' | 'balance_update_fail';
}): Promise<{ transaction: Transaction; balanceAfter: number }> {
  // Simulate explicit DB failure if requested in Webhook Simulator
  if (params.simulatedError === 'db_insert_fail') {
    throw new Error('[Simulated DB Error] Database INSERT failed (atomic transaction rollback executed)');
  }

  const activeUserId = params.userId || 'usr-101';
  const resolvedWalletId = params.walletId || 'w-1';
  const resolvedWalletName = params.walletName || (resolvedWalletId === 'w-1' ? 'BCA Utama' : 'Dompet Utama');

  const now = new Date();
  const dateStr = params.date || getWIBDateString(now);
  const timeWib = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(now)
    .replace('.', ':');
  const txId = params.id || `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const activeSource = params.source || 'telegram';
  const defaultCatName = params.type === 'income' ? 'Gaji Bulanan' : 'Makanan & Minuman';
  const defaultCatIcon = params.type === 'income' ? '💼' : '🍜';

  // 1. Update wallet balance in memory
  let balanceAfter = 0;
  const targetWallet =
    initialWallets.find((w) => w.id === resolvedWalletId) ||
    initialWallets.find((w) => w.is_default && (w.user_id === activeUserId || !w.user_id)) ||
    initialWallets[0];
  if (targetWallet) {
    const delta = params.type === 'income' ? params.amount : -params.amount;
    targetWallet.balance = Number(targetWallet.balance || 0) + delta;
    balanceAfter = targetWallet.balance;
  } else {
    balanceAfter = params.amount;
  }

  // Simulate explicit balance failure if requested in Webhook Simulator
  if (params.simulatedError === 'balance_update_fail') {
    // Revert memory wallet balance
    if (targetWallet) {
      const delta = params.type === 'income' ? params.amount : -params.amount;
      targetWallet.balance = targetWallet.balance - delta;
    }
    throw new Error('[Simulated Balance Error] Wallet balance update failed (atomic transaction rolled back)');
  }

  const newTx: Transaction = {
    id: txId,
    user_id: activeUserId,
    wallet_id: resolvedWalletId,
    wallet_name: resolvedWalletName,
    category_id: params.categoryId || undefined,
    category_name: params.categoryName || defaultCatName,
    category_icon: params.categoryIcon || defaultCatIcon,
    type: params.type,
    amount: params.amount,
    date: dateStr,
    time_wib: timeWib,
    notes: params.notes,
    source: activeSource as any,
    items: params.items,
    created_at: now.toISOString(),
  };

  // Prepend to memory store
  transactionsMemoryStore.unshift(newTx);
  if (!initialTransactions.some((t) => t.id === newTx.id)) {
    initialTransactions.unshift(newTx);
  }

  // 2. Persist transaction into Supabase DB (protected with strict 50ms SLA timeout)
  try {
    const { error: insertErr } = await withDbTimeout(
      supabaseAdmin.from('transactions').insert({
        id: txId,
        user_id: activeUserId,
        wallet_id: resolvedWalletId,
        category_id: params.categoryId || undefined,
        type: params.type,
        amount: params.amount,
        notes: params.notes,
        source: activeSource,
        date: dateStr,
        created_at: now.toISOString(),
      }),
      50
    );

    if (insertErr) {
      console.warn('[TransactionsStore] DB insertion error:', insertErr.message);
    } else if (resolvedWalletId) {
      // Update DB wallet balance
      const { data: wData } = await withDbTimeout(
        supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('id', resolvedWalletId)
          .maybeSingle(),
        50
      );

      if (wData) {
        const delta = params.type === 'income' ? params.amount : -params.amount;
        const newDbBal = Number(wData.balance) + delta;
        await withDbTimeout(
          supabaseAdmin
            .from('wallets')
            .update({ balance: newDbBal })
            .eq('id', resolvedWalletId),
          50
        );
        balanceAfter = newDbBal;
      }
    }
  } catch (err) {
    console.warn('[TransactionsStore] DB Exception:', err);
  }

  // 3. Emit real-time sync event to server-side event bus for SSE dashboard streaming (<30ms)
  try {
    realtimeEventBus.emit('sync', {
      type: 'TRANSACTION_CREATED',
      userId: activeUserId,
      transaction: newTx,
      balanceAfter,
      walletId: resolvedWalletId,
      walletName: resolvedWalletName,
      timestamp: Date.now(),
    });
  } catch (busErr) {
    console.warn('[TransactionsStore] Realtime event bus emit warning:', busErr);
  }

  // 4. Dispatch client event / window notification if in browser environment
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('simpandana:transaction_created', {
          detail: { transaction: newTx, balanceAfter },
        })
      );
      localStorage.setItem('simpandana_last_tx', JSON.stringify({ transaction: newTx, balanceAfter, timestamp: Date.now() }));
    } catch {}
  }

  return { transaction: newTx, balanceAfter };
}

export function resetTransactionsStore(): void {
  transactionsMemoryStore.length = 0;
  initialTransactions.length = 0;
}
