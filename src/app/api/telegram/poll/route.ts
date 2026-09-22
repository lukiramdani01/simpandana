import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { resolveActiveBotToken, setActiveBotToken } from '@/lib/telegram/tokenStore';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { pendingUsersMemoryStore } from '@/lib/telegram/linking';
import '@/lib/telegram/autoPoller';

let lastProcessedOffset = 0;
let validatedToken: string | null = null;
let webhookClearedToken: string | null = null;

export async function GET(req: NextRequest) {
  return handleTelegramPolling(req);
}

export async function POST(req: NextRequest) {
  return handleTelegramPolling(req);
}

async function handleTelegramPolling(req?: NextRequest) {
  const timestamp = new Date().toISOString();
  let inputToken: string | null = null;
  let isManualNotify = false;

  if (req && req.method === 'POST') {
    try {
      const body = await req.json();
      if (body?.token && typeof body.token === 'string' && body.token.trim()) {
        inputToken = body.token.trim();
        setActiveBotToken(inputToken);
      }
      if (body?.notify === true || body?.manual === true) {
        isManualNotify = true;
      }
    } catch {
      // Request body might be empty
    }
  }

  if (!inputToken && req) {
    const qToken = req.nextUrl?.searchParams?.get('token');
    const hToken = req.headers?.get('x-telegram-bot-token');
    const qNotify = req.nextUrl?.searchParams?.get('notify');
    if (qNotify === 'true') isManualNotify = true;
    if (qToken && qToken.trim()) inputToken = qToken.trim();
    else if (hToken && hToken.trim()) inputToken = hToken.trim();
    if (inputToken) setActiveBotToken(inputToken);
  }

  // 1. Resolve active Telegram Bot Token
  const token = await resolveActiveBotToken(inputToken);

  if (!token || token.startsWith('mock-')) {
    return NextResponse.json({
      ok: false,
      error: 'Token Telegram Bot belum diatur.',
      log: `[${timestamp}] Token Bot Telegram belum dikonfigurasi. Masukkan Token Telegram Bot Anda di Pengaturan > Telegram Bot atau Admin Panel.`,
      processedCount: 0,
    });
  }

  // 2. Validate token with getMe only once per token (cached)
  if (validatedToken !== token) {
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json().catch(() => ({}));
      if (!meData.ok) {
        const desc = meData.description || 'Unauthorized';
        return NextResponse.json({
          ok: false,
          error: `Telegram Bot Token HTTP ${meRes.status}: ${desc}`,
          log: `[${timestamp}] ❌ Token Telegram ('${token.substring(0, 12)}...') ditolak oleh API Telegram: ${JSON.stringify(meData)}\n\n` +
            `Saran Solusi Langkah demi Langkah:\n` +
            `1. Token '${token.substring(0, 15)}...' saat ini di-revoke, expired, atau salah ketik di @BotFather.\n` +
            `2. Buka aplikasi Telegram > cari @BotFather > ketik /mybots > pilih bot Anda > klik 'API Token'.\n` +
            `3. Jika token di-revoke, klik 'Revoke current token' untuk menerbitkan token baru.\n` +
            `4. Salin token baru tersebut dari @BotFather dan tempelkan di kolom Telegram Bot Token.`,
          processedCount: 0,
        });
      }
      validatedToken = token;
    } catch (meErr: any) {
      // Network tolerance
    }
  }

  // 3. Clear webhook if active so getUpdates works on localhost (only once per token)
  if (webhookClearedToken !== token) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
      webhookClearedToken = token;
    } catch {
      // Ignore
    }
  }

  // 4. Call Telegram getUpdates API with minimal timeout for high-speed sub-second polling
  try {
    const targetUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastProcessedOffset + 1}&limit=10&timeout=0`;
    let controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 3000);

    let res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    let data = await res.json().catch(() => null);

    // Dynamic recovery: If Telegram getUpdates returns HTTP 409 or webhook conflict description
    if (!res.ok || (data && !data.ok && (data.error_code === 409 || String(data.description || '').toLowerCase().includes('webhook')))) {
      webhookClearedToken = null;
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
        webhookClearedToken = token;
      } catch {
        // Ignore
      }

      controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 3000);
      res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      data = await res.json().catch(() => null);
    }

    if (!res.ok || !data) {
      const errText = data?.description || 'HTTP request failed';
      return NextResponse.json({
        ok: false,
        error: `Telegram getUpdates HTTP ${res.status}`,
        log: `[${timestamp}] Error dari Telegram API: ${errText}`,
        processedCount: 0,
      });
    }

    if (!data.ok || !Array.isArray(data.result)) {
      return NextResponse.json({
        ok: false,
        error: data.description || 'Gagal mengambil update Telegram',
        log: `[${timestamp}] Telegram getUpdates error: ${JSON.stringify(data)}`,
        processedCount: 0,
      });
    }

    const updates = data.result;
    let processedCount = 0;
    const processedLogs: string[] = [];
    const targetChatIds = new Set<number>();

    // 5. Process each incoming update through Webhook logic
    const reqHost = req?.headers?.get('host');
    const reqOrigin = req?.nextUrl?.origin || (reqHost ? (reqHost.startsWith('http') ? reqHost : `http://${reqHost}`) : null);
    const hostBase = reqOrigin || process.env.WEBHOOK_BASE_URL || 'http://127.0.0.1:3005';

    for (const update of updates) {
      if (typeof update.update_id === 'number') {
        lastProcessedOffset = Math.max(lastProcessedOffset, update.update_id);
      }

      const cId =
        update.message?.chat?.id ||
        update.message?.from?.id ||
        update.edited_message?.chat?.id ||
        update.edited_message?.from?.id ||
        update.channel_post?.chat?.id ||
        update.callback_query?.message?.chat?.id ||
        update.callback_query?.from?.id;

      if (cId && typeof cId === 'number') {
        targetChatIds.add(cId);
      }

      try {
        let webhookRes: Response | null = null;
        const targetWebhookUrl = `${hostBase.replace(/\/$/, '')}/api/telegram/webhook`;

        try {
          webhookRes = await fetch(targetWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-bot-token': token,
            },
            body: JSON.stringify(update),
          });
        } catch (fetchErr: any) {
          // Dual-stack IPv6 / localhost / multi-port resolution fallback
          const fallbackUrls = [
            'http://127.0.0.1:3005/api/telegram/webhook',
            'http://localhost:3005/api/telegram/webhook',
            'http://127.0.0.1:3000/api/telegram/webhook',
            'http://localhost:3000/api/telegram/webhook',
          ].filter((u) => u !== targetWebhookUrl);

          for (const fallbackUrl of fallbackUrls) {
            try {
              webhookRes = await fetch(fallbackUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-telegram-bot-token': token,
                },
                body: JSON.stringify(update),
              });
              if (webhookRes) break;
            } catch {
              // Try next fallback
            }
          }

          if (!webhookRes) throw fetchErr;
        }

        const webhookData = await webhookRes.json();
        processedCount++;
        processedLogs.push(`Update #${update.update_id}: ${webhookData.reply_preview || webhookData.action || 'Diproses'}`);
      } catch (wErr: any) {
        processedLogs.push(`Update #${update.update_id} Error: ${wErr?.message}`);
      }
    }

    // 6. Send sync completed Telegram outbound notification summary ONLY when manually requested
    if (isManualNotify && processedCount > 0 && token && !token.startsWith('mock-')) {
      if (targetChatIds.size === 0) {
        try {
          const { data: dbProfiles } = await supabaseAdmin
            .from('profiles')
            .select('telegram_chat_id, telegram_user_id');
          if (dbProfiles && dbProfiles.length > 0) {
            for (const p of dbProfiles) {
              const id = p.telegram_chat_id || p.telegram_user_id;
              if (id && typeof id === 'number') targetChatIds.add(id);
            }
          }
        } catch {
          // Ignore
        }
        if (typeof pendingUsersMemoryStore !== 'undefined') {
          for (const u of pendingUsersMemoryStore) {
            const id = u.telegram_chat_id || u.telegram_user_id;
            if (id && typeof id === 'number') targetChatIds.add(id);
          }
        }
        if (targetChatIds.size === 0) {
          targetChatIds.add(182938491);
        }
      }

      const syncSummaryText = `🔄 <b>Sync Telegram Selesai!</b>\n\nBerhasil menyinkronkan ${processedCount} transaksi terbaru ke Dashboard SimpanUang.`;

      for (const chatId of Array.from(targetChatIds)) {
        try {
          const syncNotifyCtrl = new AbortController();
          const syncNotifyTimeout = setTimeout(() => syncNotifyCtrl.abort(), 5000);

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: syncSummaryText,
              parse_mode: 'HTML',
            }),
            signal: syncNotifyCtrl.signal,
          });
          clearTimeout(syncNotifyTimeout);
        } catch (syncNotifyErr: any) {
          console.warn('[Telegram Poll Outbound Sync Notice Error]', syncNotifyErr?.message);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      botToken: `${token.substring(0, 10)}...`,
      updatesReceived: updates.length,
      processedCount,
      logs: processedLogs,
      message: updates.length > 0
        ? `Berhasil memproses ${processedCount} pesan baru dari Telegram!`
        : 'Tidak ada pesan baru di Telegram. Silakan ketik pesan transaksi di aplikasi Telegram Anda.',
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Polling error',
      log: `[${timestamp}] Polling Exception: ${err?.stack || err?.message}`,
      processedCount: 0,
    });
  }
}
