import { supabaseAdmin } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto';
import fs from 'node:fs';
import path from 'node:path';

declare global {
  var __activeTelegramBotToken__: string | undefined;
}

let activeMemoryBotToken: string | null = globalThis.__activeTelegramBotToken__ || null;

const TOKEN_CACHE_FILE = path.join(process.cwd(), '.telegram_token');
const DEFAULT_FALLBACK_TOKEN = '8654593052:AAHYmsoxY6z7VjoPzuicpCUBeljsGagjUVE';

function readPersistentDiskToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const saved = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8').trim();
      if (saved && !saved.startsWith('mock-')) {
        return saved;
      }
    }
  } catch {
    // Disk read fallback
  }
  return null;
}

function writePersistentDiskToken(token: string) {
  try {
    if (token && typeof token === 'string' && token.trim() && !token.startsWith('mock-')) {
      fs.writeFileSync(TOKEN_CACHE_FILE, token.trim(), 'utf8');
    }
  } catch {
    // Disk write fallback
  }
}

export function setActiveBotToken(token: string | null | undefined) {
  if (token && typeof token === 'string' && token.trim()) {
    const clean = token.trim();
    if (!clean.startsWith('mock-')) {
      activeMemoryBotToken = clean;
      globalThis.__activeTelegramBotToken__ = clean;
      writePersistentDiskToken(clean);
    }
  }
}

export function getActiveBotTokenMemory(): string | null {
  return activeMemoryBotToken || globalThis.__activeTelegramBotToken__ || readPersistentDiskToken();
}

export async function resolveActiveBotToken(preferredToken?: string | null): Promise<string | null> {
  // 1. Preferred token if valid and non-mock
  if (preferredToken && typeof preferredToken === 'string' && preferredToken.trim()) {
    const clean = preferredToken.trim();
    if (!clean.startsWith('mock-')) {
      setActiveBotToken(clean);
      return clean;
    }
  }

  // 2. Active memory token if non-mock
  const memoryToken = activeMemoryBotToken || globalThis.__activeTelegramBotToken__;
  if (memoryToken && !memoryToken.startsWith('mock-')) {
    setActiveBotToken(memoryToken);
    return memoryToken;
  }

  // 3. Environment variable if non-mock
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken && !envToken.startsWith('mock-') && envToken.trim()) {
    setActiveBotToken(envToken.trim());
    return envToken.trim();
  }

  // 4. Disk cached token if non-mock
  const diskToken = readPersistentDiskToken();
  if (diskToken && !diskToken.startsWith('mock-')) {
    setActiveBotToken(diskToken);
    return diskToken;
  }

  // 5. Query DB profile for any non-mock token
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_bot_token')
      .not('telegram_bot_token', 'is', null)
      .limit(1)
      .maybeSingle();

    if (profile?.telegram_bot_token) {
      let decrypted: string | null = null;
      try {
        decrypted = decryptToken(profile.telegram_bot_token);
      } catch {
        decrypted = profile.telegram_bot_token;
      }
      if (decrypted && !decrypted.startsWith('mock-') && decrypted.trim()) {
        setActiveBotToken(decrypted.trim());
        return decrypted.trim();
      }
    }
  } catch {
    // Ignore DB fetch errors
  }

  const fallback = DEFAULT_FALLBACK_TOKEN;
  setActiveBotToken(fallback);
  return fallback;
}

