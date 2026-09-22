/**
 * Telegram Webhook Idempotency Guard
 * Dual-layer deduplication combining fast in-memory LRU with persistent PostgreSQL storage.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

declare global {
  var __inMemoryUpdateIds__: Set<number> | undefined;
}

if (!globalThis.__inMemoryUpdateIds__) {
  globalThis.__inMemoryUpdateIds__ = new Set<number>();
}

export const inMemoryUpdateIds: Set<number> = globalThis.__inMemoryUpdateIds__;
const MAX_CACHE_SIZE = 10000;

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  error?: string;
}

export async function withDbTimeout<T>(promise: PromiseLike<T>, ms = 50): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('DB Timeout')), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Check if update_id was already processed and atomically register it
 */
export async function checkAndRecordUpdateId(
  updateId: number,
  userId?: string | null,
  chatId?: number | null,
  text?: string | null
): Promise<IdempotencyCheckResult> {
  // 1. Layer 1: Synchronous atomic check and reservation
  // Executes synchronously in Node.js event loop before any await yields
  if (inMemoryUpdateIds.has(updateId)) {
    return { isDuplicate: true };
  }

  // Atomically claim the updateId immediately before ANY async I/O
  inMemoryUpdateIds.add(updateId);
  if (inMemoryUpdateIds.size > MAX_CACHE_SIZE) {
    const first = inMemoryUpdateIds.values().next().value;
    if (first !== undefined) inMemoryUpdateIds.delete(first);
  }

  // 2. Layer 2: Persistent Supabase database check
  try {
    const { data: existing } = await withDbTimeout(
      supabaseAdmin
        .from('telegram_webhook_updates')
        .select('update_id')
        .eq('update_id', updateId)
        .maybeSingle(),
      300
    );

    if (existing) {
      return { isDuplicate: true };
    }

    // Atomic insert into telegram_webhook_updates
    const { error: insertErr } = await supabaseAdmin
      .from('telegram_webhook_updates')
      .insert({
        update_id: updateId,
        user_id: userId || null,
        chat_id: chatId || null,
        message_text: text || null,
        processed_at: new Date().toISOString(),
      });

    if (
      insertErr &&
      (insertErr.code === '23505' ||
        insertErr.message?.toLowerCase().includes('duplicate key') ||
        insertErr.message?.toLowerCase().includes('unique constraint'))
    ) {
      return { isDuplicate: true };
    }
  } catch (err) {
    // If database is unreachable in test mode or local offline, retain in-memory guarantee
    console.warn('[Idempotency] Database check skipped or failed, using memory cache:', err);
  }

  return { isDuplicate: false };
}

/**
 * Reset memory cache (useful for testing)
 */
export function resetInMemoryIdempotencyCache(): void {
  inMemoryUpdateIds.clear();
}
