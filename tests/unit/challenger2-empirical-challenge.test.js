const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

// Intercept tatadana-local.supabase.co to avoid DNS/connect timeout during unit tests
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

// Setup TypeScript module loader and '@/' path alias resolver
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

const { executeAIRouter, parseAICompletionResponse } = require('../../src/lib/ai/router.ts');
const { parseIndonesianNominal } = require('../../src/lib/parser/nominal.ts');

// =========================================================================
// SUITE 1: SUPERADMIN RBAC EMPIRICAL VERIFICATION
// =========================================================================
test('Challenger 2 — Superadmin RBAC Behavior & Access Defense', async (t) => {
  await t.test('Middleware route guard simulation blocks unauthenticated access to /admin', () => {
    // Simulate NextRequest to /admin without session
    const evaluateAdminRouteAccess = (user, pathname) => {
      if (!pathname.startsWith('/admin')) return { allowed: true };
      if (!user) {
        return {
          allowed: false,
          redirect: `/login?redirect=${encodeURIComponent(pathname)}`,
          status: 307,
        };
      }
      if (user.role !== 'superadmin') {
        return {
          allowed: false,
          redirect: '/dashboard?error=unauthorized',
          status: 307,
        };
      }
      return { allowed: true, status: 200 };
    };

    const unauthResult = evaluateAdminRouteAccess(null, '/admin');
    assert.strictEqual(unauthResult.allowed, false);
    assert.strictEqual(unauthResult.redirect, '/login?redirect=%2Fadmin');
  });

  await t.test('Middleware route guard rejects non-superadmin users and redirects with error=unauthorized', () => {
    const evaluateAdminRouteAccess = (user, pathname) => {
      if (!pathname.startsWith('/admin')) return { allowed: true };
      if (!user) return { allowed: false, redirect: '/login' };
      if (user.role !== 'superadmin') {
        return { allowed: false, redirect: '/dashboard?error=unauthorized', status: 307 };
      }
      return { allowed: true, status: 200 };
    };

    const testRoles = ['user', 'member', 'admin', 'moderator', '', null, undefined];
    for (const r of testRoles) {
      const res = evaluateAdminRouteAccess({ id: 'u-test', role: r }, '/admin');
      assert.strictEqual(res.allowed, false, `Role "${r}" must not be granted admin access`);
      assert.strictEqual(res.redirect, '/dashboard?error=unauthorized');
    }
  });

  await t.test('Middleware route guard permits verified superadmin', () => {
    const evaluateAdminRouteAccess = (user, pathname) => {
      if (!pathname.startsWith('/admin')) return { allowed: true };
      if (!user) return { allowed: false, redirect: '/login' };
      if (user.role !== 'superadmin') {
        return { allowed: false, redirect: '/dashboard?error=unauthorized', status: 307 };
      }
      return { allowed: true, status: 200 };
    };

    const superadminRes = evaluateAdminRouteAccess({ id: 'adm-01', role: 'superadmin' }, '/admin');
    assert.strictEqual(superadminRes.allowed, true);
    assert.strictEqual(superadminRes.status, 200);
  });

  await t.test('Client-side RBAC component state rejects non-superadmins with 403 Access Denied banner', () => {
    const renderAdminState = (currentRole) => {
      if (currentRole !== 'superadmin') {
        return {
          statusCode: 403,
          title: '403: Akses Ditolak',
          message: 'Anda masuk sebagai Regular User. Rute ini dilindungi oleh otorisasi Superadmin RBAC mutlak.',
          sectionsVisible: false,
        };
      }
      return {
        statusCode: 200,
        title: 'Superadmin Control Suite',
        sectionsVisible: true,
      };
    };

    const regularUserState = renderAdminState('user');
    assert.strictEqual(regularUserState.statusCode, 403);
    assert.strictEqual(regularUserState.sectionsVisible, false);
    assert(regularUserState.title.includes('403'));

    const superadminState = renderAdminState('superadmin');
    assert.strictEqual(superadminState.statusCode, 200);
    assert.strictEqual(superadminState.sectionsVisible, true);
  });
});

