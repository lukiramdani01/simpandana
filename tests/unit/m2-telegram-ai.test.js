const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

// 1. Polyfill WebSocket and fetch for Node 20 Supabase client initialization
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


// 2. Setup TypeScript module loader and '@/' path alias resolver
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

// 3. Direct imports of production modules under src/lib/ (NO reference-oracle!)
const { parseIndonesianNominal, parseIndonesianWords } = require('../../src/lib/parser/nominal.ts');
const { checkStarterQuota, isUserPlanAllowedToRecord } = require('../../src/lib/quota.ts');
const { formatBudgetProgressBar, formatRupiah, getWIBDateString } = require('../../src/lib/telegram/formatter.ts');
const { executeAIRouter, parseAICompletionResponse } = require('../../src/lib/ai/router.ts');
const { processReceiptPhoto } = require('../../src/lib/ai/ocr.ts');
const { processVoiceNote } = require('../../src/lib/ai/voice.ts');

// =========================================================================
// Group 1: Indonesian Word Numbers Grammar (src/lib/parser/nominal.ts)
// =========================================================================
test('M2: Indonesian Word Numbers Grammar (src/lib/parser/nominal)', async (t) => {
  await t.test('parses common exact phrases correctly', () => {
    assert.strictEqual(parseIndonesianWords('sepuluh ribu'), 10000);
    assert.strictEqual(parseIndonesianWords('dua puluh lima ribu'), 25000);
    assert.strictEqual(parseIndonesianWords('lima puluh ribu'), 50000);
    assert.strictEqual(parseIndonesianWords('seratus ribu'), 100000);
    assert.strictEqual(parseIndonesianWords('satu juta'), 1000000);
    assert.strictEqual(parseIndonesianWords('satu juta lima ratus ribu'), 1500000);
    assert.strictEqual(parseIndonesianWords('dua juta lima ratus ribu'), 2500000);
    assert.strictEqual(parseIndonesianWords('seribu'), 1000);
  });

  await t.test('parses composite word numbers', () => {
    assert.strictEqual(parseIndonesianWords('dua puluh ribu'), 20000);
    assert.strictEqual(parseIndonesianWords('tiga ratus ribu'), 300000);
    assert.strictEqual(parseIndonesianWords('tujuh ratus lima puluh ribu'), 750000);
    assert.strictEqual(parseIndonesianWords('seratus lima puluh ribu'), 150000);
    assert.strictEqual(parseIndonesianWords('dua juta tiga ratus lima puluh ribu'), 2350000);
  });

  await t.test('returns null for non-number input', () => {
    assert.strictEqual(parseIndonesianWords('halo kawan'), null);
    assert.strictEqual(parseIndonesianWords('selamat pagi'), null);
  });
});

// =========================================================================
// Group 2: Indonesian Nominal & Type Extraction (src/lib/parser/nominal.ts)
// =========================================================================
test('M2: Indonesian Nominal & Type Extraction (src/lib/parser/nominal)', async (t) => {
  await t.test('extracts thousands suffixes (rb, k, ribu)', () => {
    assert.strictEqual(parseIndonesianNominal('beli bakso 15rb').amount, 15000);
    assert.strictEqual(parseIndonesianNominal('kopi susu 25k').amount, 25000);
    assert.strictEqual(parseIndonesianNominal('bensin 500k').amount, 500000);
    assert.strictEqual(parseIndonesianNominal('parkir 15 ribu').amount, 15000);
  });

  await t.test('extracts millions suffixes (jt, juta)', () => {
    assert.strictEqual(parseIndonesianNominal('gaji 5jt').amount, 5000000);
    assert.strictEqual(parseIndonesianNominal('beli hp 1.5jt').amount, 1500000);
    assert.strictEqual(parseIndonesianNominal('laptop 2,5 juta').amount, 2500000);
  });

  await t.test('extracts billions suffixes (miliar, milyar)', () => {
    assert.strictEqual(parseIndonesianNominal('investasi 1 miliar').amount, 1000000000);
    assert.strictEqual(parseIndonesianNominal('aset 1.2 milyar').amount, 1200000000);
  });

  await t.test('extracts dot-separated Rupiah and plain integers', () => {
    assert.strictEqual(parseIndonesianNominal('Rp 150.000').amount, 150000);
    assert.strictEqual(parseIndonesianNominal('150.000').amount, 150000);
    assert.strictEqual(parseIndonesianNominal('beli bakso 15000').amount, 15000);
    assert.strictEqual(parseIndonesianNominal('Pemasukan 5000.000').amount, 5000000);
    assert.strictEqual(parseIndonesianNominal('Pemasukan 5000.000').type, 'income');
  });

  await t.test('classifies transaction type accurately', () => {
    assert.strictEqual(parseIndonesianNominal('gajian 10jt').type, 'income');
    assert.strictEqual(parseIndonesianNominal('dapat transfer 500k').type, 'income');
    assert.strictEqual(parseIndonesianNominal('transfer ke bca 200k').type, 'transfer');
    assert.strictEqual(parseIndonesianNominal('pindah dana 100k').type, 'transfer');
    assert.strictEqual(parseIndonesianNominal('beli martabak 45rb').type, 'expense');
  });

  await t.test('identifies ambiguous input safely', () => {
    const res = parseIndonesianNominal('halo selamat pagi');
    assert.strictEqual(res.amount, 0);
    assert.strictEqual(res.isAmbiguous, true);
    assert.strictEqual(res.confidence < 0.5, true);
  });
});

