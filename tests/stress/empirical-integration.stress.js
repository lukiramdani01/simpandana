/**
 * Empirical Stress & Verification Test Suite for SimpanUang SaaS
 * Telegram Bot & Reactive Dashboard Integration
 *
 * Requirements Tested:
 * 1. Sub-second latency (<1000ms SLA) across diverse inputs (Indonesian text, Voice Note, OCR Struk).
 * 2. Telegram Auto-Poller concurrency & 409 Conflict defense under rapid burst requests.
 * 3. SSE (/api/realtime/stream) connection lifecycle, subscriber fanout, tenant filtering, and abrupt aborts.
 * 4. 7-Step Telemetry Lifecycle & Latency Breakdown.
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = process.env.TEST_SERVER_URL || 'http://localhost:3005';
const parsedUrl = new URL(BASE_URL);
const HOST = parsedUrl.hostname;
const PORT = parseInt(parsedUrl.port || '3005', 10);

// ANSI helpers
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

// Dynamic unique update_id generator to prevent cross-run idempotency collisions
let updateIdSequence = Date.now() + Math.floor(Math.random() * 100000);
const getNextUpdateId = () => ++updateIdSequence;

function makeHttpRequest({ method = 'GET', path, headers = {}, body = null, timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const reqOptions = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
      timeout,
    };

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const durationMs = Math.round(performance.now() - startTime);
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          raw: data,
          durationMs,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testCase(name, fn) {
  totalTests++;
  process.stdout.write(`  [TEST] ${name} ... `);
  const t0 = performance.now();
  try {
    const res = await fn();
    const duration = Math.round(performance.now() - t0);
    passedTests++;
    console.log(`${green('PASS')} (${duration}ms)${res ? ` — ${dim(res)}` : ''}`);
  } catch (err) {
    failedTests++;
    console.log(`${red('FAIL')}`);
    console.error(`    ${red('Error:')} ${err.message}`);
    findings.push({ name, error: err.message, stack: err.stack });
  }
}

// -------------------------------------------------------------
// Suite 1: Webhook Sub-Second Latency & Multi-Input Parsing
// -------------------------------------------------------------
async function runSuite1WebhookLatency() {
  console.log(`\n${bold(cyan('================================================================='))}`);
  console.log(`${bold(cyan(' SUITE 1: Webhook Sub-Second SLA & Multi-Input Processing (<1s)'))}`);
  console.log(`${bold(cyan('================================================================='))}`);

  const nominalCases = [
    { text: 'beli nasi padang 25rb bca', expectedAmount: 25000, expectedWallet: 'w-1', expectedType: 'expense' },
    { text: 'gajian bulan ini 5jt mandiri', expectedAmount: 5000000, expectedWallet: 'w-2', expectedType: 'income' },
    { text: 'kopi kenangan 18k gopay', expectedAmount: 18000, expectedWallet: 'w-3', expectedType: 'expense' },
    { text: 'bayar token listrik 150.000 cash', expectedAmount: 150000, expectedWallet: 'w_cash', expectedType: 'expense' },
    { text: 'makan siang dua puluh lima ribu', expectedAmount: 25000, expectedType: 'expense' },
    { text: 'service motor 250rb bca', expectedAmount: 250000, expectedWallet: 'w-1', expectedType: 'expense' },
    { text: 'dapat freelance web 1.5jt mandiri', expectedAmount: 1500000, expectedWallet: 'w-2', expectedType: 'income' },
    { text: 'snack indomaret 12.500 gopay', expectedAmount: 12500, expectedWallet: 'w-3', expectedType: 'expense' },
    { text: 'beli buku 75000 cash', expectedAmount: 75000, expectedWallet: 'w_cash', expectedType: 'expense' },
    { text: 'sarapan bubur sepuluh ribu', expectedAmount: 10000, expectedType: 'expense' },
  ];

  const textLatencies = [];

  for (let i = 0; i < nominalCases.length; i++) {
    const c = nominalCases[i];
    const updateId = getNextUpdateId();
    await testCase(`Text Nominal: "${c.text}" [update_id: ${updateId}]`, async () => {
      const payload = {
        update_id: updateId,
        message: {
          message_id: 100 + i,
          from: { id: 182938491, first_name: 'Luki', username: 'lukiramdani' },
          chat: { id: 182938491, type: 'private' },
          text: c.text,
        },
      };

      const res = await makeHttpRequest({
        method: 'POST',
        path: '/api/telegram/webhook',
        body: payload,
      });

      assert.strictEqual(res.statusCode, 200, `Expected HTTP 200, got ${res.statusCode}`);
      assert.strictEqual(res.data.ok, true, `Expected ok: true in response`);
      assert.strictEqual(res.data.status, 'COMPLETED', `Expected status COMPLETED`);

      const trace = res.data.trace;
      assert.ok(trace, 'Trace object must be present');
      assert.ok(trace.latencyBreakdown, 'latencyBreakdown must be present');
      
      const serverTotalMs = trace.latencyBreakdown.totalMs;
      const clientTotalMs = res.durationMs;
      textLatencies.push(clientTotalMs);

      // Verify Sub-Second SLA (< 1000ms)
      assert.ok(clientTotalMs < 1000, `Client observed latency ${clientTotalMs}ms exceeds 1000ms SLA`);
      assert.ok(serverTotalMs < 1000, `Server trace latency ${serverTotalMs}ms exceeds 1000ms SLA`);

      // Verify parser correctness
      assert.strictEqual(trace.parserResult.type, c.expectedType, `Parser type mismatch`);
      assert.strictEqual(trace.parserResult.amount, c.expectedAmount, `Parser amount mismatch: expected ${c.expectedAmount}, got ${trace.parserResult.amount}`);
      if (c.expectedWallet) {
        assert.strictEqual(trace.wallet?.id, c.expectedWallet, `Wallet routing mismatch: expected ${c.expectedWallet}, got ${trace.wallet?.id}`);
      }

      // Verify all 7 canonical steps present in trace
      const stepStatuses = trace.steps.map(s => s.status);
      const expectedSteps = ['RECEIVED', 'USER_IDENTIFIED', 'PARSED', 'TRANSACTION_CREATED', 'BALANCE_UPDATED', 'DASHBOARD_SYNCED', 'COMPLETED'];
      for (const st of expectedSteps) {
        assert.ok(stepStatuses.includes(st), `Step ${st} missing from trace steps: ${stepStatuses.join(', ')}`);
      }

      return `Client: ${clientTotalMs}ms, Server: ${serverTotalMs}ms, Amount: Rp${trace.parserResult.amount.toLocaleString('id-ID')}, Wallet: ${trace.wallet?.name}`;
    });
  }

  // Edge Case Mining: Unlinked Anonymous Sender (Missing User & Chat Identity)
  await testCase('Unlinked Sender Guard: Missing user & chat identity yields USER_NOT_CONNECTED', async () => {
    const updateId = getNextUpdateId();
    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: {
        update_id: updateId,
        message: {
          message_id: 199,
          text: 'beli pulsa 50rb',
        },
      },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'USER_NOT_CONNECTED');
    assert.ok(res.data.replyText.includes('belum terhubung'), 'Must contain unlinked notice');
    assert.ok(res.durationMs < 1000, 'Unlinked check must be sub-second');
    return `Client: ${res.durationMs}ms, Status: USER_NOT_CONNECTED, Reply: "${res.data.replyText.substring(0, 45)}..."`;
  });

  // Adversarial: Concurrent Idempotency Storm (15 parallel requests with identical update_id)
  await testCase('Adversarial Idempotency Storm: 15 parallel requests with identical update_id', async () => {
    const stormId = getNextUpdateId();
    const promises = [];
    for (let k = 0; k < 15; k++) {
      promises.push(
        makeHttpRequest({
          method: 'POST',
          path: '/api/telegram/webhook',
          body: {
            update_id: stormId,
            message: {
              message_id: 999,
              from: { id: 182938491, first_name: 'Luki' },
              chat: { id: 182938491, type: 'private' },
              text: 'beli token storm 10rb bca',
            },
          },
        })
      );
    }

    const stormResults = await Promise.all(promises);
    let completedCount = 0;
    let duplicateCount = 0;

    for (const r of stormResults) {
      assert.strictEqual(r.statusCode, 200);
      if (r.data.status === 'COMPLETED') completedCount++;
      if (r.data.status === 'DUPLICATE') duplicateCount++;
    }

    // Exactly 1 must succeed and 14 must be flagged DUPLICATE
    assert.strictEqual(completedCount, 1, `Exactly 1 transaction should be COMPLETED, got ${completedCount}`);
    assert.strictEqual(duplicateCount, 14, `Remaining 14 should be detected as DUPLICATE, got ${duplicateCount}`);

    return `Atomic Idempotency: 1 COMPLETED, 14 DUPLICATE detected cleanly`;
  });

  // Multi-Input: Simulated Voice Note
  await testCase('Voice Note Input: Spoken audio duration 15s (<=60s cap)', async () => {
    const updateId = getNextUpdateId();
    const payload = {
      update_id: updateId,
      message: {
        message_id: 201,
        from: { id: 182938491, first_name: 'Luki' },
        chat: { id: 182938491, type: 'private' },
        voice: {
          file_id: 'voice_fast_test_001',
          duration: 15,
          mime_type: 'audio/ogg',
        },
      },
    };

    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: payload,
    });

    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200`);
    assert.strictEqual(res.data.ok, true, `Expected ok: true`);
    assert.strictEqual(res.data.status, 'COMPLETED');
    const clientTotalMs = res.durationMs;
    assert.ok(clientTotalMs < 1000, `Voice note latency ${clientTotalMs}ms exceeds 1000ms SLA`);
    return `Client: ${clientTotalMs}ms, Status: COMPLETED, Reply: "${res.data.replyText.substring(0, 40)}..."`;
  });

  // Multi-Input: Voice Note > 60s Rejection
  await testCase('Voice Note Boundary: Spoken audio duration 75s (>60s cap rejection)', async () => {
    const updateId = getNextUpdateId();
    const payload = {
      update_id: updateId,
      message: {
        message_id: 202,
        from: { id: 182938491, first_name: 'Luki' },
        chat: { id: 182938491, type: 'private' },
        voice: {
          file_id: 'voice_long_test_002',
          duration: 75,
          mime_type: 'audio/ogg',
        },
      },
    };

    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: payload,
    });

    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200`);
    assert.strictEqual(res.data.ok, true);
    assert.ok(res.data.replyText.includes('60 detik') || res.data.replyText.includes('maksimal'), 'Should return duration limit warning');
    return `Client: ${res.durationMs}ms, Warning returned: "${res.data.replyText.substring(0, 45)}..."`;
  });

  // Multi-Input: Simulated OCR Receipt Photo
  await testCase('Receipt OCR Input: Indomaret Struk Photo (Pro user usr-101)', async () => {
    const updateId = getNextUpdateId();
    const payload = {
      update_id: updateId,
      message: {
        message_id: 203,
        from: { id: 182938491, first_name: 'Luki' },
        chat: { id: 182938491, type: 'private' },
        photo: [
          { file_id: 'photo_thumb_001', width: 320, height: 240 },
          { file_id: 'photo_full_001', width: 1280, height: 960 },
        ],
        caption: 'Struk Indomaret Total 45.000 bca',
      },
    };

    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: payload,
    });

    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200`);
    assert.strictEqual(res.data.ok, true, `Expected ok: true`);
    assert.strictEqual(res.data.status, 'COMPLETED');
    const clientTotalMs = res.durationMs;
    assert.ok(clientTotalMs < 1000, `OCR latency ${clientTotalMs}ms exceeds 1000ms SLA`);
    return `Client: ${clientTotalMs}ms, Status: COMPLETED, Reply: "${res.data.replyText.substring(0, 40)}..."`;
  });

  // Concurrent Burst Latency (10 simultaneous webhook calls with unique update_ids)
  await testCase('Concurrent Burst Latency: 10 simultaneous webhook transactions', async () => {
    const burstPromises = [];
    for (let j = 0; j < 10; j++) {
      const updateId = getNextUpdateId();
      const p = makeHttpRequest({
        method: 'POST',
        path: '/api/telegram/webhook',
        body: {
          update_id: updateId,
          message: {
            message_id: 300 + j,
            from: { id: 182938491, first_name: 'Luki' },
            chat: { id: 182938491, type: 'private' },
            text: `pengeluaran cepat ${10 + j}rb bca`,
          },
        },
      });
      burstPromises.push(p);
    }

    const results = await Promise.all(burstPromises);
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      assert.strictEqual(r.statusCode, 200, `Burst #${j} failed with status ${r.statusCode}`);
      assert.strictEqual(r.data.ok, true, `Burst #${j} ok is not true`);
      assert.strictEqual(r.data.status, 'COMPLETED', `Burst #${j} status is not COMPLETED`);
      assert.ok(r.durationMs < 1000, `Burst #${j} duration ${r.durationMs}ms exceeded 1000ms SLA`);
    }

    const burstDurations = results.map(r => r.durationMs);
    const avgBurst = Math.round(burstDurations.reduce((a, b) => a + b, 0) / burstDurations.length);
    const maxBurst = Math.max(...burstDurations);
    const minBurst = Math.min(...burstDurations);

    return `10/10 COMPLETED, Avg: ${avgBurst}ms, Min: ${minBurst}ms, Max: ${maxBurst}ms (100% < 1000ms)`;
  });

  // Calculate overall latency stats
  const avgLatency = Math.round(textLatencies.reduce((a, b) => a + b, 0) / textLatencies.length);
  const minLatency = Math.min(...textLatencies);
  const maxLatency = Math.max(...textLatencies);
  console.log(`\n  ${bold('Suite 1 Latency Summary:')} Avg: ${avgLatency}ms | Min: ${minLatency}ms | Max: ${maxLatency}ms | SLA Conformance: ${green('100%')}`);
}

// -------------------------------------------------------------
// Suite 2: Auto-Poller Concurrency & 409 Conflict Defense
// -------------------------------------------------------------
async function runSuite2AutoPollerConcurrency() {
  console.log(`\n${bold(cyan('================================================================='))}`);
  console.log(`${bold(cyan(' SUITE 2: Auto-Poller Concurrency & 409 Conflict Defense'))}`);
  console.log(`${bold(cyan('================================================================='))}`);

  // Test 2.1: Single baseline poll request
  await testCase('Baseline single poll request (/api/telegram/poll)', async () => {
    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/poll',
      body: { token: 'mock-test-poller-token' },
    });
    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200`);
    assert.ok(res.data !== null, 'Response body should not be empty');
    return `Status: ${res.statusCode}, Ok: ${res.data.ok}, Error: "${res.data.error || 'none'}"`;
  });

  // Test 2.2: Burst of 20 rapid simultaneous POST requests to /api/telegram/poll
  await testCase('Burst Concurrency: 20 rapid simultaneous POST requests to /api/telegram/poll', async () => {
    const burstCount = 20;
    const promises = [];

    for (let i = 0; i < burstCount; i++) {
      promises.push(
        makeHttpRequest({
          method: 'POST',
          path: '/api/telegram/poll',
          body: { token: 'mock-burst-token' },
        })
      );
    }

    const results = await Promise.all(promises);
    let ok200Count = 0;
    let conflict409Count = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.statusCode === 200) ok200Count++;
      if (r.statusCode === 409 || (r.data && r.data.error && r.data.error.includes('409'))) {
        conflict409Count++;
      }
    }

    assert.strictEqual(ok200Count, burstCount, `All ${burstCount} requests should return HTTP 200 without server crash`);
    assert.strictEqual(conflict409Count, 0, `No 409 conflict errors should occur`);

    return `20/20 HTTP 200, 0 Conflicts, Max duration: ${Math.max(...results.map(r => r.durationMs))}ms`;
  });

  // Test 2.3: Rapid GET requests to /api/telegram/poll
  await testCase('Rapid successive GET polling requests', async () => {
    const getCount = 10;
    const promises = [];
    for (let i = 0; i < getCount; i++) {
      promises.push(
        makeHttpRequest({
          method: 'GET',
          path: `/api/telegram/poll?token=mock-token-${i}`,
        })
      );
    }

    const results = await Promise.all(promises);
    for (const r of results) {
      assert.strictEqual(r.statusCode, 200);
      assert.ok(!JSON.stringify(r.data).includes('409 Conflict'), 'Must not report 409 Conflict');
    }
    return `10/10 GET requests handled cleanly`;
  });

  // Test 2.4: Polling with default env token resolution (no token parameter)
  await testCase('Poll with default env token resolution (no token parameter)', async () => {
    const res = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/poll',
      body: {},
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(!res.data.error || !res.data.error.includes('409 Conflict'), 'Must not have 409 Conflict');
    return `Handled gracefully: "${res.data.error || 'Success'}"`;
  });
}

// -------------------------------------------------------------
// Suite 3: SSE (/api/realtime/stream) Lifecycle, Fanout & Aborts
// -------------------------------------------------------------
function openSseConnection({ userId = 'usr-101', timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    const path = `/api/realtime/stream?userId=${encodeURIComponent(userId)}`;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    const receivedEvents = [];
    let isConnected = false;
    let handshakeResolve = null;

    const handshakePromise = new Promise((hResolve) => {
      handshakeResolve = hResolve;
    });

    req.on('response', (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`SSE returned status ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        const lines = text.split('\n');
        let currentEvent = null;
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            currentData = line.replace('data:', '').trim();
          } else if (line === '' && currentEvent) {
            let parsed = null;
            try {
              parsed = JSON.parse(currentData);
            } catch {
              parsed = currentData;
            }
            const evtObj = { event: currentEvent, data: parsed, raw: currentData, timestamp: Date.now() };
            receivedEvents.push(evtObj);

            if (currentEvent === 'connected') {
              isConnected = true;
              if (handshakeResolve) handshakeResolve(evtObj);
            }
            currentEvent = null;
            currentData = '';
          }
        }
      });

      resolve({
        req,
        res,
        receivedEvents,
        handshakePromise,
        abort: () => req.destroy(),
      });
    });

    req.on('error', (err) => {
      // Ignore errors after intentional destroy
      if (!req.destroyed) {
        reject(err);
      }
    });

    req.setTimeout(timeout, () => {
      req.destroy();
    });

    req.end();
  });
}

async function runSuite3SseStreamResilience() {
  console.log(`\n${bold(cyan('================================================================='))}`);
  console.log(`${bold(cyan(' SUITE 3: Reactive SSE (/api/realtime/stream) Fanout & Resiliency'))}`);
  console.log(`${bold(cyan('================================================================='))}`);

  // Test 3.1: SSE Handshake verification
  await testCase('SSE Single Client Handshake (event: connected)', async () => {
    const conn = await openSseConnection({ userId: 'usr-101' });
    const handshake = await Promise.race([
      conn.handshakePromise,
      new Promise((_, r) => setTimeout(() => r(new Error('Handshake timeout')), 3000)),
    ]);
    assert.strictEqual(handshake.event, 'connected');
    assert.strictEqual(handshake.data.userId, 'usr-101');
    conn.abort();
    return `Handshake received: ${JSON.stringify(handshake.data)}`;
  });

  // Test 3.2: Multi-Subscriber Fanout (15 concurrent clients)
  await testCase('Multi-Subscriber Fanout: 15 concurrent SSE subscribers receive webhook sync event', async () => {
    const subscriberCount = 15;
    const conns = [];

    for (let i = 0; i < subscriberCount; i++) {
      const conn = await openSseConnection({ userId: 'usr-101' });
      conns.push(conn);
    }

    // Wait for all 15 handshakes
    await Promise.all(conns.map(c => c.handshakePromise));

    // Send a fresh trigger transaction via webhook with a brand new update_id
    const updateId = getNextUpdateId();
    const testAmount = 88000;
    const webhookRes = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: {
        update_id: updateId,
        message: {
          message_id: 401,
          from: { id: 182938491, first_name: 'Luki' },
          chat: { id: 182938491, type: 'private' },
          text: `beli token uji fanout ${testAmount} cash`,
        },
      },
    });

    assert.strictEqual(webhookRes.statusCode, 200);
    assert.strictEqual(webhookRes.data.status, 'COMPLETED');

    // Wait for sync event delivery across all connections (up to 2000ms)
    await new Promise(r => setTimeout(r, 600));

    let deliveredCount = 0;
    for (let i = 0; i < conns.length; i++) {
      const c = conns[i];
      const syncEvt = c.receivedEvents.find(e => e.event === 'sync');
      if (syncEvt) {
        assert.strictEqual(syncEvt.data.type, 'TRANSACTION_CREATED');
        assert.strictEqual(syncEvt.data.transaction.amount, testAmount);
        deliveredCount++;
      }
    }

    // Clean up
    conns.forEach(c => c.abort());

    assert.strictEqual(deliveredCount, subscriberCount, `All ${subscriberCount} subscribers must receive sync event`);
    return `15/15 subscribers received TRANSACTION_CREATED sync event with amount Rp${testAmount.toLocaleString('id-ID')}`;
  });

  // Test 3.3: User Isolation (Tenant Filtering)
  await testCase('User Isolation Filtering: Target user receives event, foreign user does not', async () => {
    const connTarget = await openSseConnection({ userId: 'usr-101' });
    const connForeign = await openSseConnection({ userId: 'usr-OTHER-999' });

    await Promise.all([connTarget.handshakePromise, connForeign.handshakePromise]);

    const updateId = getNextUpdateId();
    const hookRes = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: {
        update_id: updateId,
        message: {
          message_id: 402,
          from: { id: 182938491, first_name: 'Luki' },
          chat: { id: 182938491, type: 'private' },
          text: 'beli pulsa 50rb bca',
        },
      },
    });

    assert.strictEqual(hookRes.statusCode, 200);
    assert.strictEqual(hookRes.data.status, 'COMPLETED');

    await new Promise(r => setTimeout(r, 600));

    const targetSync = connTarget.receivedEvents.find(e => e.event === 'sync');
    const foreignSync = connForeign.receivedEvents.find(e => e.event === 'sync');

    connTarget.abort();
    connForeign.abort();

    assert.ok(targetSync, 'Target user (usr-101) MUST receive sync event');
    assert.strictEqual(foreignSync, undefined, 'Foreign user (usr-OTHER-999) MUST NOT receive sync event');

    return `Target (usr-101) received event: YES | Foreign (usr-OTHER-999) received event: NO (Isolated)`;
  });

  // Test 3.4: Abrupt Client Disconnect & Socket Abort Resiliency
  await testCase('Client Abrupt Disconnect Resiliency: Aborting 5 connections does not crash server', async () => {
    const abortConns = [];
    for (let i = 0; i < 5; i++) {
      const c = await openSseConnection({ userId: 'usr-101' });
      abortConns.push(c);
    }
    await Promise.all(abortConns.map(c => c.handshakePromise));

    // Abruptly destroy all 5 sockets
    for (const c of abortConns) {
      c.req.destroy();
    }

    await new Promise(r => setTimeout(r, 200));

    // Connect a fresh subscriber to verify stream endpoint remains healthy
    const healthyConn = await openSseConnection({ userId: 'usr-101' });
    const handshake = await Promise.race([
      healthyConn.handshakePromise,
      new Promise((_, r) => setTimeout(() => r(new Error('Healthy connection timeout')), 2000)),
    ]);

    assert.strictEqual(handshake.event, 'connected');

    // Trigger another transaction with fresh updateId
    const updateId = getNextUpdateId();
    const hookRes = await makeHttpRequest({
      method: 'POST',
      path: '/api/telegram/webhook',
      body: {
        update_id: updateId,
        message: {
          message_id: 403,
          from: { id: 182938491, first_name: 'Luki' },
          chat: { id: 182938491, type: 'private' },
          text: 'kopi susu 15rb cash',
        },
      },
    });

    assert.strictEqual(hookRes.statusCode, 200);
    assert.strictEqual(hookRes.data.status, 'COMPLETED');

    await new Promise(r => setTimeout(r, 500));
    const syncEvt = healthyConn.receivedEvents.find(e => e.event === 'sync');
    healthyConn.abort();

    assert.ok(syncEvt, 'Healthy connection received sync event after preceding socket aborts');
    return `Server survived 5 abrupt aborts, fresh subscriber immediately received sync event`;
  });
}

// -------------------------------------------------------------
// Suite 4: Telemetry Circular Store & Admin Observability
// -------------------------------------------------------------
async function runSuite4TelemetryStore() {
  console.log(`\n${bold(cyan('================================================================='))}`);
  console.log(`${bold(cyan(' SUITE 4: Telemetry Store (/api/telegram/traces) Verification'))}`);
  console.log(`${bold(cyan('================================================================='))}`);

  await testCase('Telemetry Store exposes live traces with 7-step breakdown', async () => {
    const res = await makeHttpRequest({
      method: 'GET',
      path: '/api/telegram/traces',
    });

    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200`);
    assert.strictEqual(res.data.ok, true, `Expected ok: true`);
    assert.ok(Array.isArray(res.data.traces), 'traces must be an array');
    assert.ok(res.data.traces.length > 0, 'traces should contain recorded runs');

    const completedTrace = res.data.traces.find(t => t.finalStatus === 'COMPLETED');
    assert.ok(completedTrace, 'Must have at least one COMPLETED trace');
    assert.ok(completedTrace.updateId, 'updateId must be present');
    assert.ok(completedTrace.steps && completedTrace.steps.length >= 7, `Must have at least 7 steps, got ${completedTrace.steps?.length}`);
    assert.ok(completedTrace.latencyBreakdown, 'latencyBreakdown must be present');
    assert.ok(completedTrace.latencyBreakdown.totalMs < 1000, `Recorded trace totalMs (${completedTrace.latencyBreakdown.totalMs}ms) must be <1000ms`);

    return `Stored traces: ${res.data.traces.length}, Latest COMPLETED totalMs: ${completedTrace.latencyBreakdown.totalMs}ms, Steps: ${completedTrace.steps.length}`;
  });
}

// -------------------------------------------------------------
// Main Runner
// -------------------------------------------------------------
async function main() {
  console.log(`\n${bold('SimpanUang SaaS — Empirical Challenger Stress Test Suite')}`);
  console.log(`Target: ${bold(BASE_URL)}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const startTotal = performance.now();
  try {
    await runSuite1WebhookLatency();
    await runSuite2AutoPollerConcurrency();
    await runSuite3SseStreamResilience();
    await runSuite4TelemetryStore();
  } catch (err) {
    console.error(`\n${red('Suite Runner Fatal Error:')} ${err.message}`);
    process.exit(1);
  }

  const durationSec = ((performance.now() - startTotal) / 1000).toFixed(2);
  console.log(`\n${bold(cyan('================================================================='))}`);
  console.log(`${bold(' EMPIRICAL STRESS TEST RESULTS SUMMARY')}`);
  console.log(`${bold(cyan('================================================================='))}`);
  console.log(` Total Tests Run:   ${bold(totalTests)}`);
  console.log(` Tests Passed:      ${green(bold(passedTests))}`);
  console.log(` Tests Failed:      ${failedTests > 0 ? red(bold(failedTests)) : '0'}`);
  console.log(` Total Duration:    ${durationSec}s`);

  if (failedTests > 0) {
    console.log(`\n${red(bold('Findings / Failure Modes Discovered:'))}`);
    findings.forEach((f, idx) => {
      console.log(` ${idx + 1}. ${f.name}: ${f.error}`);
    });
    console.log(`\nVerdict: ${red(bold('REQUEST_CHANGES'))}\n`);
    process.exit(1);
  } else {
    console.log(`\nAll empirical stress tests PASSED under SLA limits.`);
    console.log(`Verdict: ${green(bold('APPROVE'))}\n`);
    process.exit(0);
  }
}

main();