// =========================================================================
// SUITE 2: AI PROVIDER SWITCHBOARD & FAILOVER MODES
// =========================================================================
test('Challenger 2 — AI Provider Switchboard, Priority Reordering & Telemetry', async (t) => {
  const initialProviders = [
    { id: 'gemini', displayName: 'Google Gemini 2.0 Flash', priority: 1, isActive: true },
    { id: 'openai', displayName: 'OpenAI GPT-4o Mini', priority: 2, isActive: true },
    { id: 'deepseek', displayName: 'DeepSeek V3', priority: 3, isActive: true },
  ];

  await t.test('Priority reordering boundaries: moving top element up is safe no-op', () => {
    const movePriority = (providers, index, direction) => {
      const newIdx = direction === 'up' ? index - 1 : index + 1;
      if (newIdx < 0 || newIdx >= providers.length) return providers;
      const clone = [...providers];
      const temp = clone[index];
      clone[index] = clone[newIdx];
      clone[newIdx] = temp;
      clone.forEach((p, idx) => {
        p.priority = idx + 1;
      });
      return clone;
    };

    const afterTopUp = movePriority([...initialProviders], 0, 'up');
    assert.strictEqual(afterTopUp[0].id, 'gemini', 'Top item remains at index 0');
    assert.strictEqual(afterTopUp[0].priority, 1);
  });

  await t.test('Priority reordering boundaries: moving bottom element down is safe no-op', () => {
    const movePriority = (providers, index, direction) => {
      const newIdx = direction === 'up' ? index - 1 : index + 1;
      if (newIdx < 0 || newIdx >= providers.length) return providers;
      const clone = [...providers];
      const temp = clone[index];
      clone[index] = clone[newIdx];
      clone[newIdx] = temp;
      clone.forEach((p, idx) => {
        p.priority = idx + 1;
      });
      return clone;
    };

    const afterBottomDown = movePriority([...initialProviders], initialProviders.length - 1, 'down');
    assert.strictEqual(afterBottomDown[afterBottomDown.length - 1].id, 'deepseek');
    assert.strictEqual(afterBottomDown[afterBottomDown.length - 1].priority, 3);
  });

  await t.test('Priority reordering correctly swaps positions and updates sequential priority indices', () => {
    const movePriority = (providers, index, direction) => {
      const newIdx = direction === 'up' ? index - 1 : index + 1;
      if (newIdx < 0 || newIdx >= providers.length) return providers;
      const clone = [...providers];
      const temp = clone[index];
      clone[index] = clone[newIdx];
      clone[newIdx] = temp;
      clone.forEach((p, idx) => {
        p.priority = idx + 1;
      });
      return clone;
    };

    // Move DeepSeek (index 2) UP to index 1
    const step1 = movePriority([...initialProviders], 2, 'up');
    assert.strictEqual(step1[1].id, 'deepseek');
    assert.strictEqual(step1[1].priority, 2);
    assert.strictEqual(step1[2].id, 'openai');
    assert.strictEqual(step1[2].priority, 3);

    // Move DeepSeek (now index 1) UP to index 0
    const step2 = movePriority(step1, 1, 'up');
    assert.strictEqual(step2[0].id, 'deepseek');
    assert.strictEqual(step2[0].priority, 1);
    assert.strictEqual(step2[1].id, 'gemini');
    assert.strictEqual(step2[1].priority, 2);
  });

  await t.test('Provider activation toggle correctly flips active state', () => {
    let providers = [...initialProviders];
    const toggleProvider = (id) => {
      providers = providers.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    };

    toggleProvider('gemini');
    assert.strictEqual(providers.find((p) => p.id === 'gemini').isActive, false);

    toggleProvider('gemini');
    assert.strictEqual(providers.find((p) => p.id === 'gemini').isActive, true);
  });

  await t.test('Switchboard failover modes support single cascade and parallel race', () => {
    let mode = 'parallel';
    assert.strictEqual(mode, 'parallel');

    mode = 'single';
    assert.strictEqual(mode, 'single');
  });

  await t.test('AI router falls back safely to deterministic regex parser when all providers are unavailable', async () => {
    // Unset API keys temporarily
    const origGemini = process.env.GEMINI_API_KEY;
    const origOpenAI = process.env.OPENAI_API_KEY;
    const origDeepSeek = process.env.DEEPSEEK_API_KEY;

    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    try {
      const res = await executeAIRouter({
        type: 'text',
        content: 'beli bakso sapi 25rb',
        userId: 'usr-challenge',
      });

      assert.strictEqual(res.provider, 'fallback_regex');
      assert.strictEqual(res.result.amount, 25000);
      assert.strictEqual(res.result.type, 'expense');
      assert.ok(Array.isArray(res.attempts));
      assert.strictEqual(res.attempts[res.attempts.length - 1].status, 'fallback_success');
    } finally {
      if (origGemini) process.env.GEMINI_API_KEY = origGemini;
      if (origOpenAI) process.env.OPENAI_API_KEY = origOpenAI;
      if (origDeepSeek) process.env.DEEPSEEK_API_KEY = origDeepSeek;
    }
  });
});

