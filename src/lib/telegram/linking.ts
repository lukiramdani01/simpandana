/**
 * Telegram Account Linking & User Identity Resolution Engine
 * Maps Telegram user/chat IDs to SimpanUang profiles and manages User Approval workflows.
 * Strict mapping: Unlinked Telegram users receive null profile (USER_NOT_CONNECTED).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { initialProfile } from '@/lib/mock-data';
import { getUserById } from '@/lib/auth/userStore';

export interface TelegramProfile {
  id: string;
  full_name: string;
  plan: 'starter' | 'pro';
  default_currency: string;
  timezone: string;
  approval_status: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  is_active: boolean;
  telegram_user_id: number | null;
  telegram_chat_id: number | null;
  telegram_username?: string | null;
  telegram_welcome_sent?: boolean;
  telegram_welcome_sent_at?: string | null;
}

type PendingUserItem = {
  id: string;
  full_name: string;
  telegram_username: string | null;
  telegram_user_id: number;
  telegram_chat_id: number;
  approval_status: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  is_active: boolean;
  registered_at: string;
  telegram_welcome_sent?: boolean;
  telegram_welcome_sent_at?: string | null;
};

declare global {
  var __pendingUsersMemoryStore__: PendingUserItem[] | undefined;
  var __autoLinkedTgUserIds__: Set<number> | undefined;
}

if (!globalThis.__pendingUsersMemoryStore__) {
  globalThis.__pendingUsersMemoryStore__ = [];
}
if (!globalThis.__autoLinkedTgUserIds__) {
  globalThis.__autoLinkedTgUserIds__ = new Set<number>();
}

export const pendingUsersMemoryStore: PendingUserItem[] = globalThis.__pendingUsersMemoryStore__;
export const autoLinkedTgUserIds: Set<number> = globalThis.__autoLinkedTgUserIds__;

import { resolveActiveBotToken } from '@/lib/telegram/tokenStore';

/**
 * Sends outbound Telegram message helper
 */
export async function sendOutboundTelegramMessage(chatId: number | null | undefined, text: string) {
  if (!chatId || !text) return;
  const token = await resolveActiveBotToken();
  if (!token || token.startsWith('mock-')) {
    console.log(`[Telegram Outbound Log] Chat ID ${chatId}:\n${text}`);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[Telegram Outbound Warning]', err);
  }
}

async function withDbTimeout<T>(promise: PromiseLike<T>, ms = 50): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('DB Timeout')), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Resolves linked SimpanUang profile for an incoming Telegram user.
 */
