/**
 * Transaction Quota Enforcement Engine
 * Enforces calendar-month 50 transactions limit for Starter tier, unlimited for Pro tier.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface QuotaCheckResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  error: string | null;
}

export const STARTER_MONTHLY_LIMIT = 100;

/**
 * Check Starter quota against the current monthly transaction count
 */
export function checkStarterQuota(currentCount: number): QuotaCheckResult {
  const LIMIT = STARTER_MONTHLY_LIMIT;
  return {
    allowed: currentCount < LIMIT,
    count: currentCount,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - currentCount),
    error: currentCount >= LIMIT ? `Batas kuota ${LIMIT} transaksi Starter tercapai` : null,
  };
}

/**
 * Check if user plan allows recording another transaction
 */
export function isUserPlanAllowedToRecord(plan: 'starter' | 'pro', currentMonthlyCount: number): QuotaCheckResult {
  if (plan === 'pro') {
    return {
      allowed: true,
      count: currentMonthlyCount,
      limit: Infinity,
      remaining: Infinity,
      error: null,
    };
  }
  return checkStarterQuota(currentMonthlyCount);
}

/**
 * Filter and count transactions strictly within a calendar month
 */
export function countTransactionsInMonth(
  transactions: Array<{ date?: string | null; created_at?: string | null }>,
  targetDate: Date = new Date()
): number {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  return transactions.filter((tx) => {
    const dateStr = tx.date || tx.created_at;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  }).length;
}

/**
 * Query database to get current calendar-month transaction count for user
 */
export async function getUserMonthlyTransactionCount(
  userId: string,
  targetDate: Date = new Date()
): Promise<number> {
  try {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01T00:00:00Z`;

    // Calculate end of month
    const nextMonthDate = new Date(year, targetDate.getMonth() + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const startOfNextMonth = `${nextYear}-${nextMonth}-01T00:00:00Z`;

    const { count, error } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth)
      .lt('created_at', startOfNextMonth);

    if (error) {
      console.warn('[Quota] Failed to count user transactions from DB:', error.message);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.warn('[Quota] Error counting transactions:', err);
    return 0;
  }
}

/**
 * Check quota for a user by fetching their monthly count from DB
 */
export async function checkUserMonthlyQuota(
  userId: string,
  plan: 'starter' | 'pro'
): Promise<QuotaCheckResult> {
  if (plan === 'pro') {
    return {
      allowed: true,
      count: 0,
      limit: Infinity,
      remaining: Infinity,
      error: null,
    };
  }

  const count = await getUserMonthlyTransactionCount(userId);
  return checkStarterQuota(count);
}