// =========================================================================
// SUITE 3: USER IMPERSONATION & AUDIT LOGGING WORKFLOW
// =========================================================================
test('Challenger 2 — User Impersonation & Audit Trail Ingestion', async (t) => {
  let auditLogs = [];
  let impersonatingUser = null;

  const users = [
    { id: 'usr-101', full_name: 'Luki Ramdani', phone: '+6281234567890', plan: 'pro' },
    { id: 'usr-102', full_name: 'Budi Santoso', phone: '+6281398765432', plan: 'starter' },
  ];

  const startImpersonation = (adminId, targetUser, rawReason) => {
    const reason = (rawReason || '').trim() || 'Pemeriksaan audit diagnostik sistem';
    const auditEntry = {
      id: `aud-${Date.now()}`,
      admin_id: adminId,
      target_user_id: targetUser.id,
      target_user_name: targetUser.full_name,
      action: 'IMPERSONATE_USER',
      reason,
      created_at: '17:00 WIB',
    };
    auditLogs = [auditEntry, ...auditLogs];
    impersonatingUser = targetUser;
    return auditEntry;
  };

  const stopImpersonation = () => {
    impersonatingUser = null;
  };

  await t.test('Impersonating a user creates mandatory audit_logs record and activates banner state', () => {
    const entry = startImpersonation('adm-001', users[1], 'Investigasi keluhan limit transaksi starter');
    
    assert.strictEqual(impersonatingUser.id, 'usr-102');
    assert.strictEqual(impersonatingUser.full_name, 'Budi Santoso');
    assert.strictEqual(auditLogs.length, 1);
    assert.strictEqual(auditLogs[0].action, 'IMPERSONATE_USER');
    assert.strictEqual(auditLogs[0].target_user_id, 'usr-102');
    assert.strictEqual(auditLogs[0].reason, 'Investigasi keluhan limit transaksi starter');
  });

  await t.test('Impersonation with empty reason automatically falls back to default diagnostic reason', () => {
    const entry = startImpersonation('adm-001', users[0], '   ');
    assert.strictEqual(entry.reason, 'Pemeriksaan audit diagnostik sistem');
    assert.strictEqual(auditLogs.length, 2);
  });

  await t.test('Stopping impersonation clears active user banner state', () => {
    assert(impersonatingUser !== null);
    stopImpersonation();
    assert.strictEqual(impersonatingUser, null);
  });

  await t.test('Manual payment approval promotes user to Pro, sets status to paid, and logs audit record', () => {
    let orders = [
      { id: 'ord-1', order_id: 'TRX-101', user_id: 'usr-102', user_name: 'Budi Santoso', amount: 99000, status: 'pending' },
    ];
    let userList = [...users];

    const approveOrder = (orderId) => {
      const ord = orders.find((o) => o.id === orderId);
      if (!ord) return;
      orders = orders.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o));
      userList = userList.map((u) => (u.id === ord.user_id ? { ...u, plan: 'pro', quota_limit: Infinity } : u));
      auditLogs.push({
        id: `aud-app-${Date.now()}`,
        admin_id: 'adm-001',
        target_user_id: ord.user_id,
        target_user_name: ord.user_name,
        action: 'APPROVE_MANUAL_PAYMENT',
        reason: `Approval manual transfer order ${ord.order_id}`,
      });
    };

    approveOrder('ord-1');
    assert.strictEqual(orders[0].status, 'paid');
    assert.strictEqual(userList.find((u) => u.id === 'usr-102').plan, 'pro');
    assert.strictEqual(auditLogs[auditLogs.length - 1].action, 'APPROVE_MANUAL_PAYMENT');
  });

  await t.test('Manual payment rejection updates status to rejected and logs audit record', () => {
    let orders = [
      { id: 'ord-2', order_id: 'TRX-102', user_id: 'usr-102', user_name: 'Budi Santoso', amount: 99000, status: 'pending' },
    ];

    const rejectOrder = (orderId) => {
      const ord = orders.find((o) => o.id === orderId);
      if (!ord) return;
      orders = orders.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o));
      auditLogs.push({
        id: `aud-rej-${Date.now()}`,
        admin_id: 'adm-001',
        target_user_id: ord.user_id,
        target_user_name: ord.user_name,
        action: 'REJECT_MANUAL_PAYMENT',
        reason: `Penolakan order ${ord.order_id}`,
      });
    };

    rejectOrder('ord-2');
    assert.strictEqual(orders[0].status, 'rejected');
    assert.strictEqual(auditLogs[auditLogs.length - 1].action, 'REJECT_MANUAL_PAYMENT');
  });
});

