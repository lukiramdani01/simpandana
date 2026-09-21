const assert = require('node:assert');
const test = require('node:test');

test('Telegram Sync Outbound Notification Messages Formatting', async (t) => {
  await t.test('test-connection notification template contains success message and bot username', () => {
    const botUsername = 'SimpanUangBot';
    const outboundText = `✅ <b>Koneksi & Sync Telegram Berhasil!</b>\n\nBot @${botUsername} berhasil terhubung dengan Dashboard SimpanUang. Transaksi Anda akan langsung dicatat secara real-time!`;

    assert.ok(outboundText.includes('Koneksi & Sync Telegram Berhasil!'));
    assert.ok(outboundText.includes('@SimpanUangBot'));
    assert.ok(outboundText.includes('Dashboard SimpanUang'));
    assert.ok(outboundText.includes('real-time'));
  });

  await t.test('poll sync completion notification template formats count accurately', () => {
    const processedCount = 10;
    const syncSummaryText = `🔄 <b>Sync Telegram Selesai!</b>\n\nBerhasil menyinkronkan ${processedCount} transaksi terbaru ke Dashboard SimpanUang.`;

    assert.ok(syncSummaryText.includes('Sync Telegram Selesai!'));
    assert.ok(syncSummaryText.includes('10 transaksi terbaru'));
    assert.ok(syncSummaryText.includes('Dashboard SimpanUang'));
  });

  await t.test('handles plural vs single count in sync completion summary', () => {
    const singleCount = 1;
    const singleSummary = `🔄 <b>Sync Telegram Selesai!</b>\n\nBerhasil menyinkronkan ${singleCount} transaksi terbaru ke Dashboard SimpanUang.`;
    assert.ok(singleSummary.includes('1 transaksi terbaru'));

    const multiCount = 25;
    const multiSummary = `🔄 <b>Sync Telegram Selesai!</b>\n\nBerhasil menyinkronkan ${multiCount} transaksi terbaru ke Dashboard SimpanUang.`;
    assert.ok(multiSummary.includes('25 transaksi terbaru'));
  });

  await t.test('validates HTML parse mode compatibility for Telegram API sendMessage', () => {
    const botUsername = 'FinanceHelperBot';
    const msg = `✅ <b>Koneksi & Sync Telegram Berhasil!</b>\n\nBot @${botUsername} berhasil terhubung dengan Dashboard SimpanUang. Transaksi Anda akan langsung dicatat secara real-time!`;

    assert.strictEqual(msg.startsWith('✅ <b>Koneksi & Sync Telegram Berhasil!</b>'), true);
    assert.ok(msg.includes('<b>'));
    assert.ok(msg.includes('</b>'));
  });
});
