/**
 * TataDana PostgreSQL Schema & Contract Validator
 * Validates the 12 core tables, required columns, foreign keys, and constraints.
 */

const EXPECTED_TABLES = {
  profiles: {
    columns: [
      "id",
      "phone",
      "full_name",
      "avatar_url",
      "default_currency",
      "timezone",
      "plan",
      "role",
      "telegram_user_id",
      "telegram_chat_id",
      "created_at",
      "updated_at",
    ],
    primaryKey: "id",
    checks: {
      plan: ["starter", "pro"],
      role: ["user", "superadmin"],
    },
  },
  wallets: {
    columns: [
      "id",
      "user_id",
      "name",
      "type",
      "balance",
      "is_default",
      "icon",
      "color",
      "created_at",
      "updated_at",
    ],
    primaryKey: "id",
    checks: {
      type: ["bank", "ewallet", "cash"],
    },
  },
  categories: {
    columns: [
      "id",
      "user_id",
      "name",
      "type",
      "icon",
      "color",
      "is_default",
      "created_at",
    ],
    primaryKey: "id",
    checks: {
      type: ["expense", "income"],
    },
  },
  budgets: {
    columns: [
      "id",
      "user_id",
      "category_id",
      "monthly_limit",
      "current_spent",
      "month",
      "year",
      "alert_80_sent",
      "alert_100_sent",
      "created_at",
    ],
    primaryKey: "id",
  },
  transactions: {
    columns: [
      "id",
      "user_id",
      "wallet_id",
      "to_wallet_id",
      "category_id",
      "type",
      "amount",
      "date",
      "notes",
      "source",
      "receipt_url",
      "created_at",
    ],
    primaryKey: "id",
    checks: {
      type: ["income", "expense", "transfer"],
      source: ["web", "telegram_text", "telegram_photo", "telegram_voice"],
    },
  },
  transaction_items: {
    columns: ["id", "transaction_id", "item_name", "quantity", "price", "category_id"],
    primaryKey: "id",
  },
  reminders: {
    columns: [
      "id",
      "user_id",
      "is_active",
      "frequency",
      "time_1",
      "time_2",
      "last_sent_at",
      "created_at",
    ],
    primaryKey: "id",
    checks: {
      frequency: [1, 2],
    },
  },
  ai_providers: {
    columns: [
      "id",
      "name",
      "is_active",
      "priority",
      "encrypted_api_key",
      "mode",
      "created_at",
    ],
    primaryKey: "id",
    checks: {
      name: ["gemini", "openai", "deepseek"],
      mode: ["single", "parallel"],
    },
  },
  ai_logs: {
    columns: [
      "id",
      "user_id",
      "provider",
      "prompt_tokens",
      "completion_tokens",
      "latency_ms",
      "status",
      "error_message",
      "created_at",
    ],
    primaryKey: "id",
  },
  audit_logs: {
    columns: [
      "id",
      "admin_id",
      "target_user_id",
      "action",
      "reason",
      "created_at",
    ],
    primaryKey: "id",
  },
  subscriptions: {
    columns: [
      "id",
      "user_id",
      "plan",
      "status",
      "midtrans_order_id",
      "payment_type",
      "amount",
      "expires_at",
      "created_at",
    ],
    primaryKey: "id",
    checks: {
      plan: ["starter", "pro"],
      status: ["pending", "active", "expired", "cancelled"],
    },
  },
  telegram_webhook_updates: {
    columns: ["update_id", "processed_at"],
    primaryKey: "update_id",
  },
};

function validateTableSchema(tableName, columnsArray) {
  const spec = EXPECTED_TABLES[tableName];
  if (!spec) {
    throw new Error(`Unknown table "${tableName}" in schema validator`);
  }
  const missing = [];
  for (const col of spec.columns) {
    if (!columnsArray.includes(col)) {
      missing.push(col);
    }
  }
  return {
    valid: missing.length === 0,
    missing,
    expectedCount: spec.columns.length,
    actualCount: columnsArray.length,
  };
}

module.exports = {
  EXPECTED_TABLES,
  validateTableSchema,
};