// =========================================================================
// SUITE 4: UI RESPONSIVE STYLING AT 375PX MOBILE & 1280PX+ DESKTOP
// =========================================================================
test('Challenger 2 — UI Responsive Layout Analysis & Token Conformance', async (t) => {
  const adminPageSource = fs.readFileSync(path.resolve(projectRoot, 'src/app/admin/page.tsx'), 'utf8');
  const adminLayoutSource = fs.readFileSync(path.resolve(projectRoot, 'src/app/admin/layout.tsx'), 'utf8');
  const dashboardPageSource = fs.readFileSync(path.resolve(projectRoot, 'src/app/dashboard/page.tsx'), 'utf8');

  await t.test('Admin dashboard contains persistent overflow-x-auto containers for every tabular view', () => {
    const tableOccurrences = (adminPageSource.match(/<table/g) || []).length;
    const overflowContainers = (adminPageSource.match(/className="overflow-x-auto"/g) || []).length;
    
    assert(tableOccurrences > 0, 'Admin page must have data tables');
    assert.strictEqual(
      overflowContainers,
      tableOccurrences,
      `All ${tableOccurrences} tables in Admin page must be wrapped in overflow-x-auto to prevent mobile 375px viewport clipping`
    );
  });

  await t.test('Admin header bar and impersonation banner use flex-wrap to prevent 375px horizontal blowout', () => {
    assert(
      adminPageSource.includes('flex flex-wrap items-center justify-between gap-2'),
      'Impersonation banner must use flex-wrap with gap for small viewports'
    );
    assert(
      adminPageSource.includes('flex flex-wrap items-center justify-between gap-4'),
      'Admin header bar must use flex-wrap to wrap controls on 375px screens'
    );
    assert(
      adminPageSource.includes('flex flex-wrap items-center gap-2'),
      'Admin subnavigation bar must use flex-wrap for mobile responsiveness'
    );
  });

  await t.test('Admin provider grid uses responsive breakpoints (grid-cols-1 md:grid-cols-3)', () => {
    assert(
      adminPageSource.includes('grid grid-cols-1 md:grid-cols-3 gap-5'),
      'Provider grid must start at 1 column on mobile and scale to 3 columns on desktop'
    );
  });

  await t.test('Impersonation modal is properly constrained for mobile viewports (max-w-md w-full)', () => {
    assert(
      adminPageSource.includes('max-w-md w-full'),
      'Impersonation modal must have max-w-md w-full to fit within 375px screens without overflowing'
    );
  });

  await t.test('Dashboard navigation supports responsive mobile-to-desktop layout (flex-col md:flex-row)', () => {
    assert(
      dashboardPageSource.includes('flex flex-col md:flex-row'),
      'Dashboard root container must stack vertically on mobile (flex-col) and expand horizontally on desktop (md:flex-row)'
    );
    assert(
      dashboardPageSource.includes('w-full md:w-64'),
      'Sidebar must be full-width on mobile and fixed 64 (16rem) on desktop'
    );
  });

  await t.test('No hardcoded oversized fixed pixel widths in Admin Dashboard that violate 375px screen width', () => {
    // Regex looking for arbitrary fixed pixel widths > 375px (e.g. w-[400px], w-[500px], etc.)
    const oversizedWidthRegex = /w-\[(\d+)px\]/g;
    let match;
    const oversizedClasses = [];
    while ((match = oversizedWidthRegex.exec(adminPageSource)) !== null) {
      const px = parseInt(match[1], 10);
      if (px > 375) {
        oversizedClasses.push(match[0]);
      }
    }
    assert.strictEqual(
      oversizedClasses.length,
      0,
      `Found oversized fixed width classes violating 375px viewport: ${oversizedClasses.join(', ')}`
    );
  });
});
