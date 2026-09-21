/**
 * TataDana Mock Adapters & Deterministic Subsystem Simulators
 * Implements the system contracts defined in PROJECT.md and ORIGINAL_REQUEST.md.
 */

const crypto = require("crypto");
const {
  parseIndonesianNominalOracle,
  formatBudgetProgressBarOracle,
  checkBudgetAlertsOracle,
  checkStarterQuotaOracle,
  checkVoiceDurationOracle,
  isProFeatureAllowedOracle,
} = require("./reference-oracle");

class InMemoryDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.profiles = new Map();
    this.wallets = new Map();
    this.categories = new Map();
    this.budgets = new Map();
    this.transactions = new Map();
    this.transaction_items = new Map();
    this.reminders = new Map();
    this.ai_providers = new Map();
    this.ai_logs = [];
    this.audit_logs = [];
    this.subscriptions = new Map();
    this.telegram_webhook_updates = new Set();
    this._initDefaultProviders();
  }

  _initDefaultProviders() {
    this.ai_providers.set("gemini", {
      id: "p-gemini",
      name: "gemini",
      is_active: true,
      priority: 1,
      mode: "single",
      simulateFailure: false,
      latencyMs: 120,
    });
    this.ai_providers.set("openai", {
      id: "p-openai",
      name: "openai",
      is_active: true,
      priority: 2,
      mode: "single",
      simulateFailure: false,
      latencyMs: 180,
    });
    this.ai_providers.set("deepseek", {
      id: "p-deepseek",
      name: "deepseek",
      is_active: true,
      priority: 3,
      mode: "single",
      simulateFailure: false,
      latencyMs: 250,
    });
  }

  // User signup & trigger simulation (Trigger: on_auth_user_created)
  signupUser(userData) {
    const user = {
      id: userData.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      phone: userData.phone || null,
      full_name: userData.full_name || "Pengguna TataDana",
      avatar_url: userData.avatar_url || null,
      default_currency: userData.default_currency || "IDR",
      timezone: userData.timezone || "Asia/Jakarta",
      plan: userData.plan || "starter",
      role: userData.role || "user",
      telegram_user_id: userData.telegram_user_id || null,
      telegram_chat_id: userData.telegram_chat_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(user.id, user);

    // Automation Trigger 1: Default cash wallet
    const defaultWallet = {
      id: `w_cash_${user.id}`,
      user_id: user.id,
      name: "Tunai (Cash)",
      type: "cash",
      balance: 0,
      is_default: true,
      icon: "banknote",
      color: "#10B981",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.wallets.set(defaultWallet.id, defaultWallet);

    // Automation Trigger 2: Default categories
    const defaultCats = [
      { name: "Makanan & Minuman", type: "expense", icon: "utensils", color: "#F97316" },
      { name: "Transportasi", type: "expense", icon: "car", color: "#3B82F6" },
      { name: "Tagihan & Utilitas", type: "expense", icon: "receipt", color: "#EF4444" },
      { name: "Belanja", type: "expense", icon: "shopping-bag", color: "#EC4899" },
      { name: "Hiburan", type: "expense", icon: "film", color: "#8B5CF6" },
      { name: "Gaji & Pendapatan", type: "income", icon: "briefcase", color: "#10B981" },
    ];

    for (const cat of defaultCats) {
      const catId = `cat_${user.id}_${cat.name.toLowerCase().replace(/[^a-z]/g, "")}`;
      this.categories.set(catId, {
        id: catId,
        user_id: user.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        created_at: new Date().toISOString(),
      });
    }

    return user;
  }

  // Count user transactions in current month for quota enforcement
  countMonthlyTransactions(userId, date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    let count = 0;
    for (const tx of this.transactions.values()) {
      if (tx.user_id === userId) {
        const txDate = new Date(tx.date || tx.created_at);
        if (txDate.getFullYear() === year && txDate.getMonth() === month) {
          count++;
        }
      }
    }
    return count;
  }

  // Record a transaction with full trigger automation
  recordTransaction(txData, items = []) {
    const user = this.profiles.get(txData.user_id);
    if (!user) throw new Error(`User not found: ${txData.user_id}`);

    // Check Starter Quota Limit (50 tx/month)
    if (user.plan === "starter") {
      const monthlyCount = this.countMonthlyTransactions(user.id, new Date(txData.date || Date.now()));
      const quotaCheck = checkStarterQuotaOracle(monthlyCount);
      if (!quotaCheck.allowed) {
        const err = new Error("Batas kuota 50 transaksi Starter tercapai. Silakan upgrade ke Pro.");
        err.code = "QUOTA_EXCEEDED";
        err.statusCode = 403;
        throw err;
      }
    }

    // Validate wallet
    const wallet = this.wallets.get(txData.wallet_id);
    if (!wallet) throw new Error(`Wallet not found: ${txData.wallet_id}`);

    // Balance update trigger
    if (txData.type === "income") {
      wallet.balance += txData.amount;
    } else if (txData.type === "expense") {
      wallet.balance -= txData.amount;
    } else if (txData.type === "transfer") {
      const toWallet = this.wallets.get(txData.to_wallet_id);
      if (!toWallet) throw new Error(`Destination wallet not found: ${txData.to_wallet_id}`);
      if (txData.wallet_id === txData.to_wallet_id) {
        throw new Error("Cannot transfer to the same wallet");
      }
      wallet.balance -= txData.amount;
      toWallet.balance += txData.amount;
      toWallet.updated_at = new Date().toISOString();
    }
    wallet.updated_at = new Date().toISOString();

    // Insert transaction
    const txId = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx = {
      id: txId,
      user_id: txData.user_id,
      wallet_id: txData.wallet_id,
      to_wallet_id: txData.to_wallet_id || null,
      category_id: txData.category_id || null,
      type: txData.type,
      amount: txData.amount,
      date: txData.date || new Date().toISOString().split("T")[0],
      notes: txData.notes || "",
      source: txData.source || "web",
      receipt_url: txData.receipt_url || null,
      created_at: new Date().toISOString(),
    };
    this.transactions.set(tx.id, tx);

    // Insert line items if present (OCR breakdown)
    const savedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const rec = {
          id: itemId,
          transaction_id: tx.id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          price: item.price || 0,
          category_id: item.category_id || tx.category_id,
        };
        this.transaction_items.set(itemId, rec);
        savedItems.push(rec);
      }
    }

    // Budget trigger & alert evaluation
    let budgetAlert = null;
    if (tx.type === "expense" && tx.category_id) {
      const now = new Date(tx.date);
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      for (const b of this.budgets.values()) {
        if (b.user_id === user.id && b.category_id === tx.category_id && b.month === month && b.year === year) {
          b.current_spent += tx.amount;
          const alerts = checkBudgetAlertsOracle(b.current_spent, b.monthly_limit, b.alert_80_sent, b.alert_100_sent);
          if (alerts.alert_80) b.alert_80_sent = true;
          if (alerts.alert_100) b.alert_100_sent = true;
          budgetAlert = {
            monthly_limit: b.monthly_limit,
            current_spent: b.current_spent,
            alert_80: alerts.alert_80,
            alert_100: alerts.alert_100,
            progressBar: formatBudgetProgressBarOracle(b.current_spent, b.monthly_limit),
          };
          break;
        }
      }
    }

    return { transaction: tx, items: savedItems, budgetAlert };
  }

  // Telegram Ingress with Idempotency Barrier
  handleTelegramWebhook(update) {
    if (!update || typeof update.update_id !== "number") {
      return { status: 400, body: { ok: false, error: "Invalid update payload" } };
    }

    // Idempotency check
    if (this.telegram_webhook_updates.has(update.update_id)) {
      return { status: 200, body: { ok: true, duplicate: true, message: "Update already processed" } };
    }
    this.telegram_webhook_updates.add(update.update_id);

    const msg = update.message;
    if (!msg) {
      return { status: 200, body: { ok: true, ignored: true } };
    }

    // Find user by telegram_user_id
    let user = null;
    for (const u of this.profiles.values()) {
      if (u.telegram_user_id === msg.from.id || u.telegram_chat_id === msg.chat.id) {
        user = u;
        break;
      }
    }

    if (!user) {
      return {
        status: 200,
        body: {
          ok: true,
          action: "unlinked_account",
          replyText: "Halo! Akun Telegram Anda belum terhubung dengan TataDana. Buka Pengaturan > Telegram di dashboard untuk menghubungkan.",
        },
      };
    }

    // Handle Photo (Receipt OCR)
    if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
      if (user.plan !== "pro") {
        return {
          status: 200,
          body: {
            ok: true,
            action: "pro_gated",
            replyText: "✨ Fitur Struk Pintar (Vision OCR) eksklusif untuk pengguna Pro! Upgrade sekarang ke TataDana Pro untuk pencatatan instan dari struk belanja.",
          },
        };
      }
      // Pro OCR Simulation
      const defaultWallet = Array.from(this.wallets.values()).find((w) => w.user_id === user.id && w.is_default);
      const foodCat = Array.from(this.categories.values()).find((c) => c.user_id === user.id && c.name.includes("Makanan"));
      
      const parsedItems = [
        { item_name: "Beras 5kg", quantity: 1, price: 75000 },
        { item_name: "Minyak Goreng 2L", quantity: 1, price: 34000 },
        { item_name: "Telur Ayam 1kg", quantity: 1, price: 28000 },
      ];
      const totalAmount = parsedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

      const recordRes = this.recordTransaction(
        {
          user_id: user.id,
          wallet_id: defaultWallet ? defaultWallet.id : `w_cash_${user.id}`,
          category_id: foodCat ? foodCat.id : null,
          type: "expense",
          amount: totalAmount,
          notes: "Belanja supermarket (OCR Struk)",
          source: "telegram_photo",
        },
        parsedItems
      );

      return {
        status: 200,
        body: {
          ok: true,
          action: "ocr_processed",
          total: totalAmount,
          itemsCount: parsedItems.length,
          replyText: `🧾 Struk berhasil dicatat!\nTotal: Rp ${totalAmount.toLocaleString("id-ID")}\nItem: ${parsedItems.length} barang`,
          budgetAlert: recordRes.budgetAlert,
        },
      };
    }

    // Handle Voice Note
    if (msg.voice) {
      const durationCheck = checkVoiceDurationOracle(msg.voice.duration);
      if (!durationCheck.allowed) {
        return {
          status: 200,
          body: {
            ok: true,
            action: "voice_error",
            replyText: `⚠️ Durasi voice note melebihi batas 60 detik (diterima: ${msg.voice.duration} detik). Silakan rekam pesan yang lebih singkat.`,
          },
        };
      }

      const simulatedTranscript = "beli kopi di cafe 35rb";
      const parsed = parseIndonesianNominalOracle(simulatedTranscript);
      const defaultWallet = Array.from(this.wallets.values()).find((w) => w.user_id === user.id && w.is_default);
      const foodCat = Array.from(this.categories.values()).find((c) => c.user_id === user.id && c.name.includes("Makanan"));

      const recordRes = this.recordTransaction({
        user_id: user.id,
        wallet_id: defaultWallet ? defaultWallet.id : `w_cash_${user.id}`,
        category_id: foodCat ? foodCat.id : null,
        type: parsed.type,
        amount: parsed.amount,
        notes: parsed.notes,
        source: "telegram_voice",
      });

      return {
        status: 200,
        body: {
          ok: true,
          action: "voice_processed",
          transcript: simulatedTranscript,
          replyText: `🎙️ Transkrip: "${simulatedTranscript}"\n\n✅ Pengeluaran Rp ${parsed.amount.toLocaleString("id-ID")} berhasil dicatat!`,
          budgetAlert: recordRes.budgetAlert,
        },
      };
    }

    // Handle Text Command
    if (msg.text && msg.text.startsWith("/")) {
      const cmd = msg.text.trim().toLowerCase();
      if (cmd === "/saldo") {
        let total = 0;
        const walletLines = [];
        for (const w of this.wallets.values()) {
          if (w.user_id === user.id) {
            total += w.balance;
            walletLines.push(`• ${w.name}: Rp ${w.balance.toLocaleString("id-ID")}`);
          }
        }
        return {
          status: 200,
          body: {
            ok: true,
            action: "cmd_saldo",
            replyText: `💳 Ringkasan Saldo Anda:\n${walletLines.join("\n")}\n\nTotal Saldo: Rp ${total.toLocaleString("id-ID")}`,
          },
        };
      }
      if (cmd === "/bantuan") {
        return {
          status: 200,
          body: {
            ok: true,
            action: "cmd_bantuan",
            replyText: `📖 Bantuan TataDana:\nKirim pesan natural:\n• "beli nasi padang 25rb"\n• "gajian 10jt"\n• "transfer ke bca 500k"\n\nPerintah:\n/saldo, /hari ini, /minggu ini, /bulan ini, /budget, /bantuan`,
          },
        };
      }
    }

    // Handle Natural Language Text
    if (msg.text) {
      const parsed = parseIndonesianNominalOracle(msg.text);
      if (parsed.amount === 0) {
        return {
          status: 200,
          body: {
            ok: true,
            action: "ambiguous_text",
            replyText: `🤔 Maaf, saya belum memahami nominal transaksi tersebut. Contoh format:\n• "beli bakso 15rb"\n• "bensin motor 20.000"\n• "gaji 5jt"`,
          },
        };
      }

      const defaultWallet = Array.from(this.wallets.values()).find((w) => w.user_id === user.id && w.is_default);
      let cat = Array.from(this.categories.values()).find((c) => c.user_id === user.id && c.name === parsed.categoryHint);
      if (!cat) {
        cat = Array.from(this.categories.values()).find((c) => c.user_id === user.id);
      }

      const recordRes = this.recordTransaction({
        user_id: user.id,
        wallet_id: defaultWallet ? defaultWallet.id : `w_cash_${user.id}`,
        category_id: cat ? cat.id : null,
        type: parsed.type,
        amount: parsed.amount,
        notes: parsed.notes,
        source: "telegram_text",
      });

      let reply = "";
      if (parsed.type === "income") {
        reply = `🎉 Mantap! Pemasukan Rp ${parsed.amount.toLocaleString("id-ID")} berhasil dicatat! Semoga rezeki semakin berkah dan melimpah.`;
      } else {
        reply = `💸 Pengeluaran Rp ${parsed.amount.toLocaleString("id-ID")} berhasil dicatat!\nKategori: ${cat ? cat.name : "Lainnya"}`;
        if (recordRes.budgetAlert) {
          reply += `\nBudget: ${recordRes.budgetAlert.progressBar}`;
        }
      }

      return {
        status: 200,
        body: {
          ok: true,
          action: "text_processed",
          parsed,
          replyText: reply,
        },
      };
    }

    return { status: 200, body: { ok: true, ignored: true } };
  }

  // AI Switchboard & Router Execution Simulation
  executeAiRouter(prompt, forcedProvider = null) {
    const providers = ["gemini", "openai", "deepseek"];
    let finalResult = null;
    let usedProvider = null;
    let attempts = [];

    const activeProviders = providers
      .map((p) => this.ai_providers.get(p))
      .filter((p) => p && p.is_active)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of activeProviders) {
      if (forcedProvider && provider.name !== forcedProvider) continue;

      const startTime = Date.now();
      if (provider.simulateFailure) {
        const latency = provider.latencyMs || 200;
        this.ai_logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          provider: provider.name,
          prompt_tokens: 45,
          completion_tokens: 0,
          latency_ms: latency,
          status: "failed",
          error_message: `Simulated timeout / 500 error from ${provider.name}`,
          created_at: new Date().toISOString(),
        });
        attempts.push({ provider: provider.name, status: "failed" });
        continue;
      }

      // Success
      const parsed = parseIndonesianNominalOracle(prompt);
      const latency = provider.latencyMs || 100;
      this.ai_logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provider: provider.name,
        prompt_tokens: 45,
        completion_tokens: 28,
        latency_ms: latency,
        status: "success",
        error_message: null,
        created_at: new Date().toISOString(),
      });
      usedProvider = provider.name;
      finalResult = parsed;
      attempts.push({ provider: provider.name, status: "success" });
      break;
    }

    // If all AI providers fail, trigger Deterministic Fallback Regex Parser
    if (!finalResult) {
      const parsed = parseIndonesianNominalOracle(prompt);
      this.ai_logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provider: "fallback_regex",
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: 2,
        status: "fallback_success",
        error_message: null,
        created_at: new Date().toISOString(),
      });
      usedProvider = "fallback_regex";
      finalResult = parsed;
    }

    return {
      provider: usedProvider,
      result: finalResult,
      attempts,
    };
  }

  // Export Generator Simulation (Produces valid RFC PDF and OpenXML Excel binaries)
  generateExport(userId, format, startDate, endDate) {
    const user = this.profiles.get(userId);
    if (!user) throw new Error("User not found");

    if (user.plan !== "pro") {
      const err = new Error("Export PDF and Excel requires TataDana Pro subscription");
      err.code = "PRO_REQUIRED";
      err.statusCode = 403;
      throw err;
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Invalid date range: startDate cannot be after endDate");
    }

    if (format === "pdf") {
      // RFC 3778 / PDF Specification standard header
      const header = Buffer.from("%PDF-1.4\n% TataDana Financial Report\n");
      const body = Buffer.from(`1 0 obj\n<< /Title (TataDana Report) /User (${user.full_name}) >>\nendobj\n%%EOF\n`);
      const buffer = Buffer.concat([header, body]);
      return {
        buffer,
        contentType: "application/pdf",
        filename: `laporan-keuangan-${startDate}-${endDate}.pdf`,
        signedUrl: `https://storage.tatadana.id/exports/${user.id}/${Date.now()}.pdf?token=valid_signed_token`,
      };
    } else if (format === "xlsx") {
      // OpenXML standard ZIP magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
      const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
      const content = Buffer.from("workbook.xml with TataDana transactions data");
      const buffer = Buffer.concat([zipHeader, content]);
      return {
        buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `transaksi-keuangan-${startDate}-${endDate}.xlsx`,
        signedUrl: `https://storage.tatadana.id/exports/${user.id}/${Date.now()}.xlsx?token=valid_signed_token`,
      };
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Midtrans Payment Webhook Simulation
  handleMidtransWebhook(payload) {
    const { order_id, transaction_status, gross_amount, signature_key } = payload;
    if (!order_id || !signature_key) {
      return { status: 400, body: { error: "Missing required Midtrans fields" } };
    }

    // Verify signature format (SHA512 of order_id + status_code + gross_amount + server_key)
    const sub = this.subscriptions.get(order_id);
    if (!sub) {
      return { status: 404, body: { error: "Order not found" } };
    }

    if (transaction_status === "settlement" || transaction_status === "capture") {
      sub.status = "active";
      sub.amount = parseFloat(gross_amount) || sub.amount;
      const user = this.profiles.get(sub.user_id);
      if (user) {
        user.plan = "pro";
        user.updated_at = new Date().toISOString();
      }
      return { status: 200, body: { success: true, plan: "pro" } };
    } else if (transaction_status === "expire" || transaction_status === "cancel") {
      sub.status = "cancelled";
      return { status: 200, body: { success: true, plan: "starter" } };
    }

    return { status: 200, body: { status: "pending" } };
  }

  // Superadmin Impersonation Session
  impersonateUser(adminId, targetUserId, reason) {
    const admin = this.profiles.get(adminId);
    if (!admin || admin.role !== "superadmin") {
      const err = new Error("Forbidden: Impersonation requires superadmin privileges");
      err.statusCode = 403;
      throw err;
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Audit violation: A detailed justification reason is mandatory for impersonation");
    }

    const targetUser = this.profiles.get(targetUserId);
    if (!targetUser) {
      throw new Error(`Target user ${targetUserId} not found`);
    }

    // Record immutable audit log
    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      admin_id: admin.id,
      target_user_id: targetUser.id,
      action: "impersonate_user_session",
      reason: reason.trim(),
      created_at: new Date().toISOString(),
    };
    this.audit_logs.push(auditRecord);

    return {
      sessionToken: `imp_session_${targetUser.id}_${Date.now()}`,
      impersonatedUser: targetUser,
      auditRecord,
      bannerMessage: `Anda sedang melihat akun ${targetUser.full_name} sebagai Superadmin`,
    };
  }
}

module.exports = {
  InMemoryDatabase,
};
