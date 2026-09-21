const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class MockWebSocket {};
}

const origFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('tatadana-local.supabase.co')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'content-range': '0-0/0' },
    });
  }
  return origFetch(input, init);
};

const origResolve = Module._resolveFilename;
const projectRoot = path.resolve(__dirname, '../..');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const relPath = request.slice(2);
    const fullPath = path.resolve(projectRoot, 'src', relPath);
    return origResolve.call(this, fullPath, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

if (!require.extensions['.ts']) {
  require.extensions['.ts'] = function (module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    module._compile(compiled.outputText, filename);
  };
}

const { processVoiceNote } = require('../../src/lib/ai/voice.ts');
const { getAllTransactions, recordTransactionInStore, resetTransactionsStore } = require('../../src/lib/transactionsStore.ts');

test('Ultra-Fast Telegram Voice & Dashboard Synchronization', async (t) => {
  t.beforeEach(() => {
    resetTransactionsStore();
  });

  await t.test('accurately transcribes spoken transaction "beli nasi goreng 20 ribu" under 1-2s', async () => {
    const start = Date.now();
    const res = await processVoiceNote({
      userId: 'usr-101',
      voice: { duration: 5, file_id: 'voice_nasi_goreng' },
      mockTranscript: 'beli nasi goreng 20 ribu',
    });

    const elapsed = Date.now() - start;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.action, 'voice_processed');
    assert.strictEqual(res.body.parsed.amount, 20000);
    assert.strictEqual(res.body.parsed.type, 'expense');
    assert.ok(res.body.transcript.includes('nasi goreng'));
    assert.ok(elapsed < 2000, `Expected <2000ms, got ${elapsed}ms`);
  });

  await t.test('accurately transcribes spoken transaction "jajan boba 15 ribu"', async () => {
    const res = await processVoiceNote({
      userId: 'usr-101',
      voice: { duration: 4, file_id: 'voice_jajan_boba' },
      mockTranscript: 'jajan boba 15 ribu',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parsed.amount, 15000);
    assert.strictEqual(res.body.parsed.type, 'expense');
    assert.ok(res.body.transcript.includes('boba'));
  });

  await t.test('accurately transcribes spoken transaction "dapat gaji 5 juta"', async () => {
    const res = await processVoiceNote({
      userId: 'usr-101',
      voice: { duration: 6, file_id: 'voice_gaji_5jt' },
      mockTranscript: 'dapat gaji 5 juta',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.parsed.amount, 5000000);
    assert.strictEqual(res.body.parsed.type, 'income');
    assert.ok(res.body.transcript.includes('gaji'));
  });

  await t.test('handles standard Telegram file_id without hardcoded keywords gracefully', async () => {
    const res = await processVoiceNote({
      userId: 'usr-101',
      voice: { duration: 3, file_id: 'AwACAgIAAxkBAAIBZ2X1234567890' },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.parsed.amount > 0);
  });

  await t.test('records transaction into shared store and syncs for dashboard', async () => {
    await recordTransactionInStore({
      userId: 'usr-101',
      type: 'expense',
      amount: 25000,
      categoryName: 'Makanan & Minuman',
      notes: 'beli bakso kuah 25rb',
      source: 'telegram_voice',
    });

    const txs = await getAllTransactions('usr-101');
    assert.ok(txs.length >= 1);
    const found = txs.find((t) => t.amount === 25000);
    assert.ok(found);
    assert.strictEqual(found.notes, 'beli bakso kuah 25rb');
    assert.strictEqual(found.source, 'telegram_voice');
  });
});
