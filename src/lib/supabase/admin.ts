import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

class DummyTransport {}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tatadana-local.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key-tatadana';

  const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();
    const isMockUrl = urlStr.includes('tatadana-local.supabase.co');
    const timeoutMs = isMockUrl ? 300 : 3000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const mergedOptions: RequestInit = {
      ...options,
      signal: options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal,
    };

    return fetch(url, mergedOptions).finally(() => clearTimeout(timeoutId));
  };

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: customFetch,
    },
    realtime: {
      transport: typeof WebSocket !== 'undefined' ? WebSocket : (DummyTransport as any),
    },
  });
}

// Singleton for server-side endpoints, crons, and background webhook processing
export const supabaseAdmin = createAdminClient();
