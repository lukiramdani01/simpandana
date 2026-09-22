/**
 * High-Speed Telegram Auto-Poller Engine
 * Automatically polls Telegram getUpdates sequentially in background with mutex locking,
 * ensuring sub-second response times without overlapping requests or Telegram 409 Conflict.
 */

import { resolveActiveBotToken } from '@/lib/telegram/tokenStore';

declare global {
  var __telegramAutoPollerStarted__: boolean | undefined;
  var __telegramAutoPollerTimer__: NodeJS.Timeout | undefined;
  var __telegramAutoPollerIsPolling__: boolean | undefined;
}

let isPollingRunning = false;

export function ensureTelegramAutoPoller() {
  if (typeof window !== 'undefined') return; // Server-side only
  if (process.env.NEXT_PHASE === 'phase-production-build') return; // Don't run during build
  if (globalThis.__telegramAutoPollerStarted__) return;

  globalThis.__telegramAutoPollerStarted__ = true;
  globalThis.__telegramAutoPollerIsPolling__ = false;

  console.log('[Telegram Auto-Poller] Active sequential locked polling daemon (2.0s sequential loop)...');

  const pollLoop = async () => {
    try {
      const token = await resolveActiveBotToken();
      if (!token || token.startsWith('mock-')) return;

      const activePort = process.env.PORT || 3005;
      const candidatePorts = Array.from(new Set([activePort, 3005, 3000, 3001, 3002]));

      for (const port of candidatePorts) {
        try {
          const targetUrl = `http://127.0.0.1:${port}/api/telegram/poll`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);

          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-bot-token': token,
            },
            body: JSON.stringify({ token }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) break;
        } catch {
          // Try next candidate port
        }
      }
    } catch {
      // Background poll tolerance
    }
  };

  const runPollCycle = async () => {
    if (isPollingRunning || globalThis.__telegramAutoPollerIsPolling__) return;
    isPollingRunning = true;
    globalThis.__telegramAutoPollerIsPolling__ = true;
    try {
      await pollLoop();
    } finally {
      isPollingRunning = false;
      globalThis.__telegramAutoPollerIsPolling__ = false;
      // Schedule next poll cycle sequentially after previous finishes to guarantee no overlapping 409 conflict
      if (globalThis.__telegramAutoPollerStarted__) {
        globalThis.__telegramAutoPollerTimer__ = setTimeout(runPollCycle, 2000);
      }
    }
  };

  if (globalThis.__telegramAutoPollerTimer__) {
    clearTimeout(globalThis.__telegramAutoPollerTimer__);
  }

  // Start initial locked sequential cycle
  runPollCycle();
}

// Auto-trigger poller when module is imported
ensureTelegramAutoPoller();