// =========================================================================
// Group 3: Starter Quota 100 tx/month Enforcement (src/lib/quota.ts)
// =========================================================================
test('M2: Starter Quota 100 tx/month Enforcement (src/lib/quota)', async (t) => {
  await t.test('allows transaction when count < 100', () => {
    const q99 = checkStarterQuota(99);
    assert.strictEqual(q99.allowed, true);
    assert.strictEqual(q99.remaining, 1);
    assert.strictEqual(q99.error, null);
  });

  await t.test('blocks transaction when count >= 100', () => {
    const q100 = checkStarterQuota(100);
    assert.strictEqual(q100.allowed, false);
    assert.strictEqual(q100.remaining, 0);
    assert.match(q100.error, /100 transaksi/);

    const q101 = checkStarterQuota(101);
    assert.strictEqual(q101.allowed, false);
  });

  await t.test('pro plan bypasses limit', () => {
    const proCheck = isUserPlanAllowedToRecord('pro', 100);
    assert.strictEqual(proCheck.allowed, true);
    assert.strictEqual(proCheck.limit, Infinity);
    assert.strictEqual(proCheck.remaining, Infinity);
  });
});

// =========================================================================
// Group 4: Telegram Formatting & Visual Progress Bar (src/lib/telegram/formatter.ts)
// =========================================================================
test('M2: Telegram Formatting & Visual Progress Bar (src/lib/telegram/formatter)', async (t) => {
  await t.test('formats 10-block progress bar at 50%', () => {
    const bar = formatBudgetProgressBar(500000, 1000000);
    assert.strictEqual(bar.includes('50%'), true);
    assert.strictEqual(bar.includes('█████░░░░░'), true);
    assert.strictEqual(bar.includes('Sisa: Rp 500.000'), true);
  });

  await t.test('formats zero budget limit safely', () => {
    const bar = formatBudgetProgressBar(50000, 0);
    assert.strictEqual(bar.includes('0%'), true);
    assert.strictEqual(bar.includes('░░░░░░░░░░'), true);
  });

  await t.test('formats budget overflow with warning indicator', () => {
    const bar = formatBudgetProgressBar(2500000, 1000000);
    assert.strictEqual(bar.includes('250%'), true);
    assert.strictEqual(bar.includes('Melebihi budget'), true);
  });

  await t.test('formats Indonesian Rupiah with dot separators', () => {
    assert.strictEqual(formatRupiah(1500000), '1.500.000');
    assert.strictEqual(formatRupiah(25000), '25.000');
  });

  await t.test('formats WIB date format correctly', () => {
    const dateStr = getWIBDateString();
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
  });
});

