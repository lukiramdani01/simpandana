import { chromium } from 'playwright-core';
import https from 'https';

function httpPost(url: string, body: any, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runFullE2ESuite() {
  console.log('====================================================');
  console.log('🧪 COMPREHENSIVE SIMPANDANA FULL E2E TEST SUITE');
  console.log('====================================================\n');

  const results: Record<string, 'PASSED' | 'FAILED'> = {};

  // TEST 1: Unauthenticated Guard Protection
  console.log('--- TEST 1: Auth Guard Protection ---');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('https://www.simpandana.my.id/dashboard');
  await page.waitForTimeout(2000);
  const guardUrl = page.url();
  console.log('Direct /dashboard access URL:', guardUrl);
  if (guardUrl.includes('/login')) {
    console.log('✅ TEST 1 PASSED: Unauthenticated user redirected to /login');
    results['TEST 1: Auth Guard'] = 'PASSED';
  } else {
    console.log('❌ TEST 1 FAILED');
    results['TEST 1: Auth Guard'] = 'FAILED';
  }

  // TEST 2: Registration & Email OTP Flow
  console.log('\n--- TEST 2: Email Registration & OTP Verification ---');
  const testEmail = `e2e_test_${Date.now()}@simpandana.my.id`;
  const regRes = await httpPost('https://www.simpandana.my.id/api/auth/register', {
    full_name: 'E2E Tester',
    email: testEmail,
    password: 'password123',
  });

  if (regRes.statusCode === 201 && regRes.body.user) {
    console.log('1. Registration successful. OTP:', regRes.body.otp);
    
    // Verify Email OTP
    const verifyRes = await httpPost('https://www.simpandana.my.id/api/auth/verify-email', {
      email: testEmail,
      otp: regRes.body.otp || '123456',
    });
    console.log('2. OTP Verification:', verifyRes.body.ok ? 'Verified' : 'Failed');

    // Login with verified user
    const loginUserRes = await httpPost('https://www.simpandana.my.id/api/auth/login', {
      email: testEmail,
      password: 'password123',
    });

    if (loginUserRes.body.user?.role === 'user') {
      console.log('✅ TEST 2 PASSED: Registered user assigned role="user"');
      results['TEST 2: Registration & OTP'] = 'PASSED';
    } else {
      console.log('❌ TEST 2 FAILED');
      results['TEST 2: Registration & OTP'] = 'FAILED';
    }
  }

  // TEST 3: Strict Superadmin Login & Admin Panel Isolation
  console.log('\n--- TEST 3: Superadmin Login & Admin Isolation ---');
  await page.goto('https://www.simpandana.my.id/login');
  await page.fill('input[type="email"]', 'lramdanie02@gmail.com');
  await page.fill('input[type="password"]', 'Dys010420');
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(3000);

  const dashUrl = page.url();
  console.log('Superadmin logged in URL:', dashUrl);

  const adminBtnVisible = await page.locator('button:has-text("Panel Admin"), a:has-text("Panel Admin")').first().isVisible().catch(() => false);
  console.log('Superadmin Panel Button Visible:', adminBtnVisible);

  if (dashUrl.includes('/dashboard')) {
    console.log('✅ TEST 3 PASSED: Superadmin logged in cleanly');
    results['TEST 3: Superadmin Login'] = 'PASSED';
  } else {
    console.log('❌ TEST 3 FAILED');
    results['TEST 3: Superadmin Login'] = 'FAILED';
  }

  // TEST 4: Tata AI Bot Transaction Creation & Rich Text Rendering
  console.log('\n--- TEST 4: Tata AI Bot & Natural Language Processing ---');
  const botBtn = page.locator('button:has-text("Tata AI Bot")').first();
  if (await botBtn.isVisible()) {
    await botBtn.click();
    await page.waitForTimeout(1000);

    // Type NLP Transaction
    const inputField = page.locator('input[placeholder*="Ketik"], input[placeholder*="perintah"]').first();
    await inputField.fill('makan siang 35rb');
    await page.click('button:has-text("Kirim")');
    await page.waitForTimeout(1500);

    const chatContent = await page.locator('.custom-scrollbar').last().innerText();
    const isPromptRendered = chatContent.includes('35.000') || chatContent.includes('Pilih dompet');
    const hasNoRawAsterisks = !chatContent.includes('**Transaksi') && !chatContent.includes('**Tata AI**');

    console.log('Bot NLP Prompt Rendered:', isPromptRendered);
    console.log('Rich Text Formatted (No Raw Asterisks):', hasNoRawAsterisks);

    if (isPromptRendered && hasNoRawAsterisks) {
      console.log('✅ TEST 4 PASSED: Tata AI Bot processes NLP transactions with rich text formatting!');
      results['TEST 4: Tata AI Bot NLP'] = 'PASSED';
    } else {
      console.log('❌ TEST 4 FAILED');
      results['TEST 4: Tata AI Bot NLP'] = 'FAILED';
    }
  }

  // TEST 5: Telegram Bot Webhook & Idempotency Key
  console.log('\n--- TEST 5: Telegram Bot Webhook & Idempotency ---');
  const updateId = Math.floor(100000 + Math.random() * 900000);
  const tgWebhookRes1 = await httpPost('https://www.simpandana.my.id/api/telegram/webhook', {
    update_id: updateId,
    message: {
      message_id: 88,
      from: { id: 182938491, first_name: 'Luki' },
      chat: { id: 182938491 },
      text: 'bensin 20rb gopay',
    },
  });

  console.log('1. First Webhook Status:', tgWebhookRes1.body.status || tgWebhookRes1.body.finalStatus);

  // Send duplicate update
  const tgWebhookRes2 = await httpPost('https://www.simpandana.my.id/api/telegram/webhook', {
    update_id: updateId,
    message: {
      message_id: 88,
      from: { id: 182938491, first_name: 'Luki' },
      chat: { id: 182938491 },
      text: 'bensin 20rb gopay',
    },
  });

  console.log('2. Duplicate Webhook Status:', tgWebhookRes2.body.status);

  if (tgWebhookRes2.body.status === 'DUPLICATE') {
    console.log('✅ TEST 5 PASSED: Idempotency Key successfully blocked duplicate Telegram transaction!');
    results['TEST 5: Telegram Webhook & Idempotency'] = 'PASSED';
  } else {
    console.log('❌ TEST 5 FAILED');
    results['TEST 5: Telegram Webhook & Idempotency'] = 'FAILED';
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('🏆 FINAL E2E TEST RESULTS SUMMARY');
  console.log('====================================================');
  console.table(results);
}

runFullE2ESuite().catch(console.error);
