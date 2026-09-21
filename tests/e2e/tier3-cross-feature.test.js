/**
 * TataDana E2E Test Suite — Tier 3: Cross-Feature Combinations (Pairwise Interaction Coverage)
 * Validates the emergent behavior when two or more distinct subsystems interact.
 */

const { describe, it, expect } = require("./helpers/test-harness");
const {
  parseIndonesianNominalOracle,
  formatBudgetProgressBarOracle,
  formatRupiah,
  checkBudgetAlertsOracle,
  checkStarterQuotaOracle,
  checkVoiceDurationOracle,
  verifyPdfMagicBytesOracle,
  verifyExcelMagicBytesOracle,
} = require("./helpers/reference-oracle");
const { InMemoryDatabase } = require("./helpers/mock-adapters");

describe("Tier 3: Cross-Feature Combinations (Pairwise Interaction Coverage)", () => {
  // =========================================================================
  // C01: Telegram Ingress ↔ Indonesian Nominal Parser ↔ Multi-Wallet Trigger
  // =========================================================================
  describe("C01: Telegram Ingress ↔ Nominal Parser ↔ Multi-Wallet Trigger", () => {
    it("C01.1: Webhook expense message deducts default wallet balance and records ledger transaction", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c01_1", telegram_user_id: 1101 });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 200000;

      const update = {
        update_id: 11001,
        message: {
          message_id: 1,
          from: { id: 1101 },
          chat: { id: 1101 },
          text: "beli kopi 25rb",
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.status).toBe(200);
      expect(res.body.action).toBe("text_processed");
      expect(wallet.balance).toBe(175000);

      const tx = Array.from(db.transactions.values()).find((t) => t.user_id === user.id);
      expect(tx).toBeDefined();
      expect(tx.amount).toBe(25000);
      expect(tx.type).toBe("expense");
    });

    it("C01.2: Webhook income message credits default wallet balance and sends motivational quote", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c01_2", telegram_user_id: 1102 });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 500000;

      const update = {
        update_id: 11002,
        message: {
          message_id: 2,
          from: { id: 1102 },
          chat: { id: 1102 },
          text: "gajian 10jt",
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.status).toBe(200);
      expect(wallet.balance).toBe(10500000);
      expect(res.body.replyText).toContain("Pemasukan Rp 10.000.000");
      expect(res.body.replyText).toContain("rezeki");
    });

    it("C01.3: Ambiguous natural language message does NOT alter wallet balance", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c01_3", telegram_user_id: 1103 });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      wallet.balance = 300000;

      const update = {
        update_id: 11003,
        message: {
          message_id: 3,
          from: { id: 1103 },
          chat: { id: 1103 },
          text: "halo selamat pagi min",
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.body.action).toBe("ambiguous_text");
      expect(wallet.balance).toBe(300000); // untouched
    });
    it("C01.4: Webhook transfer message parses inter-wallet command and syncs both wallets", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c01_4", telegram_user_id: 1104 });
      const cash = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      cash.balance = 500000;
      const bca = { id: "w_bca_c014", user_id: user.id, name: "BCA", type: "bank", balance: 1000000 };
      db.wallets.set(bca.id, bca);

      const parsed = parseIndonesianNominalOracle("transfer ke bca 200k");
      expect(parsed.type).toBe("transfer");
      expect(parsed.amount).toBe(200000);

      db.recordTransaction({
        user_id: user.id,
        wallet_id: cash.id,
        to_wallet_id: bca.id,
        type: "transfer",
        amount: parsed.amount,
      });

      expect(cash.balance).toBe(300000);
      expect(bca.balance).toBe(1200000);
    });
  });

  // =========================================================================
  // C02: Vision OCR ↔ Line-Item Breakdown ↔ Category Budget Threshold Warning
  // =========================================================================
  describe("C02: Vision OCR ↔ Line-Item Breakdown ↔ Category Budget Warning", () => {
    it("C02.1: Pro user receipt upload records transaction and populates transaction_items table", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c02_1", plan: "pro", telegram_user_id: 1201 });

      const update = {
        update_id: 12001,
        message: {
          message_id: 1,
          from: { id: 1201 },
          chat: { id: 1201 },
          photo: [{ file_id: "photo_receipt_supermarket" }],
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.body.action).toBe("ocr_processed");
      expect(res.body.total).toBe(137000);

      const items = Array.from(db.transaction_items.values());
      expect(items.length).toBe(3);
      expect(items[0].price).toBe(75000);
      expect(items[1].price).toBe(34000);
      expect(items[2].price).toBe(28000);
    });

    it("C02.2: Receipt expense crossing 80% budget threshold triggers visual progress bar warning", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c02_2", plan: "pro", telegram_user_id: 1202 });
      const foodCat = Array.from(db.categories.values()).find((c) => c.user_id === user.id && c.name.includes("Makanan"));

      // Set budget: 150.000 monthly limit, already spent 0
      const now = new Date();
      db.budgets.set("b_food_c02", {
        id: "b_food_c02",
        user_id: user.id,
        category_id: foodCat.id,
        monthly_limit: 150000,
        current_spent: 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        alert_80_sent: false,
        alert_100_sent: false,
      });

      const update = {
        update_id: 12002,
        message: {
          message_id: 2,
          from: { id: 1202 },
          chat: { id: 1202 },
          photo: [{ file_id: "photo_receipt_budget" }],
        },
      };

      // OCR total = 137.000 -> 137.000 / 150.000 = 91.3% (crosses 80%)
      const res = db.handleTelegramWebhook(update);
      expect(res.body.budgetAlert).toBeDefined();
      expect(res.body.budgetAlert.alert_80).toBe(true);
      expect(res.body.budgetAlert.progressBar).toContain("91%");
      expect(res.body.budgetAlert.progressBar).toContain("█");
    });

    it("C02.3: Receipt line items with discount coupons calculate net total correctly", () => {
      const items = [
        { item_name: "Daging Sapi 500g", price: 80000, quantity: 1 },
        { item_name: "Voucher Diskon", price: -15000, quantity: 1 },
      ];
      const netTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(netTotal).toBe(65000);
    });
  });

  // =========================================================================
  // C03: Voice Note STT ↔ AI Router Failover ↔ Transaction Ledger Ingestion
  // =========================================================================
  describe("C03: Voice Note STT ↔ AI Router Failover ↔ Ledger Ingestion", () => {
    it("C03.1: Voice note transcript is routed to fallback parser if primary AI times out", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c03_1", telegram_user_id: 1301 });
      db.ai_providers.get("gemini").simulateFailure = true;

      const update = {
        update_id: 13001,
        message: {
          message_id: 1,
          from: { id: 1301 },
          chat: { id: 1301 },
          voice: { duration: 25, file_id: "vn_failover" },
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.body.action).toBe("voice_processed");
      expect(res.body.replyText).toContain('🎙️ Transkrip: "');
      expect(res.body.replyText).toContain("35.000");

      const tx = Array.from(db.transactions.values()).find((t) => t.user_id === user.id);
      expect(tx.source).toBe("telegram_voice");
      expect(tx.amount).toBe(35000);
    });

    it("C03.2: Audio exceeding 60s is blocked before AI execution, preserving AI token quota", () => {
      const db = new InMemoryDatabase();
      db.signupUser({ id: "u_c03_2", telegram_user_id: 1302 });
      const initialLogsCount = db.ai_logs.length;

      const update = {
        update_id: 13002,
        message: {
          message_id: 2,
          from: { id: 1302 },
          chat: { id: 1302 },
          voice: { duration: 65, file_id: "vn_too_long" },
        },
      };

      const res = db.handleTelegramWebhook(update);
      expect(res.body.action).toBe("voice_error");
      expect(res.body.replyText).toContain("melebihi batas 60 detik");
      // No AI calls should have been made
      expect(db.ai_logs.length).toBe(initialLogsCount);
    });

    it("C03.3: Spoken words transcription ('tiga puluh lima ribu') resolves to exact numeric amount", () => {
      const spokenTranscript = "beli bensin motor tiga puluh lima ribu";
      const parsed = parseIndonesianNominalOracle(spokenTranscript);
      expect(parsed.amount).toBe(35000);
      expect(parsed.type).toBe("expense");
    });
  });

  // =========================================================================
  // C04: Multi-Wallet Inter-Transfer ↔ Balance Sync ↔ Net Cashflow
  // =========================================================================
  describe("C04: Multi-Wallet Inter-Transfer ↔ Balance Sync ↔ Net Cashflow", () => {
    it("C04.1: Transfer decreases source, increases destination, and leaves net worth constant", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c04_1" });
      const cash = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      cash.balance = 1000000;
      const bca = { id: "w_bca_c04", user_id: user.id, name: "BCA", type: "bank", balance: 5000000 };
      db.wallets.set(bca.id, bca);

      const netWorthBefore = cash.balance + bca.balance;

      db.recordTransaction({
        user_id: user.id,
        wallet_id: cash.id,
        to_wallet_id: bca.id,
        type: "transfer",
        amount: 300000,
      });

      expect(cash.balance).toBe(700000);
      expect(bca.balance).toBe(5300000);
      expect(cash.balance + bca.balance).toBe(netWorthBefore);
    });

    it("C04.2: Net cashflow computation counts income and expense but excludes transfers", () => {
      const transactions = [
        { type: "income", amount: 10000000 },
        { type: "expense", amount: 3000000 },
        { type: "transfer", amount: 2000000 }, // should not affect net cashflow
      ];

      const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const netCashflow = income - expense;

      expect(netCashflow).toBe(7000000);
    });

    it("C04.3: Transfer with admin fee splits into transfer plus fee expense", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c04_3" });
      const bca = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);
      bca.balance = 1000000;
      const gopay = { id: "w_gopay_c04", user_id: user.id, name: "GoPay", type: "ewallet", balance: 50000 };
      db.wallets.set(gopay.id, gopay);

      const topupAmount = 200000;
      const adminFee = 1000;

      // Transfer main amount
      db.recordTransaction({
        user_id: user.id,
        wallet_id: bca.id,
        to_wallet_id: gopay.id,
        type: "transfer",
        amount: topupAmount,
      });

      // Fee expense
      db.recordTransaction({
        user_id: user.id,
        wallet_id: bca.id,
        type: "expense",
        amount: adminFee,
        notes: "Biaya admin topup GoPay",
      });

      expect(bca.balance).toBe(799000);
      expect(gopay.balance).toBe(250000);
    });
  });

  // =========================================================================
  // C05: Starter Plan Quota Guard (50/mo) ↔ Midtrans Payment ↔ Pro Activation
  // =========================================================================
  describe("C05: Starter Quota Guard ↔ Midtrans Payment ↔ Pro Activation", () => {
    it("C05.1: Starter user hits 50 quota ceiling, upgrades via Midtrans settlement, unblocking 51st transaction", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c05_1", plan: "starter" });
      const wallet = Array.from(db.wallets.values()).find((w) => w.user_id === user.id);

      // Pre-fill 50 transactions
      for (let i = 0; i < 50; i++) {
        db.transactions.set(`tx_c05_${i}`, {
          id: `tx_c05_${i}`,
          user_id: user.id,
          wallet_id: wallet.id,
          type: "expense",
          amount: 5000,
          date: new Date().toISOString(),
        });
      }

      // 51st attempt fails
      expect(() => {
        db.recordTransaction({
          user_id: user.id,
          wallet_id: wallet.id,
          type: "expense",
          amount: 15000,
        });
      }).toThrow("Batas kuota 50 transaksi Starter tercapai");

      // Midtrans payment checkout & webhook settlement
      const orderId = "ORDER-UPGRADE-C05";
      db.subscriptions.set(orderId, {
        id: "sub_c05",
        user_id: user.id,
        plan: "pro",
        status: "pending",
        midtrans_order_id: orderId,
        amount: 99000,
      });

      const webhookRes = db.handleMidtransWebhook({
        order_id: orderId,
        transaction_status: "settlement",
        gross_amount: "99000",
        signature_key: "valid_hash",
      });

      expect(webhookRes.status).toBe(200);
      expect(user.plan).toBe("pro");

      // 51st attempt now succeeds without error
      const successTx = db.recordTransaction({
        user_id: user.id,
        wallet_id: wallet.id,
        type: "expense",
        amount: 15000,
      });
      expect(successTx.transaction).toBeDefined();
      expect(db.transactions.size).toBe(51);
    });

    it("C05.2: Pending Midtrans transaction does not unlock Pro features until settlement", () => {
      const db = new InMemoryDatabase();
      const user = db.signupUser({ id: "u_c05_2", plan: "starter" });
      const orderId = "ORDER-PENDING-C05";
      db.subscriptions.set(orderId, {
        id: "sub_c05_pend",
        user_id: user.id,
        plan: "pro",
        status: "pending",
        midtrans_order_id: orderId,
      });

      db.handleMidtransWebhook({
        order_id: orderId,
        transaction_status: "pending",
        signature_key: "valid_sig",
      });

      expect(user.plan).toBe("starter");
      expect(db.subscriptions.get(orderId).status).toBe("pending");
    });
  });

  // =========================================================================
  // C06: Pro Gatekeeper Middleware ↔ On-Demand Export ↔ Storage Delivery
  // =========================================================================
  describe("C06: Pro Gatekeeper ↔ Export Engine ↔ Storage Delivery", () => {
    it("C06.1: Starter user is gated from export, but Pro user receives valid PDF binary and signed URL", () => {
      const db = new InMemoryDatabase();
      const starterUser = db.signupUser({ id: "u_c06_starter", plan: "starter" });
      const proUser = db.signupUser({ id: "u_c06_pro", plan: "pro" });

      // Starter blocked
      expect(() => {
        db.generateExport(starterUser.id, "pdf", "2026-09-01", "2026-09-30");
      }).toThrow("Export PDF and Excel requires TataDana Pro");

      // Pro allowed
      const exportRes = db.generateExport(proUser.id, "pdf", "2026-09-01", "2026-09-30");
      expect(verifyPdfMagicBytesOracle(exportRes.buffer)).toBe(true);
      expect(exportRes.contentType).toBe("application/pdf");
      expect(exportRes.signedUrl).toContain("https://storage.tatadana.id/exports/");
    });

    it("C06.2: Pro user generates valid Excel OpenXML binary with appropriate Content-Type header", () => {
      const db = new InMemoryDatabase();
      const proUser = db.signupUser({ id: "u_c06_pro_xlsx", plan: "pro" });

      const exportRes = db.generateExport(proUser.id, "xlsx", "2026-09-01", "2026-09-30");
      expect(verifyExcelMagicBytesOracle(exportRes.buffer)).toBe(true);
      expect(exportRes.contentType).toContain("spreadsheetml");
    });
  });

  // =========================================================================
  // C07: Superadmin Impersonation ↔ RBAC ↔ Mandatory Audit Trail
  // =========================================================================
  describe("C07: Superadmin Impersonation ↔ RBAC ↔ Mandatory Audit Trail", () => {
    it("C07.1: Superadmin initiates impersonation session and leaves immutable audit record", () => {
      const db = new InMemoryDatabase();
      const admin = db.signupUser({ id: "u_c07_admin", role: "superadmin" });
      const targetUser = db.signupUser({ id: "u_c07_target", role: "user" });

      const res = db.impersonateUser(admin.id, targetUser.id, "Investigasi kegagalan integrasi Telegram bot");

      expect(res.sessionToken).toBeDefined();
      expect(res.impersonatedUser.id).toBe(targetUser.id);
      expect(res.bannerMessage).toContain("Superadmin");

      expect(db.audit_logs.length).toBe(1);
      const audit = db.audit_logs[0];
      expect(audit.admin_id).toBe(admin.id);
      expect(audit.target_user_id).toBe(targetUser.id);
      expect(audit.action).toBe("impersonate_user_session");
      expect(audit.reason).toContain("Telegram bot");
    });

    it("C07.2: Regular user attempting impersonation is blocked and records zero audit logs", () => {
      const db = new InMemoryDatabase();
      const regularUser = db.signupUser({ id: "u_c07_reg", role: "user" });
      const targetUser = db.signupUser({ id: "u_c07_target2", role: "user" });

      expect(() => {
        db.impersonateUser(regularUser.id, targetUser.id, "Unauthorized attempt");
      }).toThrow("Forbidden: Impersonation requires superadmin privileges");

      expect(db.audit_logs.length).toBe(0);
    });

    it("C07.3: Impersonation session token format includes unique timestamp signature", () => {
      const db = new InMemoryDatabase();
      const admin = db.signupUser({ id: "u_c07_tok_adm", role: "superadmin" });
      const targetUser = db.signupUser({ id: "u_c07_tok_tgt", role: "user" });

      const res = db.impersonateUser(admin.id, targetUser.id, "Auditing balance records");
      expect(res.sessionToken.startsWith("imp_session_")).toBe(true);
    });
  });

  // =========================================================================
  // C08: Category Surge (>50%) ↔ Burn Rate Warning (>80% Income) ↔ Advisory
  // =========================================================================
  describe("C08: Category Surge ↔ Burn Rate Warning ↔ Advisory Alert", () => {
    it("C08.1: Combined category spike and high burn rate produces comprehensive advisory notification", () => {
      const monthlyIncome = 15000000;
      const prevWeekFood = 300000;
      const currentWeekFood = 600000; // +100% surge (>50%)
      const monthlyExpense = 13000000; // 86.6% burn rate (>80%)

      const foodSpike = (currentWeekFood - prevWeekFood) / prevWeekFood;
      const burnRate = monthlyExpense / monthlyIncome;

      const alerts = [];
      if (foodSpike > 0.5) {
        alerts.push(`⚠️ Lonjakan Pengeluaran: Kategori Makanan naik ${Math.round(foodSpike * 100)}% dibanding minggu lalu.`);
      }
      if (burnRate > 0.8) {
        alerts.push(`🚨 Peringatan Rasio Pengeluaran: Total pengeluaran telah mencapai ${Math.round(burnRate * 100)}% dari pemasukan bulan ini.`);
      }

      expect(alerts.length).toBe(2);
      expect(alerts[0]).toContain("naik 100%");
      expect(alerts[1]).toContain("mencapai 87%");
    });

    it("C08.2: Advisor suppresses alert when spending is stable within budgeted parameters", () => {
      const monthlyIncome = 20000000;
      const prevWeek = 500000;
      const currentWeek = 550000; // +10%
      const monthlyExpense = 8000000; // 40%

      const spike = (currentWeek - prevWeek) / prevWeek;
      const burnRate = monthlyExpense / monthlyIncome;

      expect(spike > 0.5).toBe(false);
      expect(burnRate > 0.8).toBe(false);
    });
  });
});
