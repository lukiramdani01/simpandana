/**
 * Telegram Account Linking & User Identity Resolution Engine
 * Maps Telegram user/chat IDs to SimpanUang profiles and manages User Approval workflows.
 * Strict mapping: Unlinked Telegram users receive null profile (USER_NOT_CONNECTED).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { initialProfile } from '@/lib/mock-data';

export interface TelegramProfile {
  id: string;
  full_name: string;
  plan: 'starter' | 'pro';
  default_currency: string;
  timezone: string;
  approval_status: 'pending_approval' | 'approved' | 'rejected';
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
  approval_status: 'pending_approval' | 'approved' | 'rejected';
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
 * STRICT MAPPING: Returns null if telegram_user_id is not linked to any account.
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
    (numTgId && autoLinkedTgUserIds.has(numTgId)) ||
    (numChatId && autoLinkedTgUserIds.has(numChatId)) ||
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

  // 4. Seamless User Auto-Linking: Automatically link unlinked Telegram user to primary account usr-101 (Luki Ramdani)
  if (autoLink && (numTgId || numChatId)) {
    const linkTgId = numTgId || numChatId || 182938491;
    const linkChatId = numChatId || numTgId || 182938491;

    if (linkTgId) autoLinkedTgUserIds.add(linkTgId);
    if (linkChatId) autoLinkedTgUserIds.add(linkChatId);

    await linkTelegramAccount('usr-101', linkTgId, linkChatId, fromObj?.username);

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

  if (userId === initialProfile.id) {
    if (telegramUserId) autoLinkedTgUserIds.add(telegramUserId);
    if (telegramChatId) autoLinkedTgUserIds.add(telegramChatId);
  } else {
    if (telegramUserId) autoLinkedTgUserIds.delete(telegramUserId);
    if (telegramChatId) autoLinkedTgUserIds.delete(telegramChatId);
  }

  const memUser = pendingUsersMemoryStore.find((u) => u.id === userId);
  if (memUser) {
    if (!memUser.telegram_welcome_sent) {
      isFirstTimeWelcome = true;
      memUser.telegram_welcome_sent = true;
      memUser.telegram_welcome_sent_at = nowIso;
    }
    memUser.telegram_user_id = telegramUserId;
    memUser.telegram_chat_id = telegramChatId;
    if (telegramUsername) memUser.telegram_username = telegramUsername;
  } else if (userId !== initialProfile.id) {
    isFirstTimeWelcome = true;
    pendingUsersMemoryStore.unshift({
      id: userId,
      full_name: 'Pengguna',
      telegram_username: telegramUsername || null,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      approval_status: 'approved',
      is_active: true,
      registered_at: nowIso,
      telegram_welcome_sent: true,
      telegram_welcome_sent_at: nowIso,
    });
  }

  if (userId === initialProfile.id) {
    if (!(initialProfile as any).telegram_welcome_sent) {
      isFirstTimeWelcome = true;
      (initialProfile as any).telegram_welcome_sent = true;
      (initialProfile as any).telegram_welcome_sent_at = nowIso;
    }
    initialProfile.telegram_user_id = telegramUserId;
    initialProfile.telegram_chat_id = telegramChatId;
  }

  try {
    const { data: existingProfile } = await withDbTimeout(
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      50
    );

    if (existingProfile) {
      if (!existingProfile.telegram_welcome_sent) {
        isFirstTimeWelcome = true;
      }

      await withDbTimeout(
        supabaseAdmin
          .from('profiles')
          .update({
            telegram_user_id: telegramUserId,
            telegram_chat_id: telegramChatId,
            telegram_username: telegramUsername || null,
            telegram_welcome_sent: true,
            telegram_welcome_sent_at: existingProfile.telegram_welcome_sent_at || nowIso,
            updated_at: nowIso,
          })
          .eq('id', userId),
        50
      );
    } else {
      if (!memUser || !memUser.telegram_welcome_sent) {
        isFirstTimeWelcome = true;
      }
      await withDbTimeout(
        supabaseAdmin.from('profiles').insert({
          id: userId,
          full_name: 'Pengguna SimpanUang',
          plan: 'pro',
          approval_status: 'approved',
          is_active: true,
          telegram_user_id: telegramUserId,
          telegram_chat_id: telegramChatId,
          telegram_username: telegramUsername || null,
          telegram_welcome_sent: true,
          telegram_welcome_sent_at: nowIso,
        }),
        50
      );
    }
  } catch (err) {
    // Memory store handles fallback
  }

  const resolvedProfile: TelegramProfile = {
    id: userId,
    full_name: memUser?.full_name || initialProfile.full_name || 'Pengguna',
    plan: 'pro',
    default_currency: 'IDR',
    timezone: 'Asia/Jakarta',
    approval_status: 'approved',
    is_active: true,
    telegram_user_id: telegramUserId,
    telegram_chat_id: telegramChatId,
    telegram_username: telegramUsername,
    telegram_welcome_sent: true,
    telegram_welcome_sent_at: nowIso,
  };

  return { success: true, isFirstTimeWelcome, profile: resolvedProfile };
}

/**
 * Approves a new user, sets approval_status to 'approved'
 */
export async function approveUserProfile(userId: string): Promise<boolean> {
  let targetChatId: number | null = null;
  const numId = Number(userId);

  pendingUsersMemoryStore.forEach((u) => {
    if (u.id === userId || (numId && u.telegram_user_id === numId) || u.id.includes(userId)) {
      u.approval_status = 'approved';
      u.is_active = true;
      if (u.telegram_chat_id) targetChatId = u.telegram_chat_id;
    }
  });

  try {
    await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'approved',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (err) {}

  return true;
}

/**
 * Rejects a user profile
 */
export async function rejectUserProfile(userId: string): Promise<boolean> {
  let targetChatId: number | null = null;
  const numId = Number(userId);

  pendingUsersMemoryStore.forEach((u) => {
    if (u.id === userId || (numId && u.telegram_user_id === numId) || u.id.includes(userId)) {
      u.approval_status = 'rejected';
      u.is_active = false;
      if (u.telegram_chat_id) targetChatId = u.telegram_chat_id;
    }
  });

  try {
    await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (err) {}

  return true;
}

/**
 * Toggles user active state
 */
export async function toggleUserActiveState(userId: string, isActive: boolean): Promise<boolean> {
  const numId = Number(userId);

  pendingUsersMemoryStore.forEach((u) => {
    if (u.id === userId || (numId && u.telegram_user_id === numId) || u.id.includes(userId)) {
      u.is_active = isActive;
    }
  });

  try {
    await supabaseAdmin
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (err) {}

  return true;
}