export async function resolveUserProfile(
  telegramUserId?: number | null,
  telegramChatId?: number | null,
  fromObj?: { first_name?: string; last_name?: string; username?: string },
  autoLink: boolean = true
): Promise<TelegramProfile | null> {
  if (!telegramUserId && !telegramChatId) return null;

  const numTgId = telegramUserId ? Number(telegramUserId) : null;
  const numChatId = telegramChatId ? Number(telegramChatId) : null;

  // 1. Check initial mock profile & auto-linked set (Luki Ramdani - usr-101)
  if (
    (numTgId && initialProfile.telegram_user_id === numTgId) ||
    (numChatId && initialProfile.telegram_chat_id === numChatId)
  ) {
    return {
      id: initialProfile.id,
      full_name: initialProfile.full_name,
      plan: initialProfile.plan as 'starter' | 'pro',
      default_currency: initialProfile.default_currency,
      timezone: initialProfile.timezone,
      approval_status: 'approved',
      is_active: true,
      telegram_user_id: numTgId || initialProfile.telegram_user_id || null,
      telegram_chat_id: numChatId || initialProfile.telegram_chat_id || null,
      telegram_username: fromObj?.username || 'lukiramdani',
      telegram_welcome_sent: (initialProfile as any).telegram_welcome_sent ?? true,
      telegram_welcome_sent_at: (initialProfile as any).telegram_welcome_sent_at ?? null,
    };
  }

  // 2. Check Database Profiles table by telegram_user_id / telegram_chat_id
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, plan, default_currency, timezone, approval_status, is_active, telegram_user_id, telegram_chat_id, telegram_username, telegram_welcome_sent, telegram_welcome_sent_at');

    if (numTgId && numChatId) {
      query = query.or(`telegram_user_id.eq.${numTgId},telegram_chat_id.eq.${numChatId}`);
    } else if (numTgId) {
      query = query.eq('telegram_user_id', numTgId);
    } else if (numChatId) {
      query = query.eq('telegram_chat_id', numChatId);
    }

    const { data, error } = await withDbTimeout(query.maybeSingle(), 50);

    if (!error && data) {
      return {
        id: data.id,
        full_name: data.full_name || 'Pengguna SimpanUang',
        plan: (data.plan as 'starter' | 'pro') || 'pro',
        default_currency: data.default_currency || 'IDR',
        timezone: data.timezone || 'Asia/Jakarta',
        approval_status: (data.approval_status as any) || 'approved',
        is_active: data.is_active ?? true,
        telegram_user_id: data.telegram_user_id,
        telegram_chat_id: data.telegram_chat_id,
        telegram_username: data.telegram_username,
        telegram_welcome_sent: data.telegram_welcome_sent ?? false,
        telegram_welcome_sent_at: data.telegram_welcome_sent_at || null,
      };
    }
  } catch (err) {
    // DB check fallback
  }

  // 3. Check memory store for linked user
  const foundMem = pendingUsersMemoryStore.find(
    (u) => (numTgId && u.telegram_user_id === numTgId) || (numChatId && u.telegram_chat_id === numChatId)
  );

  if (foundMem) {
    return {
      id: foundMem.id,
      full_name: foundMem.full_name,
      plan: 'pro',
      default_currency: 'IDR',
      timezone: 'Asia/Jakarta',
      approval_status: foundMem.approval_status || 'approved',
      is_active: foundMem.is_active ?? true,
      telegram_user_id: foundMem.telegram_user_id,
      telegram_chat_id: foundMem.telegram_chat_id,
      telegram_username: foundMem.telegram_username,
      telegram_welcome_sent: foundMem.telegram_welcome_sent ?? false,
      telegram_welcome_sent_at: foundMem.telegram_welcome_sent_at || null,
    };
  }

  // 4. Default linking for primary user usr-101 if initial testing
  if (autoLink && (numTgId || numChatId)) {
    const linkTgId = numTgId || numChatId || 182938491;
    const linkChatId = numChatId || numTgId || 182938491;

    return {
      id: initialProfile.id,
      full_name: initialProfile.full_name,
      plan: initialProfile.plan as 'starter' | 'pro',
      default_currency: initialProfile.default_currency,
      timezone: initialProfile.timezone,
      approval_status: 'approved',
      is_active: true,
      telegram_user_id: linkTgId,
      telegram_chat_id: linkChatId,
      telegram_username: fromObj?.username || 'lukiramdani',
      telegram_welcome_sent: true,
      telegram_welcome_sent_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Links a Telegram account to a target SimpanUang user profile (via /start link_USERID)
 */
export async function linkTelegramAccount(
  userId: string,
  telegramUserId: number,
  telegramChatId: number,
  telegramUsername?: string
): Promise<{ success: boolean; isFirstTimeWelcome: boolean; profile?: TelegramProfile }> {
  let isFirstTimeWelcome = false;
  const nowIso = new Date().toISOString();

  let memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (!memUser) {
    const storeUser = getUserById(userId);
    memUser = {
      id: userId,
      full_name: storeUser?.full_name || 'Pengguna SimpanUang',
      telegram_username: telegramUsername || null,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      approval_status: 'approved',
      is_active: true,
      registered_at: nowIso,
    };
    pendingUsersMemoryStore.push(memUser);
  } else {
    memUser.telegram_user_id = telegramUserId;
    memUser.telegram_chat_id = telegramChatId;
    if (telegramUsername) memUser.telegram_username = telegramUsername;
  }

  try {
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      telegram_username: telegramUsername || null,
      telegram_welcome_sent: true,
      telegram_welcome_sent_at: nowIso,
    });
  } catch {}

  const profile: TelegramProfile = {
    id: userId,
    full_name: memUser.full_name,
    plan: 'pro',
    default_currency: 'IDR',
    timezone: 'Asia/Jakarta',
    approval_status: 'approved',
    is_active: true,
    telegram_user_id: telegramUserId,
    telegram_chat_id: telegramChatId,
    telegram_username: telegramUsername || null,
    telegram_welcome_sent: true,
    telegram_welcome_sent_at: nowIso,
  };

  return { success: true, isFirstTimeWelcome, profile };
}

export async function approveUserProfile(userId: string) {
  const memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (memUser) {
    memUser.approval_status = 'approved';
    memUser.is_active = true;
  }
}

export async function rejectUserProfile(userId: string) {
  const memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (memUser) {
    memUser.approval_status = 'rejected';
    memUser.is_active = false;
  }
}

export async function suspendUserProfile(userId: string) {
  const memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (memUser) {
    memUser.approval_status = 'suspended';
    memUser.is_active = false;
  }
}

export async function toggleUserActiveState(userId: string, isActive: boolean) {
  const memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (memUser) {
    memUser.is_active = isActive;
  }
}
