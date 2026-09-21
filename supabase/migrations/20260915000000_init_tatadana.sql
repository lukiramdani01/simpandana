-- ==============================================================================
-- SIMPANDANA / TATADANA — PRODUCTION-GRADE POSTGRESQL SCHEMA & TRIGGERS
-- Idempotent, High-Performance, Superadmin-Ready, Multi-Wallet & Budget Sync
-- Timezone Default: Asia/Jakarta (WIB)
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE TABLES (Idempotent DDL)
-- ==============================================================================

-- 2.1. TELEGRAM WEBHOOK UPDATES (Deduplication Barrier)
CREATE TABLE IF NOT EXISTS public.telegram_webhook_updates (
    update_id BIGINT PRIMARY KEY,
    user_id UUID,
    chat_id BIGINT,
    message_text TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2. PROFILES (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    plan VARCHAR(20) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
    telegram_user_id BIGINT UNIQUE,
    telegram_chat_id BIGINT,
    telegram_bot_token TEXT,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure role column exists if profiles table was previously created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin'));
    END IF;
END $$;

-- 2.3. WALLETS (Multi-Wallet Engine)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'ewallet', 'cash')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    icon VARCHAR(50) NOT NULL DEFAULT 'wallet',
    color VARCHAR(20) NOT NULL DEFAULT '#FF5A1F',
    account_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wallets_user_name UNIQUE (user_id, name)
);

-- 2.4. CATEGORIES (Expense & Income Classification)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    icon VARCHAR(50) NOT NULL DEFAULT 'tag',
    color VARCHAR(20) NOT NULL DEFAULT '#FF5A1F',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, type)
);

-- 2.5. BUDGETS (Monthly Limits & Threshold Tracking)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(15, 2) NOT NULL CHECK (monthly_limit > 0),
    current_spent NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_spent >= 0),
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year >= 2020),
    alert_80_sent BOOLEAN NOT NULL DEFAULT FALSE,
    alert_100_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_budgets_user_category_period UNIQUE (user_id, category_id, month, year)
);

-- 2.6. TRANSACTIONS (Core Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_wib TIME NOT NULL DEFAULT (CURRENT_TIME AT TIME ZONE 'Asia/Jakarta'),
    notes TEXT,
    source VARCHAR(30) NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram_text', 'telegram_photo', 'telegram_voice')),
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_transactions_transfer_wallets CHECK (type != 'transfer' OR (to_wallet_id IS NOT NULL AND to_wallet_id != wallet_id))
);