// =========================================================================
// Group 5: Voice Note 60-second Duration Cap (src/lib/ai/voice.ts)
// =========================================================================
test('M2: Voice Note 60-second Duration Cap (src/lib/ai/voice)', async (t) => {
  await t.test('rejects voice notes > 60 seconds before executing AI calls', async () => {
    const res = await processVoiceNote({
      userId: 'test-user-voice-cap',
      voice: { duration: 75, file_id: 'voice_over_60' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'voice_error');
    assert.match(res.body.replyText, /melebihi batas 60 detik/);
  });

  await t.test('accepts voice notes <= 60 seconds', async () => {
    const res = await processVoiceNote({
      userId: 'test-user-voice-cap',
      voice: { duration: 45, file_id: 'voice_under_60' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'voice_processed');
  });
});

// =========================================================================
// Group 6: Pro Gating for Receipt OCR (src/lib/ai/ocr.ts)
// =========================================================================
test('M2: Pro Gating for Receipt OCR (src/lib/ai/ocr)', async (t) => {
  await t.test('blocks starter users with upgrade prompt', async () => {
    const res = await processReceiptPhoto({
      userId: 'starter-user',
      userPlan: 'starter',
      photos: [{ file_id: 'photo_1', width: 800, height: 600 }],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'pro_gated');
    assert.match(res.body.replyText, /Fitur Struk Pintar/);
  });

  await t.test('safely ignores empty photo updates', async () => {
    const res = await processReceiptPhoto({
      userId: 'starter-user',
      userPlan: 'starter',
      photos: [],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ignored, true);
  });
});

// =========================================================================
// Group 7: Multi-Provider AI Completion Parsing (src/lib/ai/router.ts)
// =========================================================================
test('M2: AI Completion JSON Schema Parsing (src/lib/ai/router)', async (t) => {
  await t.test('parses clean JSON completion from OpenAI / DeepSeek', () => {
    const rawJson = JSON.stringify({
      amount: 45000,
      type: 'expense',
      categoryHint: 'Makanan & Minuman',
      notes: 'beli martabak manis',
    });
    const result = parseAICompletionResponse(rawJson, 'beli martabak manis 45rb');
    assert.strictEqual(result.amount, 45000);
    assert.strictEqual(result.type, 'expense');
    assert.strictEqual(result.categoryHint, 'Makanan & Minuman');
    assert.strictEqual(result.notes, 'beli martabak manis');
    assert.strictEqual(result.isAmbiguous, false);
  });

  await t.test('strips markdown code fences from LLM output', () => {
    const markdownContent = '```json\n{"amount": 150000, "type": "expense", "categoryHint": "Tagihan", "notes": "bayar wifi"}\n```';
    const result = parseAICompletionResponse(markdownContent, 'bayar wifi 150rb');
    assert.strictEqual(result.amount, 150000);
    assert.strictEqual(result.type, 'expense');
    assert.strictEqual(result.categoryHint, 'Tagihan');
    assert.strictEqual(result.notes, 'bayar wifi');
  });

  await t.test('extracts embedded JSON object when conversational preamble is present', () => {
    const conversational = 'Berikut adalah hasil analisis:\n{"amount": 5000000, "type": "income", "categoryHint": "Gaji", "notes": "gaji bulanan"}\nSemoga bermanfaat.';
    const result = parseAICompletionResponse(conversational, 'gaji bulanan 5jt');
    assert.strictEqual(result.amount, 5000000);
    assert.strictEqual(result.type, 'income');
  });

  await t.test('throws descriptive error on malformed or empty content', () => {
    assert.throws(() => parseAICompletionResponse('', 'test'), /empty or invalid/);
    assert.throws(() => parseAICompletionResponse('Maaf saya tidak tahu', 'test'), /did not contain valid JSON/);
  });

  await t.test('classifies amount 0 as ambiguous', () => {
    const zeroAmountJson = JSON.stringify({
      amount: 0,
      type: 'expense',
      categoryHint: 'Lainnya',
      notes: 'halo selamat siang',
    });
    const result = parseAICompletionResponse(zeroAmountJson, 'halo selamat siang');
    assert.strictEqual(result.amount, 0);
    assert.strictEqual(result.isAmbiguous, true);
    assert.strictEqual(result.confidence < 0.5, true);
  });
});

// =========================================================================
// Group 8: Multi-Provider AI Router Cascade & Fallback (src/lib/ai/router.ts)
// =========================================================================
test('M2: Multi-Provider AI Router Cascade & Telemetry (src/lib/ai/router)', async (t) => {
  await t.test('executes router and falls back gracefully with telemetry', async () => {
    const res = await executeAIRouter({
      type: 'text',
      content: 'beli bensin pertamax 50rb',
      userId: 'test-router-telemetry-user',
    });
    assert.ok(res.provider);
    assert.strictEqual(res.result.amount, 50000);
    assert.strictEqual(res.result.type, 'expense');
    assert.ok(Array.isArray(res.attempts));
    assert.ok(res.attempts.length >= 1);
  });
});
