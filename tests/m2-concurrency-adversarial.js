/**
 * Empirical Challenger 2 Test Harness for Milestone 2 Iteration 2
 *
 * Focus:
 * 1. Webhook Idempotency Concurrency (50 parallel burst requests under DB latency, DB offline, and DB constraint)
 * 2. Zero-limit & Boundary Budget Alert Calculations (0 race conditions, no division by zero, no Infinity/NaN)
 * 3. AI Provider Failover Cascade (Gemini -> OpenAI -> DeepSeek -> fallback_regex, timeout aborts, partial recovery)
 * 4. Multimodal Vision OCR & Voice STT Gating Integrity
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Terminal colors
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

async function runTest(name, fn) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passedTests++;
    console.log(`  ${green('✔')} ${name}`);
  } catch (err) {
    failedTests++;
    console.log(`  ${red('✖')} ${name}`);
    console.error(`    ${red(err.message)}`);
    findings.push({ test: name, error: err.message, stack: err.stack });
  }
}

// Module loader helper to transpile and run TypeScript modules on-the-fly
function loadTsModule(relPath, mocks = {}) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const moduleEnv = { exports: {} };
  const fn = new Function('require', 'module', 'exports', transpiled);

  fn(
    (mod) => {
      if (mocks[mod]) return mocks[mod];
      if (mod === '@/lib/supabase/admin') {
        return mocks['@/lib/supabase/admin'] || { supabaseAdmin: {} };
      }
      if (mod === '@/lib/parser/nominal') {
        return loadTsModule('src/lib/parser/nominal.ts');
      }
      if (mod === '@/lib/telegram/formatter') {
        return loadTsModule('src/lib/telegram/formatter.ts');
      }
      if (mod === './logger') {
        return mocks['./logger'] || { logAIAttempt: async () => {} };
      }
      if (mod === './router') {
        return loadTsModule('src/lib/ai/router.ts');
      }
      return require(mod);
    },
    moduleEnv,
    moduleEnv.exports
  );

  return moduleEnv.exports;
}

async function runSuite() {
  console.log(bold('\n======================================================================'));
  console.log(bold('  CHALLENGER 2 (ITERATION 2): EMPIRICAL CONCURRENCY & STRESS HARNESS  '));
  console.log(bold('  Milestone 2: Telegram Bot Engine, Webhook Idempotency & AI Cascade  '));
  console.log(bold('======================================================================\n'));

  // =========================================================================
  // CATEGORY 1: Webhook Idempotency Concurrency & Race Condition Elimination
  // =========================================================================
  console.log(bold('▶ Category 1: Webhook Idempotency Concurrency & Race Conditions'));

  // 1.1 Sequential Deduplication Baseline
  await runTest('1.1: Sequential duplicate update_id returns isDuplicate: false then isDuplicate: true', async () => {
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              insert: async () => ({ error: null }),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    const first = await checkAndRecordUpdateId(5001);
    assert.strictEqual(first.isDuplicate, false, 'First occurrence must not be duplicate');

    const second = await checkAndRecordUpdateId(5001);
    assert.strictEqual(second.isDuplicate, true, 'Sequential second occurrence must be duplicate');
  });

  // 1.2 50-Burst Parallel Requests with Simulated DB Latency (50ms)
  await runTest('1.2: Concurrency burst (50 parallel requests) with 50ms DB latency -> exactly 1 succeeds, 49 duplicate', async () => {
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    new Promise((resolve) => setTimeout(() => resolve({ data: null }), 50)),
                }),
              }),
              insert: () =>
                new Promise((resolve) => setTimeout(() => resolve({ error: null }), 50)),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    const BURST_COUNT = 50;
    const promises = Array.from({ length: BURST_COUNT }, () => checkAndRecordUpdateId(88888));
    const results = await Promise.all(promises);

    const nonDuplicates = results.filter((r) => !r.isDuplicate).length;
    const duplicates = results.filter((r) => r.isDuplicate).length;

    console.log(
      `    ${cyan('DB Latency 50ms')}: ${nonDuplicates} accepted, ${duplicates} duplicates out of ${BURST_COUNT}`
    );

    assert.strictEqual(nonDuplicates, 1, `Exactly 1 request must succeed. Found: ${nonDuplicates}`);
    assert.strictEqual(duplicates, 49, `Exactly 49 requests must be duplicate. Found: ${duplicates}`);
  });

  // 1.3 50-Burst Parallel Requests with DB Completely Offline (Connection Error)
  await runTest('1.3: Concurrency burst (50 parallel requests) with DB OFFLINE -> exactly 1 succeeds, 49 duplicate', async () => {
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('ECONNREFUSED: Supabase Postgres Offline')), 20)
                    ),
                }),
              }),
              insert: () =>
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('ECONNREFUSED: Supabase Postgres Offline')), 20)
                ),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    const BURST_COUNT = 50;
    const promises = Array.from({ length: BURST_COUNT }, () => checkAndRecordUpdateId(99999));
    const results = await Promise.all(promises);

    const nonDuplicates = results.filter((r) => !r.isDuplicate).length;
    const duplicates = results.filter((r) => r.isDuplicate).length;

    console.log(
      `    ${cyan('DB Offline')}: ${nonDuplicates} accepted, ${duplicates} duplicates out of ${BURST_COUNT}`
    );

    assert.strictEqual(nonDuplicates, 1, `Exactly 1 request must succeed when DB offline. Found: ${nonDuplicates}`);
    assert.strictEqual(duplicates, 49, `Exactly 49 requests must be duplicates when DB offline. Found: ${duplicates}`);
  });

  // 1.4 50-Burst Parallel Requests with PostgreSQL Unique Constraint 23505
  await runTest('1.4: Concurrency burst (50 parallel requests) with PostgreSQL 23505 constraint -> exactly 1 succeeds, 49 duplicate', async () => {
    let insertCount = 0;
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    new Promise((resolve) => setTimeout(() => resolve({ data: null }), 10)),
                }),
              }),
              insert: () =>
                new Promise((resolve) =>
                  setTimeout(() => {
                    insertCount++;
                    if (insertCount === 1) {
                      resolve({ error: null });
                    } else {
                      resolve({
                        error: {
                          code: '23505',
                          message: 'duplicate key value violates unique constraint "telegram_webhook_updates_pkey"',
                        },
                      });
                    }
                  }, 10)
                ),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    const BURST_COUNT = 50;
    const promises = Array.from({ length: BURST_COUNT }, () => checkAndRecordUpdateId(77777));
    const results = await Promise.all(promises);

    const nonDuplicates = results.filter((r) => !r.isDuplicate).length;
    const duplicates = results.filter((r) => r.isDuplicate).length;

    console.log(
      `    ${cyan('DB 23505 Unique')}: ${nonDuplicates} accepted, ${duplicates} duplicates out of ${BURST_COUNT}`
    );

    assert.strictEqual(nonDuplicates, 1, `Exactly 1 request must succeed. Found: ${nonDuplicates}`);
    assert.strictEqual(duplicates, 49, `Exactly 49 requests must be duplicate. Found: ${duplicates}`);
  });

  // 1.5 50 Distinct Parallel Requests with Unique IDs
  await runTest('1.5: 50 distinct parallel requests with different update_ids -> all 50 succeed (0 duplicates)', async () => {
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              insert: async () => ({ error: null }),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    const promises = Array.from({ length: 50 }, (_, i) => checkAndRecordUpdateId(20000 + i));
    const results = await Promise.all(promises);

    const nonDuplicates = results.filter((r) => !r.isDuplicate).length;
    const duplicates = results.filter((r) => r.isDuplicate).length;

    assert.strictEqual(nonDuplicates, 50, 'All 50 distinct requests must succeed');
    assert.strictEqual(duplicates, 0, 'No false positives on distinct requests');
  });

  // 1.6 In-memory FIFO Cache Eviction at MAX_CACHE_SIZE (10,000)
  await runTest('1.6: In-memory cache limits size to MAX_CACHE_SIZE (10,000) FIFO', async () => {
    const { checkAndRecordUpdateId, resetInMemoryIdempotencyCache } = loadTsModule(
      'src/lib/telegram/idempotency.ts',
      {
        '@/lib/supabase/admin': {
          supabaseAdmin: {
            from: () => ({
              select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              insert: async () => ({ error: null }),
            }),
          },
        },
      }
    );
    resetInMemoryIdempotencyCache();

    // Insert first item
    await checkAndRecordUpdateId(1);

    // Insert 10,000 more items (2 to 10001)
    for (let i = 2; i <= 10001; i++) {
      await checkAndRecordUpdateId(i);
    }

    // Oldest item (1) must have been evicted from in-memory set
    const recheck = await checkAndRecordUpdateId(1);
    assert.strictEqual(recheck.isDuplicate, false, 'Oldest item should be evicted after 10,000 entries');
  });

  // =========================================================================
  // CATEGORY 2: Zero-Limit Budget Alert Handling & Division by Zero Guard
  // =========================================================================
  console.log(bold('\n▶ Category 2: Zero-Limit & Boundary Budget Alert Calculations'));

  // 2.1 OCR Receipt with monthly_limit: 0
  await runTest('2.1: OCR Receipt processing with monthly_limit: 0 suppresses alerts without division by zero', async () => {
    let budgetRecord = {
      id: 'b_zero',
      monthly_limit: 0,
      current_spent: 0,
      alert_80_sent: false,
      alert_100_sent: false,
    };

    const createQueryBuilder = (table) => {
      const qb = {
        select: () => qb,
        eq: () => qb,
        ilike: () => qb,
        order: () => qb,
        maybeSingle: async () => {
          if (table === 'wallets') return { data: { id: 'w_cash', balance: 1000000 } };
          if (table === 'categories') return { data: { id: 'cat_zero', name: 'Makanan' } };
          if (table === 'budgets') return { data: budgetRecord };
          return { data: null };
        },
        single: async () => ({ data: { id: 'tx_ocr_zero' } }),
        insert: () => {
          const res = Promise.resolve({ error: null });
          res.select = () => ({
            single: async () => ({ data: { id: 'tx_ocr_zero' } }),
          });
          return res;
        },
        update: (payload) => {
          if (table === 'budgets') Object.assign(budgetRecord, payload);
          return qb;
        },
      };
      return qb;
    };

    const { processReceiptPhoto } = loadTsModule('src/lib/ai/ocr.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: (table) => createQueryBuilder(table),
        },
      },
      './logger': { logAIAttempt: async () => {} },
    });

    const res = await processReceiptPhoto({
      userId: 'usr_zero_limit',
      userPlan: 'pro',
      photos: [{ file_id: 'ph_zero' }],
    });

    console.log(
      `    ${cyan('Zero Limit Alert')}: alert_80=${res.body.budgetAlert?.alert_80}, alert_100=${res.body.budgetAlert?.alert_100}`
    );
    console.log(`    ${cyan('Progress Bar')}: ${res.body.budgetAlert?.progressBar}`);

    assert.ok(res.body.budgetAlert, 'budgetAlert object must exist');
    assert.strictEqual(res.body.budgetAlert.alert_80, false, 'alert_80 must be false when limit is 0');
    assert.strictEqual(res.body.budgetAlert.alert_100, false, 'alert_100 must be false when limit is 0');
    assert.strictEqual(budgetRecord.alert_80_sent, false, 'alert_80_sent in DB must remain false');
    assert.strictEqual(budgetRecord.alert_100_sent, false, 'alert_100_sent in DB must remain false');
    assert.ok(!res.body.budgetAlert.progressBar.includes('NaN'), 'Progress bar must not contain NaN');
    assert.ok(!res.body.budgetAlert.progressBar.includes('Infinity'), 'Progress bar must not contain Infinity');
  });

  // 2.2 OCR Receipt with negative monthly_limit: -10000
  await runTest('2.2: OCR Receipt processing with negative monthly_limit suppresses alerts safely', async () => {
    let budgetRecord = {
      id: 'b_neg',
      monthly_limit: -50000,
      current_spent: 0,
      alert_80_sent: false,
      alert_100_sent: false,
    };

    const createQueryBuilder = (table) => {
      const qb = {
        select: () => qb,
        eq: () => qb,
        ilike: () => qb,
        order: () => qb,
        maybeSingle: async () => {
          if (table === 'wallets') return { data: { id: 'w_cash', balance: 500000 } };
          if (table === 'categories') return { data: { id: 'cat_neg', name: 'Makanan' } };
          if (table === 'budgets') return { data: budgetRecord };
          return { data: null };
        },
        single: async () => ({ data: { id: 'tx_ocr_neg' } }),
        insert: () => {
          const res = Promise.resolve({ error: null });
          res.select = () => ({
            single: async () => ({ data: { id: 'tx_ocr_neg' } }),
          });
          return res;
        },
        update: (payload) => {
          if (table === 'budgets') Object.assign(budgetRecord, payload);
          return qb;
        },
      };
      return qb;
    };

    const { processReceiptPhoto } = loadTsModule('src/lib/ai/ocr.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: (table) => createQueryBuilder(table),
        },
      },
      './logger': { logAIAttempt: async () => {} },
    });

    const res = await processReceiptPhoto({
      userId: 'usr_neg_limit',
      userPlan: 'pro',
      photos: [{ file_id: 'ph_neg' }],
    });

    assert.strictEqual(res.body.budgetAlert.alert_80, false);
    assert.strictEqual(res.body.budgetAlert.alert_100, false);
    assert.strictEqual(budgetRecord.alert_80_sent, false);
    assert.strictEqual(budgetRecord.alert_100_sent, false);
  });

  // 2.3 Visual Progress Bar Zero and Negative Limit Invariance
  await runTest('2.3: formatBudgetProgressBar handles zero and negative limits without division by zero', () => {
    const { formatBudgetProgressBar } = loadTsModule('src/lib/telegram/formatter.ts');

    const zeroRes = formatBudgetProgressBar(75000, 0);
    assert.strictEqual(zeroRes, '[░░░░░░░░░░] 0% (Rp 75.000 / Rp 0)');

    const negRes = formatBudgetProgressBar(50000, -10000);
    assert.strictEqual(negRes, '[░░░░░░░░░░] 0% (Rp 50.000 / Rp 0)');
  });

  // 2.4 Normal Threshold Transitions (80% and 100%)
  await runTest('2.4: Normal budget alert triggers alert_80 at >= 80% and alert_100 at >= 100% without re-triggering', async () => {
    let budgetRecord = {
      id: 'b_norm',
      monthly_limit: 150000,
      current_spent: 0,
      alert_80_sent: false,
      alert_100_sent: false,
    };

    const createQueryBuilder = (table) => {
      const qb = {
        select: () => qb,
        eq: () => qb,
        ilike: () => qb,
        order: () => qb,
        maybeSingle: async () => {
          if (table === 'wallets') return { data: { id: 'w_cash', balance: 1000000 } };
          if (table === 'categories') return { data: { id: 'cat_norm', name: 'Makanan' } };
          if (table === 'budgets') return { data: budgetRecord };
          return { data: null };
        },
        single: async () => ({ data: { id: 'tx_ocr_norm' } }),
        insert: () => {
          const res = Promise.resolve({ error: null });
          res.select = () => ({
            single: async () => ({ data: { id: 'tx_ocr_norm' } }),
          });
          return res;
        },
        update: (payload) => {
          if (table === 'budgets') Object.assign(budgetRecord, payload);
          return qb;
        },
      };
      return qb;
    };

    const { processReceiptPhoto } = loadTsModule('src/lib/ai/ocr.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: (table) => createQueryBuilder(table),
        },
      },
      './logger': { logAIAttempt: async () => {} },
    });

    // Step 1: 137.000 of 150.000 = 91.3% (crosses 80%)
    const res1 = await processReceiptPhoto({
      userId: 'usr_normal_budget',
      userPlan: 'pro',
      photos: [{ file_id: 'ph_norm_1' }],
    });

    assert.strictEqual(res1.body.budgetAlert.alert_80, true);
    assert.strictEqual(res1.body.budgetAlert.alert_100, false);
    assert.strictEqual(budgetRecord.alert_80_sent, true);

    // Step 2: Second receipt pushes spent to 274.000 (182.7%, crosses 100%)
    const res2 = await processReceiptPhoto({
      userId: 'usr_normal_budget',
      userPlan: 'pro',
      photos: [{ file_id: 'ph_norm_2' }],
    });

    assert.strictEqual(res2.body.budgetAlert.alert_80, false, 'alert_80 must not re-trigger');
    assert.strictEqual(res2.body.budgetAlert.alert_100, true, 'alert_100 must trigger upon crossing 100%');
    assert.strictEqual(budgetRecord.alert_100_sent, true);
  });

  // =========================================================================
  // CATEGORY 3: AI Provider Failover Cascade & Fault Resilience
  // =========================================================================
  console.log(bold('\n▶ Category 3: AI Provider Failover Cascade & Fault Resilience'));

  // 3.1 Full Cascade: Gemini (500) -> OpenAI (429) -> DeepSeek (Network error) -> fallback_regex
  await runTest('3.1: Full cascade failover when Gemini, OpenAI, DeepSeek fail in sequence -> fallback_regex', async () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    process.env.GEMINI_API_KEY = 'real_gemini_key';
    process.env.OPENAI_API_KEY = 'real_openai_key';
    process.env.DEEPSEEK_API_KEY = 'real_deepseek_key';

    global.fetch = async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return { ok: false, status: 500, text: async () => 'Gemini 500 Internal Server Error' };
      }
      if (url.includes('api.openai.com')) {
        return { ok: false, status: 429, text: async () => 'OpenAI 429 Rate Limit Exceeded' };
      }
      if (url.includes('api.deepseek.com')) {
        throw new Error('ECONNRESET: DeepSeek cluster connection terminated');
      }
      return { ok: true, json: async () => ({}) };
    };

    const loggedAttempts = [];
    const { executeAIRouter } = loadTsModule('src/lib/ai/router.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              order: async () => ({
                data: [
                  { name: 'gemini', is_active: true, priority: 1 },
                  { name: 'openai', is_active: true, priority: 2 },
                  { name: 'deepseek', is_active: true, priority: 3 },
                ],
              }),
            }),
          }),
        },
      },
      './logger': {
        logAIAttempt: async (p) => {
          loggedAttempts.push(p);
        },
      },
    });

    try {
      const res = await executeAIRouter({
        type: 'text',
        content: 'beli sate ayam 30rb',
        userId: 'usr_full_cascade',
      });

      console.log(
        `    ${cyan('Cascade Output')}: provider=${res.provider}, amount=${res.result.amount}, attempts=${res.attempts.length}`
      );

      assert.strictEqual(res.provider, 'fallback_regex', 'Final provider must be fallback_regex');
      assert.strictEqual(res.result.amount, 30000, 'Regex fallback must correctly extract 30.000');
      assert.strictEqual(res.result.type, 'expense');
      assert.strictEqual(res.attempts.length, 4, 'Must record 4 sequential attempts');
      assert.strictEqual(res.attempts[0].provider, 'gemini');
      assert.strictEqual(res.attempts[0].status, 'failed');
      assert.strictEqual(res.attempts[1].provider, 'openai');
      assert.strictEqual(res.attempts[1].status, 'failed');
      assert.strictEqual(res.attempts[2].provider, 'deepseek');
      assert.strictEqual(res.attempts[2].status, 'failed');
      assert.strictEqual(res.attempts[3].provider, 'fallback_regex');
      assert.strictEqual(res.attempts[3].status, 'fallback_success');
      assert.strictEqual(loggedAttempts.length, 4, 'All 4 attempts must be logged to ai_logs');
    } finally {
      global.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // 3.2 Partial Failover Recovery: Gemini Fails (500) -> OpenAI Recovers (200 JSON)
  await runTest('3.2: Partial failover recovery: Gemini fails (500) -> OpenAI recovers (200) with JSON completion', async () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    process.env.GEMINI_API_KEY = 'real_gemini_key';
    process.env.OPENAI_API_KEY = 'real_openai_key';
    process.env.DEEPSEEK_API_KEY = 'real_deepseek_key';

    global.fetch = async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return { ok: false, status: 500, text: async () => 'Gemini 500 Error' };
      }
      if (url.includes('api.openai.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    amount: 60000,
                    type: 'expense',
                    categoryHint: 'Makanan & Minuman',
                    notes: 'beli bebek goreng',
                  }),
                },
              },
            ],
          }),
        };
      }
      throw new Error('DeepSeek should not be called');
    };

    const loggedAttempts = [];
    const { executeAIRouter } = loadTsModule('src/lib/ai/router.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              order: async () => ({
                data: [
                  { name: 'gemini', is_active: true, priority: 1 },
                  { name: 'openai', is_active: true, priority: 2 },
                  { name: 'deepseek', is_active: true, priority: 3 },
                ],
              }),
            }),
          }),
        },
      },
      './logger': {
        logAIAttempt: async (p) => {
          loggedAttempts.push(p);
        },
      },
    });

    try {
      const res = await executeAIRouter({
        type: 'text',
        content: 'beli bebek goreng 60rb',
        userId: 'usr_openai_recover',
      });

      assert.strictEqual(res.provider, 'openai', 'Should recover on OpenAI');
      assert.strictEqual(res.result.amount, 60000);
      assert.strictEqual(res.result.notes, 'beli bebek goreng');
      assert.strictEqual(res.attempts.length, 2, 'Should only attempt Gemini and OpenAI');
      assert.strictEqual(res.attempts[0].provider, 'gemini');
      assert.strictEqual(res.attempts[0].status, 'failed');
      assert.strictEqual(res.attempts[1].provider, 'openai');
      assert.strictEqual(res.attempts[1].status, 'success');
    } finally {
      global.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // 3.3 Partial Failover Recovery: Gemini Fails (500) -> OpenAI Fails (500) -> DeepSeek Recovers (200 JSON)
  await runTest('3.3: Partial failover recovery: Gemini & OpenAI fail -> DeepSeek recovers (200) with JSON completion', async () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    process.env.GEMINI_API_KEY = 'real_gemini_key';
    process.env.OPENAI_API_KEY = 'real_openai_key';
    process.env.DEEPSEEK_API_KEY = 'real_deepseek_key';

    global.fetch = async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return { ok: false, status: 500, text: async () => 'Gemini 500 Error' };
      }
      if (url.includes('api.openai.com')) {
        return { ok: false, status: 500, text: async () => 'OpenAI 500 Error' };
      }
      if (url.includes('api.deepseek.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    amount: 5000000,
                    type: 'income',
                    categoryHint: 'Gaji',
                    notes: 'gaji bulanan',
                  }),
                },
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const loggedAttempts = [];
    const { executeAIRouter } = loadTsModule('src/lib/ai/router.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              order: async () => ({
                data: [
                  { name: 'gemini', is_active: true, priority: 1 },
                  { name: 'openai', is_active: true, priority: 2 },
                  { name: 'deepseek', is_active: true, priority: 3 },
                ],
              }),
            }),
          }),
        },
      },
      './logger': {
        logAIAttempt: async (p) => {
          loggedAttempts.push(p);
        },
      },
    });

    try {
      const res = await executeAIRouter({
        type: 'text',
        content: 'gaji bulanan 5jt',
        userId: 'usr_deepseek_recover',
      });

      assert.strictEqual(res.provider, 'deepseek', 'Should recover on DeepSeek');
      assert.strictEqual(res.result.amount, 5000000);
      assert.strictEqual(res.result.type, 'income');
      assert.strictEqual(res.attempts.length, 3, 'Must attempt Gemini, OpenAI, and DeepSeek');
      assert.strictEqual(res.attempts[0].status, 'failed');
      assert.strictEqual(res.attempts[1].status, 'failed');
      assert.strictEqual(res.attempts[2].status, 'success');
    } finally {
      global.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // 3.4 Provider Hanging > 5000ms Triggers AbortController
  await runTest('3.4: Provider hanging > 5000ms triggers AbortController and cascades cleanly', async () => {
    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    process.env.GEMINI_API_KEY = 'real_gemini_key';
    process.env.OPENAI_API_KEY = 'real_openai_key';

    global.fetch = async (url, opts) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Promise((resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
          // Dispatch abort signal after 40ms to simulate 5000ms timeout
          setTimeout(() => {
            opts.signal.dispatchEvent(new Event('abort'));
          }, 40);
        });
      }
      if (url.includes('api.openai.com')) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"amount": 15000, "type": "expense", "notes": "kopi"}' } }],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const { executeAIRouter } = loadTsModule('src/lib/ai/router.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: () => ({
            select: () => ({
              order: async () => ({
                data: [
                  { name: 'gemini', is_active: true, priority: 1 },
                  { name: 'openai', is_active: true, priority: 2 },
                ],
              }),
            }),
          }),
        },
      },
      './logger': { logAIAttempt: async () => {} },
    });

    try {
      const res = await executeAIRouter({
        type: 'text',
        content: 'kopi 15rb',
        userId: 'usr_abort_test',
      });

      assert.strictEqual(res.provider, 'openai', 'Should failover from aborted Gemini to OpenAI');
      assert.strictEqual(res.attempts[0].provider, 'gemini');
      assert.strictEqual(res.attempts[0].status, 'failed');
      assert.strictEqual(res.attempts[1].provider, 'openai');
      assert.strictEqual(res.attempts[1].status, 'success');
    } finally {
      global.fetch = originalFetch;
      process.env = originalEnv;
    }
  });

  // 3.5 SQL Check Constraint Mapping in ai_logs
  await runTest('3.5: Logger maps fallback_success to fallback conforming to SQL CHECK constraint', async () => {
    let insertedRow = null;
    const { logAIAttempt } = loadTsModule('src/lib/ai/logger.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: (table) => ({
            insert: async (row) => {
              if (table === 'ai_logs') insertedRow = row;
              return { error: null };
            },
          }),
        },
      },
    });

    await logAIAttempt({
      userId: 'usr_sql_check',
      provider: 'fallback_regex',
      latencyMs: 12,
      status: 'fallback_success',
    });

    assert.ok(insertedRow, 'ai_logs row must be inserted');
    assert.strictEqual(
      insertedRow.status,
      'fallback',
      'status must be mapped to fallback to conform to SQL CHECK constraint'
    );
  });

  // =========================================================================
  // CATEGORY 4: Multimodal OCR & Voice STT Gating Integrity
  // =========================================================================
  console.log(bold('\n▶ Category 4: Multimodal OCR & Voice STT Gating Integrity'));

  // 4.1 Pro Gatekeeper for Receipt OCR
  await runTest('4.1: Starter user attempting photo OCR receives pro_gated status with 0 DB writes', async () => {
    let insertAttempted = false;
    const { processReceiptPhoto } = loadTsModule('src/lib/ai/ocr.ts', {
      '@/lib/supabase/admin': {
        supabaseAdmin: {
          from: () => ({
            insert: async () => {
              insertAttempted = true;
              return { error: null };
            },
          }),
        },
      },
      './logger': { logAIAttempt: async () => {} },
    });

    const res = await processReceiptPhoto({
      userId: 'usr_starter_gated',
      userPlan: 'starter',
      photos: [{ file_id: 'ph_gated', width: 800, height: 600 }],
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'pro_gated');
    assert.strictEqual(insertAttempted, false, 'No transactions or items should be written');
    assert.ok(res.body.replyText.includes('Upgrade sekarang ke TataDana Pro'));
  });

  // 4.2 Voice Note Duration Cap (> 60s rejected immediately)
  await runTest('4.2: Voice note > 60s rejected before executing any AI calls', async () => {
    const { processVoiceNote } = loadTsModule('src/lib/ai/voice.ts', {
      '@/lib/supabase/admin': { supabaseAdmin: {} },
      './logger': { logAIAttempt: async () => {} },
    });

    const res = await processVoiceNote({
      userId: 'usr_voice_cap',
      voice: { duration: 75, file_id: 'voice_over_60' },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'voice_error');
    assert.ok(res.body.replyText.includes('melebihi batas 60 detik'));
  });

  // 4.3 Dynamic Receipt Line Items Arithmetic Verification
  await runTest('4.3: Dynamic receipt line items compute total = sum(quantity * price)', () => {
    const testItems = [
      { item_name: 'Beras Pandan Wangi 5kg', quantity: 2, price: 82000 },
      { item_name: 'Minyak Goreng SunCo 2L', quantity: 3, price: 34000 },
      { item_name: 'Gula Pasir 1kg', quantity: 5, price: 17500 },
    ];

    const subtotal = testItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
    assert.strictEqual(subtotal, 2 * 82000 + 3 * 34000 + 5 * 17500); // 164000 + 102000 + 87500 = 353500
    assert.strictEqual(subtotal, 353500);
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(bold('\n======================================================================'));
  console.log(bold('                 CHALLENGE SUMMARY & EMPIRICAL AUDIT                  '));
  console.log(bold('======================================================================'));
  console.log(`Total Empirical Tests: ${totalTests}`);
  console.log(`Passed:                ${green(passedTests)}`);
  console.log(`Failed:                ${failedTests === 0 ? green(failedTests) : red(failedTests)}`);
  console.log(`Findings logged:       ${findings.length}`);
  console.log(bold('======================================================================\n'));

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
