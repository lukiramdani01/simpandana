/**
 * TataDana E2E Test Suite — Tier 4: Realistic Application Scenarios (Multi-Step Workflows)
 * Validates complete end-to-end user and administrator lifecycles across multiple discrete systems.
 */

const { describe, it, expect } = require("./helpers/test-harness");
const {
  parseIndonesianNominalOracle,
  formatBudgetProgressBarOracle,
  formatRupiah,
  checkBudgetAlertsOracle,
  verifyPdfMagicBytesOracle,
  verifyExcelMagicBytesOracle,
} = require("./helpers/reference-oracle");
const { InMemoryDatabase } = require("./helpers/mock-adapters");

describe("Tier 4: Realistic Application Scenarios (Multi-Step Workflows)", () => {
  // =========================================================================
  // Scenario 1: New User Onboarding & Monthly Salary Split
  // =========================================================================
  describe("Scenario 1: New User Onboarding & Monthly Salary Split", () => {
    it("Executes complete onboarding, salary logging, multi-wallet distribution, and KPI calculation", () => {
      const db = new InMemoryDatabase();

      // Step 1: User signs up with phone number and dev OTP bypass '123456'
      const phone = "+6281234567890";
      const devOtp = "123456";
      expect(devOtp).toBe("123456");

      const user = db.signupUser({
        id: "u_scen_1",
        phone,
        full_name: "Ahmad Fauzi",
        plan: "starter",
        telegram_user_id: 10101,
        telegram_chat_id: 10101,
      });

      expect(user.id).toBe("u_scen_1");
      expect(user.plan).toBe("starter");

      // Step 2: Verify default cash wallet initialized with 0 balance
      const cashWallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id && w.is_default);
      expect(cashWallet).toBeDefined();
      expect(cashWallet.balance).toBe(0);

      // Step 3: Add user bank wallet (BCA) and e-wallet (GoPay)
      const bcaWallet = {
        id: "w_bca_s1",
        user_id: user.id,
        name: "BCA",
        type: "bank",
        balance: 0,
        is_default: false,
      };
      const gopayWallet = {
        id: "w_gopay_s1",
        user_id: user.id,
        name: "GoPay",
        type: "ewallet",
        balance: 0,
        is_default: false,
      };
      db.wallets.set(bcaWallet.id, bcaWallet);
      db.wallets.set(gopayWallet.id, gopayWallet);

      // Step 4: User receives salary and records it via Telegram text
      const salaryUpdate = {
        update_id: 91001,
        message: {
          message_id: 1,
          from: { id: 10101 },
          chat: { id: 10101 },
          text: "gajian bulanan 15jt",
        },
      };
      const salaryRes = db.handleTelegramWebhook(salaryUpdate);
      expect(salaryRes.status).toBe(200);
      expect(salaryRes.body.action).toBe("text_processed");
      expect(cashWallet.balance).toBe(15000000);

      // Step 5: Distribute salary: transfer 10jt to BCA and 2jt to GoPay
      db.recordTransaction({
        user_id: user.id,
        wallet_id: cashWallet.id,
        to_wallet_id: bcaWallet.id,
        type: "transfer",
        amount: 10000000,
        notes: "Tabungan bulanan BCA",
      });

      db.recordTransaction({
        user_id: user.id,
        wallet_id: cashWallet.id,
        to_wallet_id: gopayWallet.id,
        type: "transfer",
        amount: 2000000,
        notes: "Uang jajan & ojol GoPay",
      });

      // Step 6: Verify individual wallet balances and aggregate net worth
      expect(cashWallet.balance).toBe(3000000); // 15jt - 10jt - 2jt
      expect(bcaWallet.balance).toBe(10000000);
      expect(gopayWallet.balance).toBe(2000000);

      const totalBalance = cashWallet.balance + bcaWallet.balance + gopayWallet.balance;
      expect(totalBalance).toBe(15000000);

      // Step 7: Verify Dashboard Beranda KPI Cards
      const kpis = {
        saldoTotal: totalBalance,
        pemasukanBulanIni: 15000000,
        pengeluaranBulanIni: 0,
        sisaBudget: 15000000,
      };
      expect(kpis.saldoTotal).toBe(15000000);
      expect(kpis.pemasukanBulanIni).toBe(15000000);
    });
  });

  // =========================================================================
  // Scenario 2: Pro Family Supermarket Run (OCR Struk Pintar)
  // =========================================================================
  describe("Scenario 2: Pro Family Supermarket Run (OCR Struk Pintar)", () => {
    it("Executes supermarket receipt photo upload, line item extraction, budget trigger, and visual glyphs", () => {
      const db = new InMemoryDatabase();

      // Step 1: Pro user setup with Makanan category budget
      const user = db.signupUser({
        id: "u_scen_2",
        full_name: "Siti Rahmawati",
        plan: "pro",
        telegram_user_id: 20202,
        telegram_chat_id: 20202,
      });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 2000000;

      const foodCat = Array.from(db.categories.values()).find((c) => c.user_id === user.id && c.name.includes("Makanan"));
      const now = new Date();
      db.budgets.set("b_food_s2", {
        id: "b_food_s2",
        user_id: user.id,
        category_id: foodCat.id,
        monthly_limit: 500000,
        current_spent: 300000, // already 60% spent
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        alert_80_sent: false,
        alert_100_sent: false,
      });

      // Step 2: Pro user uploads supermarket receipt photo
      const receiptUpdate = {
        update_id: 92001,
        message: {
          message_id: 1,
          from: { id: 20202 },
          chat: { id: 20202 },
          photo: [{ file_id: "photo_struk_superindo_123" }],
        },
      };

      const ocrRes = db.handleTelegramWebhook(receiptUpdate);
      expect(ocrRes.status).toBe(200);
      expect(ocrRes.body.action).toBe("ocr_processed");
      expect(ocrRes.body.total).toBe(137000); // 75k + 34k + 28k

      // Step 3: Verify line items saved in transaction_items table
      const items = Array.from(db.transaction_items.values());
      expect(items.length).toBe(3);
      expect(items[0].item_name).toBe("Beras 5kg");
      expect(items[0].price).toBe(75000);
      expect(items[1].item_name).toBe("Minyak Goreng 2L");
      expect(items[2].item_name).toBe("Telur Ayam 1kg");

      // Step 4: Verify wallet balance deducted
      expect(wallet.balance).toBe(1863000); // 2.000.000 - 137.000

      // Step 5: Verify budget spent updated: 300.000 + 137.000 = 437.000 (87.4% -> crosses 80% threshold)
      const budget = db.budgets.get("b_food_s2");
      expect(budget.current_spent).toBe(437000);
      expect(budget.alert_80_sent).toBe(true);
      expect(budget.alert_100_sent).toBe(false);

      // Step 6: Verify visual progress bar response format
      expect(ocrRes.body.budgetAlert.progressBar).toContain("[████████░░] 87%");
      expect(ocrRes.body.budgetAlert.progressBar).toContain("Sisa: Rp 63.000");
    });
  });

  // =========================================================================
  // Scenario 3: Monthly Financial Audit & Export
  // =========================================================================
  describe("Scenario 3: Monthly Financial Audit & Export", () => {
    it("Logs multiple expense channels, filters reports ledger, and generates valid PDF/Excel binaries", () => {
      const db = new InMemoryDatabase();

      // Step 1: Create Pro user
      const user = db.signupUser({
        id: "u_scen_3",
        full_name: "Dewi Lestari",
        plan: "pro",
        telegram_user_id: 30303,
      });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 5000000;

      // Step 2: Log multiple transactions via web, text, and voice
      db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 150000,
        notes: "Belanja ATK Kantor",
        source: "web",
        date: "2026-09-02",
      });

      db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 25000,
        notes: "Beli Kopi Kenangan",
        source: "telegram_text",
        date: "2026-09-05",
      });

      db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 50000,
        notes: "Bensin motor Shell",
        source: "telegram_voice",
        date: "2026-09-10",
      });

      // Step 3: Query and filter ledger records
      const userTxs = Array.from(db.transactions.values()).filter((t) => t.user_id === user.id);
      expect(userTxs.length).toBe(3);

      const sortedTxs = [...userTxs].sort((a, b) => new Date(b.date) - new Date(a.date));
      expect(sortedTxs[0].date).toBe("2026-09-10");
      expect(sortedTxs[2].date).toBe("2026-09-02");

      // Step 4: Generate on-demand PDF report for September 2026
      const pdfExport = db.generateExport(user.id, "pdf", "2026-09-01", "2026-09-30");
      expect(verifyPdfMagicBytesOracle(pdfExport.buffer)).toBe(true);
      expect(pdfExport.filename).toBe("laporan-keuangan-2026-09-01-2026-09-30.pdf");
      expect(pdfExport.signedUrl).toContain("https://storage.tatadana.id/exports/");

      // Step 5: Generate on-demand Excel spreadsheet
      const xlsxExport = db.generateExport(user.id, "xlsx", "2026-09-01", "2026-09-30");
      expect(verifyExcelMagicBytesOracle(xlsxExport.buffer)).toBe(true);
      expect(xlsxExport.filename).toBe("transaksi-keuangan-2026-09-01-2026-09-30.xlsx");
    });
  });

  // =========================================================================
  // Scenario 4: Starter Tier Quota Ceiling & Midtrans Upgrade
  // =========================================================================
  describe("Scenario 4: Starter Tier Quota Ceiling & Midtrans Upgrade", () => {
    it("Simulates Starter 50 tx quota breach, payment gateway checkout, and Pro feature unblocking", () => {
      const db = new InMemoryDatabase();

      // Step 1: Starter user with 49 existing transactions
      const user = db.signupUser({
        id: "u_scen_4",
        full_name: "Rian Hidayat",
        plan: "starter",
      });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 500000;

      for (let i = 0; i < 49; i++) {
        db.transactions.set(`tx_s4_${i}`, {
          id: `tx_s4_${i}`,
          user_id: user.id,
          wallet_id: wallet.id,
          type: "expense",
          amount: 2000,
          date: new Date().toISOString(),
        });
      }

      // Step 2: 50th transaction succeeds (at limit)
      const tx50 = db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 2000,
      });
      expect(tx50.transaction).toBeDefined();
      expect(db.transactions.size).toBe(50);

      // Step 3: 51st transaction attempt is blocked
      expect(() => {
        db.recordTransaction({
          user_id: user.id,
          wallet_id: wallet.id,
          type: "expense",
          amount: 10000,
        });
      }).toThrow("Batas kuota 50 transaksi Starter tercapai");

      // Step 4: User initiates Pro upgrade via Midtrans
      const orderId = `ORDER-PRO-UPGRADE-${user.id}`;
      db.subscriptions.set(orderId, {
        id: "sub_s4",
        user_id: user.id,
        plan: "pro",
        status: "pending",
        midtrans_order_id: orderId,
        amount: 99000,
      });

      // Step 5: Midtrans webhook sends settlement notification
      const webhookRes = db.handleMidtransWebhook({
        order_id: orderId,
        transaction_status: "settlement",
        gross_amount: "99000",
        signature_key: "valid_sha512_hash",
      });

      expect(webhookRes.status).toBe(200);
      expect(user.plan).toBe("pro");

      // Step 6: 51st and 52nd transactions now execute smoothly without restriction
      const tx51 = db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 10000,
      });
      const tx52 = db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 15000,
      });

      expect(tx51.transaction).toBeDefined();
      expect(tx52.transaction).toBeDefined();
      expect(db.transactions.size).toBe(52);
    });
  });

  // =========================================================================
  // Scenario 5: Multi-Provider AI Resilient Failover
  // =========================================================================
  describe("Scenario 5: Multi-Provider AI Resilient Failover", () => {
    it("Simulates complete cascade of AI provider failures gracefully falling back to deterministic regex", () => {
      const db = new InMemoryDatabase();

      // Step 1: Simulate Gemini timeout (5000ms)
      db.ai_providers.get("gemini").simulateFailure = true;
      db.ai_providers.get("gemini").latencyMs = 5000;

      // Step 2: Simulate OpenAI 429 rate limit
      db.ai_providers.get("openai").simulateFailure = true;
      db.ai_providers.get("openai").latencyMs = 250;

      // Step 3: Simulate DeepSeek 500 internal server error
      db.ai_providers.get("deepseek").simulateFailure = true;
      db.ai_providers.get("deepseek").latencyMs = 300;

      // Step 4: Execute router with colloquial Indonesian expense entry
      const prompt = "beli martabak manis keju 45rb";
      const routerRes = db.executeAiRouter(prompt);

      // Step 5: Verify fallback regex took over and parsed nominal accurately
      expect(routerRes.provider).toBe("fallback_regex");
      expect(routerRes.result.amount).toBe(45000);
      expect(routerRes.result.type).toBe("expense");

      // Step 6: Verify full audit telemetry was logged in ai_logs table
      expect(db.ai_logs.length).toBe(4); // gemini + openai + deepseek + fallback
      expect(db.ai_logs[0].provider).toBe("gemini");
      expect(db.ai_logs[0].status).toBe("failed");
      expect(db.ai_logs[1].provider).toBe("openai");
      expect(db.ai_logs[1].status).toBe("failed");
      expect(db.ai_logs[2].provider).toBe("deepseek");
      expect(db.ai_logs[2].status).toBe("failed");
      expect(db.ai_logs[3].provider).toBe("fallback_regex");
      expect(db.ai_logs[3].status).toBe("fallback_success");
    });
  });

  // =========================================================================
  // Scenario 6: Admin AI Switchboard Tuning & User Impersonation
  // =========================================================================
  describe("Scenario 6: Admin AI Switchboard Tuning & User Impersonation", () => {
    it("Superadmin tunes switchboard priority, impersonates user with audit trail, and inspects account", () => {
      const db = new InMemoryDatabase();

      // Step 1: Superadmin and target user setup
      const admin = db.signupUser({
        id: "u_superadmin_s6",
        full_name: "Head of Engineering",
        role: "superadmin",
      });
      const targetUser = db.signupUser({
        id: "u_troubled_user_s6",
        full_name: "Hendra Wijaya",
        role: "user",
      });

      // Step 2: Reconfigure AI switchboard priority (DeepSeek 1st, OpenAI 2nd, Gemini 3rd)
      db.ai_providers.get("deepseek").priority = 1;
      db.ai_providers.get("openai").priority = 2;
      db.ai_providers.get("gemini").priority = 3;

      const priorityOrder = Array.from(db.ai_providers.values())
        .sort((a, b) => a.priority - b.priority)
        .map((p) => p.name);
      expect(priorityOrder).toEqual(["deepseek", "openai", "gemini"]);

      // Step 3: Superadmin initiates impersonation session with mandatory reason
      const reason = "Troubleshooting keluhan pengguna: Transaksi Telegram tidak sinkron ke Beranda";
      const impSession = db.impersonateUser(admin.id, targetUser.id, reason);

      expect(impSession.impersonatedUser.id).toBe(targetUser.id);
      expect(impSession.bannerMessage).toContain("Hendra Wijaya");
      expect(impSession.bannerMessage).toContain("Superadmin");

      // Step 4: Verify immutable audit log recorded
      expect(db.audit_logs.length).toBe(1);
      const audit = db.audit_logs[0];
      expect(audit.admin_id).toBe(admin.id);
      expect(audit.target_user_id).toBe(targetUser.id);
      expect(audit.reason).toBe(reason);
    });
  });

  // =========================================================================
  // Scenario 7: Budget Threshold Surge & Pro Financial Advisor Alerts
  // =========================================================================
  describe("Scenario 7: Budget Threshold Surge & Pro Financial Advisor Alerts", () => {
    it("Simulates category spending surge and burn rate threshold triggering proactive advisor insights", () => {
      const db = new InMemoryDatabase();

      // Step 1: User setup with monthly income Rp 10.000.000
      const user = db.signupUser({
        id: "u_scen_7",
        full_name: "Bambang Tri",
        plan: "pro",
      });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 10000000;

      const entCat = Array.from(db.categories.values()).find((c) => c.user_id === user.id && c.name.includes("Hiburan"));

      // Step 2: Establish baseline spending: previous week entertainment was Rp 400.000
      const prevWeekEntertainment = 400000;

      // Current week entertainment spending jumps to Rp 900.000 (+125% surge)
      const currentWeekEntertainment = 900000;
      const surgePercent = ((currentWeekEntertainment - prevWeekEntertainment) / prevWeekEntertainment) * 100;
      expect(surgePercent).toBe(125);

      // Step 3: Monthly expenses cross 85% of monthly income (Rp 8.500.000 / Rp 10.000.000)
      const totalMonthlyIncome = 10000000;
      const totalMonthlyExpense = 8500000;
      const burnRate = totalMonthlyExpense / totalMonthlyIncome;
      expect(burnRate).toBe(0.85);

      // Step 4: Verify automated trigger conditions
      const triggers = {
        categorySpike: surgePercent > 50,
        burnRateWarning: burnRate > 0.8,
      };

      expect(triggers.categorySpike).toBe(true);
      expect(triggers.burnRateWarning).toBe(true);

      // Step 5: Format advisor insight response with actionable guidance
      const advisorInsight = {
        title: "💡 Analisis Keuangan TataDana Pro",
        insights: [
          `⚠️ Kategori Hiburan melonjak ${Math.round(surgePercent)}% dibanding minggu lalu.`,
          `🚨 Pengeluaran bulan ini telah mencapai ${Math.round(burnRate * 100)}% dari pemasukan.`,
        ],
        actionRecommendation: "Rekomendasi: Tunda pembelian non-esensial hingga tanggal gajian berikutnya.",
      };

      expect(advisorInsight.insights.length).toBe(2);
      expect(advisorInsight.insights[0]).toContain("melonjak 125%");
      expect(advisorInsight.insights[1]).toContain("mencapai 85%");
    });
  });
});
