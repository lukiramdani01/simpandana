import { OmnichannelInboundMessage, OmnichannelOutboundResponse, OmnichannelTrace } from './types';
import { recordOmnichannelTrace } from './traceStore';
import { parseIndonesianNominal } from '@/lib/parser/nominal';
import { executeAIRouter } from '@/lib/ai/router';
import { recordTransactionInStore } from '@/lib/transactionsStore';
import { initialProfile, initialWallets, initialCategories } from '@/lib/mock-data';
import { formatRupiah, getWIBDateString } from '@/lib/telegram/formatter';
import { realtimeEventBus } from '@/lib/realtime/eventBus';
import { normalizeIndonesianPhone } from '@/lib/auth/phone';

export async function processOmnichannelMessage(
  msg: OmnichannelInboundMessage
): Promise<OmnichannelOutboundResponse> {
  const t0 = performance.now();
  const traceId = `omni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const text = (msg.text || '').trim();

  // 1. Identify User
  let activeUserId = initialProfile.id || 'usr-101';
  let activeUserName = initialProfile.full_name || 'Luki Ramdani';

  if (msg.channel === 'whatsapp') {
    const rawSender = msg.sender?.phone || msg.sender?.id || '';
    const normalized = normalizeIndonesianPhone(rawSender);
    if (normalized && initialProfile.phone && normalizeIndonesianPhone(initialProfile.phone) === normalized) {
      activeUserId = initialProfile.id;
      activeUserName = initialProfile.full_name;
    }
  } else if (msg.channel === 'telegram') {
    if (msg.sender?.id && String(initialProfile.telegram_user_id) === String(msg.sender.id)) {
      activeUserId = initialProfile.id;
      activeUserName = initialProfile.full_name;
    }
  }

  // Handle empty text
  if (!text) {
    const latency = Math.round(performance.now() - t0);
    const trace: OmnichannelTrace = {
      id: traceId,
      traceId,
      channel: msg.channel,
      senderId: msg.sender?.id || 'unknown',
      senderName: msg.sender?.name || activeUserName,
      rawText: '[Pesan Kosong]',
      latencyMs: latency,
      status: 'FAILED',
      processedAt: new Date().toISOString(),
      replySnippet: 'Pesan kosong tidak dapat diproses',
    };
    recordOmnichannelTrace(trace);
    return {
      ok: false,
      channel: msg.channel,
      recipientId: msg.sender?.id || '',
      replyText: '⚠️ Mohon kirimkan catatan transaksi, contoh: "Makan siang 25rb pakai BCA".',
      latencyMs: latency,
      traceId,
      error: 'Empty text payload',
    };
  }

  // 2. Parse Natural Language Transaction
  let parsedAmount = 0;
  let parsedType: 'income' | 'expense' | 'transfer' = 'expense';
  let parsedNotes = text;
  let parsedCategoryHint: string | undefined = undefined;
  let isAmbiguous = false;

  const nominalResult = parseIndonesianNominal(text);

  if (nominalResult && !nominalResult.isAmbiguous && nominalResult.amount > 0) {
    parsedAmount = nominalResult.amount;
    parsedType = nominalResult.type;
    parsedNotes = nominalResult.notes || text;
    parsedCategoryHint = nominalResult.categoryHint;
  } else {
    // Fallback to AI Router
    try {
      const aiResponse = await executeAIRouter({
        type: 'text',
        content: text,
        userId: activeUserId,
        isPro: true,
      });
      if (aiResponse.result && aiResponse.result.amount > 0 && !aiResponse.result.isAmbiguous) {
        parsedAmount = aiResponse.result.amount;
        parsedType = aiResponse.result.type;
        parsedNotes = aiResponse.result.notes || text;
        parsedCategoryHint = aiResponse.result.categoryHint;
      } else {
        isAmbiguous = true;
      }
    } catch {
      isAmbiguous = true;
    }
  }

  if (isAmbiguous || parsedAmount <= 0) {
    const latency = Math.round(performance.now() - t0);
    const trace: OmnichannelTrace = {
      id: traceId,
      traceId,
      channel: msg.channel,
      senderId: msg.sender?.id || 'unknown',
      senderName: msg.sender?.name || activeUserName,
      rawText: text,
      parsedType: 'ambiguous',
      latencyMs: latency,
      status: 'AMBIGUOUS',
      processedAt: new Date().toISOString(),
      replySnippet: 'Format tidak teridentifikasi',
    };
    recordOmnichannelTrace(trace);

    return {
      ok: false,
      channel: msg.channel,
      recipientId: msg.sender?.id || '',
      replyText:
        '❓ Maaf, kami belum mengenali nominal transaksi Anda.\nContoh format yang didukung:\n• "Beli makan siang 25rb"\n• "Bensin motor 30k pakai Cash"\n• "Gaji freelance 2.5jt"',
      latencyMs: latency,
      traceId,
      error: 'Ambiguous nominal format',
    };
  }

  // 3. Resolve Wallet & Category
  const lowerText = text.toLowerCase();
  const matchedWallet =
    initialWallets.find((w) => lowerText.includes(w.name.toLowerCase())) ||
    initialWallets.find((w) => lowerText.includes(w.type.toLowerCase())) ||
    initialWallets.find((w) => w.is_default) ||
    initialWallets[0];

  const catHint = (parsedCategoryHint || '').toLowerCase();
  const matchedCategory =
    initialCategories.find((c) => catHint && c.name.toLowerCase().includes(catHint)) ||
    initialCategories.find((c) => lowerText.includes(c.name.toLowerCase())) ||
    initialCategories.find((c) => c.type === parsedType) ||
    initialCategories[0];

  // 4. Record Transaction in Store & Trigger Real-Time Sync
  const txSource = `omnichannel_${msg.channel}`;
  const recordResult = await recordTransactionInStore({
    userId: activeUserId,
    walletId: matchedWallet.id,
    walletName: matchedWallet.name,
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    categoryIcon: matchedCategory.icon,
    type: parsedType,
    amount: parsedAmount,
    notes: parsedNotes,
    source: txSource,
  });

  // Broadcast realtime event for instant dashboard reactive updates
  realtimeEventBus.emit('transaction_created', {
    transaction: recordResult.transaction,
    channel: msg.channel,
    source: txSource,
  });

  const latency = Math.round(performance.now() - t0);

  // 5. Format Channel-Specific Reply
  const formattedAmount = `Rp ${formatRupiah(parsedAmount)}`;
  const typeLabel = parsedType === 'income' ? 'Pemasukan' : 'Pengeluaran';
  const typeIcon = parsedType === 'income' ? '💰' : '💸';

  let replyText = '';
  if (msg.channel === 'whatsapp') {
    replyText =
      `✅ *Transaksi Berhasil Dicatat!*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${typeIcon} *${typeLabel}:* ${formattedAmount}\n` +
      `📁 *Kategori:* ${matchedCategory.name} ${matchedCategory.icon}\n` +
      `💳 *Dompet:* ${matchedWallet.name}\n` +
      `📝 *Catatan:* ${parsedNotes}\n` +
      `📅 *Waktu:* ${getWIBDateString(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Sisa Saldo ${matchedWallet.name}:* Rp ${formatRupiah(recordResult.balanceAfter)}\n` +
      `_Tersinkronisasi langsung ke Dashboard SimpanDana_`;
  } else {
    replyText =
      `✅ Berhasil mencatat ${typeLabel.toLowerCase()} sebesar ${formattedAmount} ke kategori ${matchedCategory.name} (${matchedWallet.name}). Saldo akhir: Rp ${formatRupiah(recordResult.balanceAfter)}.`;
  }

  // 6. Record Trace
  const trace: OmnichannelTrace = {
    id: traceId,
    traceId,
    channel: msg.channel,
    senderId: msg.sender?.id || 'unknown',
    senderName: msg.sender?.name || activeUserName,
    rawText: text,
    parsedType,
    parsedAmount,
    parsedCategory: matchedCategory.name,
    parsedWallet: matchedWallet.name,
    transactionId: recordResult.transaction.id,
    latencyMs: latency,
    status: 'SUCCESS',
    processedAt: new Date().toISOString(),
    replySnippet: replyText.substring(0, 100),
  };
  recordOmnichannelTrace(trace);

  return {
    ok: true,
    channel: msg.channel,
    recipientId: msg.sender?.id || '',
    replyText,
    transaction: recordResult.transaction,
    walletBalanceAfter: recordResult.balanceAfter,
    latencyMs: latency,
    traceId,
  };
}