-- 2.7. TRANSACTION ITEMS (Receipt OCR Breakdown)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8. REMINDERS (Daily Finance Logging Prompts)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    frequency SMALLINT NOT NULL DEFAULT 1 CHECK (frequency IN (1, 2)),
    time_1 TIME NOT NULL DEFAULT '08:00:00',
    time_2 TIME NOT NULL DEFAULT '20:00:00',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9. AI PROVIDERS (LLM Switchboard)
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('gemini', 'openai', 'deepseek')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority SMALLINT NOT NULL DEFAULT 1,
    encrypted_api_key TEXT,
    model_name VARCHAR(100),
    mode VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (mode IN ('single', 'parallel')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10. AI LOGS (Latency & Token Observability)
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('gemini', 'openai', 'deepseek', 'fallback_regex')),
    action VARCHAR(50) NOT NULL DEFAULT 'parse_transaction',
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL CHECK (status IN ('success', 'error', 'failed', 'timeout', 'fallback')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11. AUDIT LOGS (Superadmin Activity Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    ip_address VARCHAR(45),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12. SUBSCRIPTIONS (Midtrans Payment Lifecycle)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('starter', 'pro')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'pending_approval', 'active', 'expired', 'cancelled')),
    midtrans_order_id VARCHAR(100) NOT NULL UNIQUE,
    payment_type VARCHAR(50),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    proof_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telegram_user_id ON public.profiles(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_default ON public.wallets(user_id, is_default);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_cat_period ON public.budgets(user_id, category_id, month, year);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet_id ON public.transactions(to_wallet_id) WHERE to_wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON public.transactions(user_id, type, date);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_category_id ON public.transaction_items(category_id) WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_active ON public.reminders(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_providers_active_priority ON public.ai_providers(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created ON public.ai_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_provider_status ON public.ai_logs(provider, status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_created ON public.audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_order_id ON public.subscriptions(midtrans_order_id);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_processed_at ON public.telegram_webhook_updates(processed_at DESC);

-- ==============================================================================
-- 4. AUTOMATED DATABASE FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 4.1. Auto updated_at timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_reminders_updated_at ON public.reminders;
CREATE TRIGGER trg_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_providers_updated_at ON public.ai_providers;
CREATE TRIGGER trg_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 4.2. New User Registration Bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_avatar_url TEXT;
    v_phone TEXT;
BEGIN
    -- Extract profile metadata from auth.users record
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Pengguna TataDana'
    );
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');

    -- 1. Create Profile
    INSERT INTO public.profiles (
        id,
        phone,
        full_name,
        avatar_url,
        default_currency,
        timezone,
        plan,
        role,
        is_phone_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_phone,
        v_full_name,
        v_avatar_url,
        'IDR',
        'Asia/Jakarta',
        'starter',
        'user',
        (CASE WHEN v_phone IS NOT NULL THEN true ELSE false END),
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();

    -- 2. Seed Default Cash Wallet ("Dompet Utama")
    INSERT INTO public.wallets (
        user_id,
        name,
        type,
        balance,
        is_default,
        icon,
        color,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'Dompet Utama',
        'cash',
        0.00,
        true,
        '👛',
        '#FF5A1F',
        now(),
        now()
    ) ON CONFLICT (user_id, name) DO NOTHING;

    -- 3. Seed 9 Default Indonesian Categories
    INSERT INTO public.categories (
        user_id,
        name,
        type,
        icon,
        color,
        is_default,
        created_at,
        updated_at
    ) VALUES
        (NEW.id, 'Makanan & Minuman', 'expense', '🍽️', '#FF5A1F', true, now(), now()),
        (NEW.id, 'Transportasi', 'expense', '🚗', '#3B82F6', true, now(), now()),
        (NEW.id, 'Belanja & Keperluan', 'expense', '🛍️', '#EC4899', true, now(), now()),
        (NEW.id, 'Tagihan & Utilitas', 'expense', '⚡', '#EAB308', true, now(), now()),
        (NEW.id, 'Hiburan & Hobi', 'expense', '🎮', '#8B5CF6', true, now(), now()),
        (NEW.id, 'Kesehatan', 'expense', '💊', '#10B981', true, now(), now()),
        (NEW.id, 'Lain-lain', 'expense', '📦', '#64748B', true, now(), now()),
        (NEW.id, 'Gaji & Upah', 'income', '💼', '#22C55E', true, now(), now()),
        (NEW.id, 'Bonus & Investasi', 'income', '📈', '#06B6D4', true, now(), now())
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- 4. Seed Default Reminder Preference
    INSERT INTO public.reminders (
        user_id,
        is_active,
        frequency,
        time_1,
        time_2,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        true,
        1,
        '20:00:00',
        '12:00:00',
        now(),
        now()
    ) ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- 4.3. Dynamic Wallet Balance Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Revert previous balance impact on UPDATE or DELETE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF OLD.type = 'income' THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount,
                updated_at = now()
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'expense' THEN
            UPDATE public.wallets
            SET balance = balance + OLD.amount,
                updated_at = now()
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'transfer' THEN
            -- Revert source wallet (credit back)
            UPDATE public.wallets
            SET balance = balance + OLD.amount,
                updated_at = now()
            WHERE id = OLD.wallet_id;

            -- Revert destination wallet (debit back)
            IF OLD.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance - OLD.amount,
                    updated_at = now()
                WHERE id = OLD.to_wallet_id;
            END IF;
        END IF;
    END IF;

    -- 2. Apply new balance impact on INSERT or UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.type = 'income' THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                updated_at = now()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'expense' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                updated_at = now()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'transfer' THEN
            -- Debit source wallet
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                updated_at = now()
            WHERE id = NEW.wallet_id;

            -- Credit destination wallet
            IF NEW.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets
                SET balance = balance + NEW.amount,
                    updated_at = now()
                WHERE id = NEW.to_wallet_id;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.transactions;
CREATE TRIGGER trg_sync_wallet_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_wallet_balance();


-- 4.4. Dynamic Budget Spending Aggregation Trigger
CREATE OR REPLACE FUNCTION public.recalculate_budget_spent(
    p_user_id UUID,
    p_category_id UUID,
    p_month INT,
    p_year INT
)
RETURNS VOID AS $$
DECLARE
    v_total NUMERIC(15,2);
    v_monthly_limit NUMERIC(15,2);
BEGIN
    IF p_user_id IS NULL OR p_category_id IS NULL OR p_month IS NULL OR p_year IS NULL THEN
        RETURN;
    END IF;

    -- Calculate total expenses for this user, category, month, and year
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total
    FROM public.transactions
    WHERE user_id = p_user_id
      AND category_id = p_category_id
      AND type = 'expense'
      AND EXTRACT(MONTH FROM date) = p_month
      AND EXTRACT(YEAR FROM date) = p_year;

    -- Fetch monthly limit if budget exists
    SELECT monthly_limit
    INTO v_monthly_limit
    FROM public.budgets
    WHERE user_id = p_user_id
      AND category_id = p_category_id
      AND month = p_month
      AND year = p_year;

    IF FOUND THEN
        UPDATE public.budgets
        SET current_spent = v_total,
            alert_80_sent = (v_total >= 0.80 * v_monthly_limit),
            alert_100_sent = (v_total >= v_monthly_limit),
            updated_at = now()
        WHERE user_id = p_user_id
          AND category_id = p_category_id
          AND month = p_month
          AND year = p_year;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle OLD record for DELETE or UPDATE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF OLD.type = 'expense' AND OLD.category_id IS NOT NULL THEN
            PERFORM public.recalculate_budget_spent(
                OLD.user_id,
                OLD.category_id,
                EXTRACT(MONTH FROM OLD.date)::INT,
                EXTRACT(YEAR FROM OLD.date)::INT
            );
        END IF;
    END IF;

    -- Handle NEW record for INSERT or UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.type = 'expense' AND NEW.category_id IS NOT NULL THEN
            PERFORM public.recalculate_budget_spent(
                NEW.user_id,
                NEW.category_id,
                EXTRACT(MONTH FROM NEW.date)::INT,
                EXTRACT(YEAR FROM NEW.date)::INT
            );
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_budget_spent ON public.transactions;
CREATE TRIGGER trg_sync_budget_spent
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_budget_spent();

-- Additional Trigger: Recalculate spent when a new budget row is created
CREATE OR REPLACE FUNCTION public.sync_new_budget_spent()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total
    FROM public.transactions
    WHERE user_id = NEW.user_id
      AND category_id = NEW.category_id
      AND type = 'expense'
      AND EXTRACT(MONTH FROM date) = NEW.month
      AND EXTRACT(YEAR FROM date) = NEW.year;

    NEW.current_spent := v_total;
    NEW.alert_80_sent := (v_total >= 0.80 * NEW.monthly_limit);
    NEW.alert_100_sent := (v_total >= NEW.monthly_limit);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_new_budget_spent ON public.budgets;
CREATE TRIGGER trg_sync_new_budget_spent
    BEFORE INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_new_budget_spent();

-- ==============================================================================
-- 5. SEED DATA (AI Switchboard Initial Providers)
-- ==============================================================================
INSERT INTO public.ai_providers (name, is_active, priority, encrypted_api_key, model_name, mode)
VALUES
    ('gemini', true, 1, NULL, 'gemini-1.5-flash', 'single'),
    ('openai', true, 2, NULL, 'gpt-4o-mini', 'single'),
    ('deepseek', true, 3, NULL, 'deepseek-chat', 'single')
ON CONFLICT (name) DO UPDATE SET
    priority = EXCLUDED.priority,
    model_name = EXCLUDED.model_name,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ==============================================================================

-- 6.1. Superadmin verification helper (SECURITY DEFINER avoids infinite recursion on profiles)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$;

-- 6.2. Enable RLS on all 12 core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_webhook_updates ENABLE ROW LEVEL SECURITY;

-- 6.3. Idempotent Policy Definitions: Drop existing if present
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;

DROP POLICY IF EXISTS "wallets_select" ON public.wallets;
DROP POLICY IF EXISTS "wallets_insert" ON public.wallets;
DROP POLICY IF EXISTS "wallets_update" ON public.wallets;
DROP POLICY IF EXISTS "wallets_delete" ON public.wallets;
DROP POLICY IF EXISTS "wallets_service_role" ON public.wallets;

DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
DROP POLICY IF EXISTS "categories_service_role" ON public.categories;

DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete" ON public.budgets;
DROP POLICY IF EXISTS "budgets_service_role" ON public.budgets;

DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
DROP POLICY IF EXISTS "transactions_service_role" ON public.transactions;

DROP POLICY IF EXISTS "transaction_items_select" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_update" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_delete" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_service_role" ON public.transaction_items;

DROP POLICY IF EXISTS "reminders_select" ON public.reminders;
DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;
DROP POLICY IF EXISTS "reminders_service_role" ON public.reminders;

DROP POLICY IF EXISTS "ai_providers_select" ON public.ai_providers;
DROP POLICY IF EXISTS "ai_providers_write" ON public.ai_providers;
DROP POLICY IF EXISTS "ai_providers_service_role" ON public.ai_providers;

DROP POLICY IF EXISTS "ai_logs_select" ON public.ai_logs;
DROP POLICY IF EXISTS "ai_logs_insert" ON public.ai_logs;
DROP POLICY IF EXISTS "ai_logs_service_role" ON public.ai_logs;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_role" ON public.audit_logs;

DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_service_role" ON public.subscriptions;

DROP POLICY IF EXISTS "telegram_updates_service_role" ON public.telegram_webhook_updates;

-- 6.4. Create Policies: PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_superadmin());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_superadmin())
  WITH CHECK (auth.uid() = id OR public.is_superadmin());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.5. Create Policies: WALLETS
CREATE POLICY "wallets_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "wallets_insert" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_update" ON public.wallets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_delete" ON public.wallets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wallets_service_role" ON public.wallets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.6. Create Policies: CATEGORIES
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "categories_service_role" ON public.categories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.7. Create Policies: BUDGETS
CREATE POLICY "budgets_select" ON public.budgets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "budgets_insert" ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budgets_update" ON public.budgets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budgets_delete" ON public.budgets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "budgets_service_role" ON public.budgets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.8. Create Policies: TRANSACTIONS
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_service_role" ON public.transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.9. Create Policies: TRANSACTION ITEMS
CREATE POLICY "transaction_items_select" ON public.transaction_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND (t.user_id = auth.uid() OR public.is_superadmin())
    )
  );

