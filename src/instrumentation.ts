/**
 * Next.js Server Boot Instrumentation Hook
 * Automatically boots background engines on server startup.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureTelegramAutoPoller } = await import('@/lib/telegram/autoPoller');
    ensureTelegramAutoPoller();
  }
}
