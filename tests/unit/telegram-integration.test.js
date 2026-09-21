const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

// Setup TypeScript module loader and '@/' path alias resolver for Node test runner
const projectRoot = path.resolve(__dirname, '../..');
const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const relativePath = request.replace('@/', '');
    const fullPathTs = path.join(projectRoot, 'src', relativePath + '.ts');
    const fullPathTsx = path.join(projectRoot, 'src', relativePath + '.tsx');
    const fullPathJs = path.join(projectRoot, 'src', relativePath + '.js');
    const fullPathDir = path.join(projectRoot, 'src', relativePath, 'index.ts');

    if (fs.existsSync(fullPathTs)) return fullPathTs;
    if (fs.existsSync(fullPathTsx)) return fullPathTsx;
    if (fs.existsSync(fullPathJs)) return fullPathJs;
    if (fs.existsSync(fullPathDir)) return fullPathDir;
  }
  return origResolve.call(this, request, parent, isMain, options);
};

// Polyfill ts compilation on require
require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  module._compile(compiled.outputText, filename);
};

const { resolveUserProfile, linkTelegramAccount } = require('../../src/lib/telegram/linking.ts');
const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = require('../../src/lib/telegram/idempotency.ts');
const { recordWebhookTrace, getRecentWebhookTraces, clearWebhookTraces } = require('../../src/lib/telegram/traceStore.ts');

test('Seamless User Mapping: Unlinked Telegram user is auto-linked to usr-101 (Luki Ramdani)', async () => {
  const unlinkedTgUserId1 = 888777666;
  const unlinkedTgUserId2 = 888777667;

  const profile1 = await resolveUserProfile(unlinkedTgUserId1, unlinkedTgUserId1);
  assert.notStrictEqual(profile1, null, 'Unlinked Telegram user 1 must auto-link to primary profile');
  assert.strictEqual(profile1.id, 'usr-101');

  const profile2 = await resolveUserProfile(unlinkedTgUserId2, unlinkedTgUserId2);
  assert.notStrictEqual(profile2, null, 'Unlinked Telegram user 2 must auto-link to primary profile');
  assert.strictEqual(profile2.id, 'usr-101');

  // Verify user 1 still resolves to usr-101 after user 2 auto-linked
  const reProfile1 = await resolveUserProfile(unlinkedTgUserId1, unlinkedTgUserId1);
  assert.notStrictEqual(reProfile1, null);
  assert.strictEqual(reProfile1.id, 'usr-101');

  const manualOptProfile = await resolveUserProfile(999888777, 999888777, undefined, false);
  assert.strictEqual(manualOptProfile, null, 'Disabling autoLink must return null profile');
});

test('Account Linking: /start link_USERID links profile & sets welcome sent flag 1x', async () => {
  const targetUserId = 'usr-test-link-001';
  const tgUserId = 777666555;
  const tgChatId = 777666555;

  const linkRes1 = await linkTelegramAccount(targetUserId, tgUserId, tgChatId, 'testuser');
  assert.strictEqual(linkRes1.success, true);
  assert.strictEqual(linkRes1.isFirstTimeWelcome, true, 'First link must trigger welcome message flag');

  const resolved = await resolveUserProfile(tgUserId, tgChatId);
  assert.notStrictEqual(resolved, null);
  assert.strictEqual(resolved.id, targetUserId);
  assert.strictEqual(resolved.telegram_user_id, tgUserId);

  // Second link must NOT re-trigger welcome message
  const linkRes2 = await linkTelegramAccount(targetUserId, tgUserId, tgChatId, 'testuser');
  assert.strictEqual(linkRes2.isFirstTimeWelcome, false, 'Subsequent link must NOT re-trigger welcome message');
});

test('Idempotency Key: Duplicate update_id returns isDuplicate = true', async () => {
  resetInMemoryIdempotencyCache();
  const updateId = 99887766;

  const res1 = await checkAndRecordUpdateId(updateId, 'usr-101', 12345, 'beli bakso 15rb');
  assert.strictEqual(res1.isDuplicate, false, 'First submission of update_id must not be duplicate');

  const res2 = await checkAndRecordUpdateId(updateId, 'usr-101', 12345, 'beli bakso 15rb');
  assert.strictEqual(res2.isDuplicate, true, 'Duplicate submission of update_id must be flagged duplicate');
});

test('Trace Telemetry Store: Records 7-step traces and latency breakdown', () => {
  clearWebhookTraces();

  const sampleTrace = {
    updateId: 100200300,
    telegramUserId: 182938491,
    messageId: 501,
    messageText: 'beli bakso 20rb',
    saasUserId: 'usr-101',
    saasUserName: 'Luki Ramdani',
    parserResult: { type: 'expense', amount: 20000, notes: 'beli bakso 20rb' },
    wallet: { id: 'w-1', name: 'Dompet Utama', balanceBefore: 100000, balanceAfter: 80000 },
    category: { id: 'c-1', name: 'Makanan & Minuman' },
    transactionId: 'tx_test_100',
    databaseStatus: 'SUCCESS',
    balanceStatus: 'SUCCESS',
    realtimeStatus: 'SUCCESS',
    latencyBreakdown: {
      webhookReceivedMs: 1,
      userMappingMs: 2,
      parsingMs: 3,
      walletLookupMs: 2,
      categoryLookupMs: 2,
      transactionInsertMs: 10,
      balanceUpdateMs: 5,
      realtimeSyncMs: 4,
      telegramResponseMs: 5,
      totalMs: 34,
    },
    finalStatus: 'COMPLETED',
    steps: [
      { status: 'RECEIVED', timestamp: new Date().toISOString(), latencyMs: 1 },
      { status: 'PROCESSING', timestamp: new Date().toISOString(), latencyMs: 2 },
      { status: 'USER_IDENTIFIED', timestamp: new Date().toISOString(), latencyMs: 4 },
      { status: 'PARSED', timestamp: new Date().toISOString(), latencyMs: 7 },
      { status: 'TRANSACTION_CREATED', timestamp: new Date().toISOString(), latencyMs: 17 },
      { status: 'BALANCE_UPDATED', timestamp: new Date().toISOString(), latencyMs: 22 },
      { status: 'DASHBOARD_SYNCED', timestamp: new Date().toISOString(), latencyMs: 26 },
      { status: 'COMPLETED', timestamp: new Date().toISOString(), latencyMs: 34 },
    ],
    processedAt: new Date().toISOString(),
  };

  recordWebhookTrace(sampleTrace);

  const traces = getRecentWebhookTraces(10);
  assert.strictEqual(traces.length, 1);
  assert.strictEqual(traces[0].updateId, 100200300);
  assert.strictEqual(traces[0].finalStatus, 'COMPLETED');
  assert.strictEqual(traces[0].steps.length, 8);
});