CREATE POLICY "transaction_items_insert" ON public.transaction_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_items_update" ON public.transaction_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND (t.user_id = auth.uid() OR public.is_superadmin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_items_delete" ON public.transaction_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "transaction_items_service_role" ON public.transaction_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.10. Create Policies: REMINDERS
CREATE POLICY "reminders_select" ON public.reminders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "reminders_insert" ON public.reminders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminders_update" ON public.reminders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin())
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminders_delete" ON public.reminders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "reminders_service_role" ON public.reminders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.11. Create Policies: AI PROVIDERS (Switchboard)
CREATE POLICY "ai_providers_select" ON public.ai_providers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ai_providers_write" ON public.ai_providers
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "ai_providers_service_role" ON public.ai_providers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.12. Create Policies: AI LOGS
CREATE POLICY "ai_logs_select" ON public.ai_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "ai_logs_insert" ON public.ai_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "ai_logs_service_role" ON public.ai_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.13. Create Policies: AUDIT LOGS (Immutable append-only)
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_superadmin());

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "audit_logs_service_role" ON public.audit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.14. Create Policies: SUBSCRIPTIONS
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_admin_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "subscriptions_service_role" ON public.subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6.15. Create Policies: TELEGRAM WEBHOOK UPDATES (Strictly service_role only)
CREATE POLICY "telegram_updates_service_role" ON public.telegram_webhook_updates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

