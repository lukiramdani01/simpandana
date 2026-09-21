# Original User Request

## Initial Request — 2026-09-15T09:10:56Z

Aplikasi SaaS manajemen keuangan pribadi premium Indonesia (TataDana) dengan tema orange-putih modern ($5M SaaS valuation grade), terintegrasi penuh dengan 1 shared Telegram Bot untuk pencatatan natural language (nominal format Indonesia), struk OCR (Pro), dan voice note STT via AI multi-provider (Gemini, OpenAI, DeepSeek) dengan failover, real-time analytics Supabase, multi-wallet, budget tracker, on-demand PDF/Excel export, serta Midtrans payment & admin management dashboard.

Working directory: `/Users/lukiramdani/.gemini/antigravity/scratch/tatadana`
Integrity mode: development

## Requirements

### R1. Database Schema, Supabase Auth & Migrations
- Skema PostgreSQL lengkap dan modular di `supabase/migrations`:
  - `profiles` (id, phone, full_name, avatar_url, default_currency, timezone 'Asia/Jakarta', plan 'starter'|'pro', telegram_user_id, telegram_chat_id, created_at)
  - `wallets` (id, user_id, name, type 'bank'|'ewallet'|'cash', balance, is_default, icon, color)
  - `categories` (id, user_id, name, type 'expense'|'income', icon, color, is_default)
  - `budgets` (id, user_id, category_id, monthly_limit, current_spent, month, year, alert_80_sent, alert_100_sent)
  - `transactions` (id, user_id, wallet_id, category_id, type 'income'|'expense'|'transfer', amount, date, notes, source 'web'|'telegram_text'|'telegram_photo'|'telegram_voice', receipt_url, created_at)
  - `transaction_items` (id, transaction_id, item_name, quantity, price, category_id)
  - `reminders` (id, user_id, is_active, frequency 1|2, time_1, time_2, last_sent_at)
  - `ai_providers` (id, name 'gemini'|'openai'|'deepseek', is_active, priority, encrypted_api_key, mode 'single'|'parallel')
  - `ai_logs` (id, user_id, provider, prompt_tokens, completion_tokens, latency_ms, status, error_message, created_at)
  - `audit_logs` (id, admin_id, target_user_id, action, reason, created_at)
  - `subscriptions` (id, user_id, plan 'starter'|'pro', status, midtrans_order_id, expires_at, created_at)
  - `telegram_webhook_updates` (update_id bigint primary key, processed_at timestamp) untuk idempotency mutlak.
- RLS (Row Level Security) ketat di semua tabel dengan role user dan service_role.
- Auth dual-mode: Email/password, OAuth Google, dan verifikasi nomor HP OTP (dengan dev bypass code '123456' untuk instant verification).

### R2. Telegram Bot Engine & Webhook
- Endpoint webhook `/api/telegram/webhook` yang idempotent (cek `update_id` terlebih dahulu).
- Setup bot di user settings: validasi token via `getMe` Telegram API dan otomatisasi `setWebhook`.
- Multi-Input Parsing:
  - Teks: LLM structured output parsing nominal Indonesia ("15rb" -> 15.000, "1.5jt" -> 1.500.000, "500k" -> 500.000, "gajian 5jt" -> income, "beli bakso 15rb" -> expense) dengan penanganan pesan error yang mendidik jika ambigu.
  - Foto Struk (Pro only): Vision OCR untuk mengekstraksi rincian nama item, harga per item, dan total ke dalam `transaction_items`. Free/Starter menerima notifikasi ramah upgrade ke Pro.
  - Voice Note (VN): Audio speech-to-text transkripsi -> diteruskan ke LLM parser dengan menampilkan kutipan transkrip `🎙️ Transkrip: "..."`. Batas durasi maksimal 60 detik.
- Format balasan bot:
  - Format pengeluaran dengan progress bar visual budget (`█` dan `░`), persentase terpakai, dan sisa nominal.
  - Format pemasukan dengan pesan motivasi.
  - Bot commands: `/saldo`, `/hari ini`, `/minggu ini`, `/bulan ini`, `/budget`, `/bantuan`.
  - AI Financial Advisor (Pro): Trigger otomatis saat pengeluaran kategori naik >50% dari minggu lalu, atau pengeluaran >80% total pemasukan bulan berjalan.
  - Limit checking: Enforce limit 50 transaksi/bulan untuk plan Starter dengan pesan upgrade yang ramah.

### R3. Web App Dashboard & High-Valuation Fintech UI
- Desain ultra-luxurious ($5M SaaS aesthetic): Palette Orange (#FF5A1F / #F97316) + Clean Slate/White, micro-animations Framer Motion, tipografi modern Plus Jakarta Sans / Inter.
- Multi-Wallet: Manajemen saldo dompet dinamis (BCA, Mandiri, Cash, GoPay, OVO) dengan transfer antar wallet.
- Onboarding interaktif: AI-generated initial categories survey.
- Dashboard Beranda: 4 Stats Cards (Saldo Total, Pemasukan Bulan Ini, Pengeluaran Bulan Ini, Budget Tersisa), Donut Category chart, Bar Chart 6-bulan, Daily expense trendline, 10 Transaksi Terbaru, Empty state onboarding checklist.
- Laporan Lengkap (Native): Tabel transaksi dengan pagination, sorting, advanced filters (kategori, wallet, date range, tipe), pencarian catatan, ringkasan net cashflow, item breakdown accordion/modal untuk transaksi struk.
- On-Demand Export Engine: Generator PDF & Excel (.xlsx) instan untuk range kustom, terintegrasi ke Supabase Storage dengan signed URLs dan histori download.
- User Settings: Tab Profil, Tab Telegram Bot (koneksi & tutorial BotFather), Tab Reminder (1x/2x sehari jam WIB), Tab Kategori (custom emoji & color picker).

### R4. Admin Dashboard
- Terpisah dari user view dengan proteksi role superadmin.
- AI Provider Switchboard: Konfigurasi Gemini / GPT / DeepSeek, mode single atau parallel failover, monitoring latency & error log.
- User Management: List pengguna, status subscription, kuota transaksi, filter status Telegram.
- Manual Payment Approvals: Verifikasi & approval manual transfer Midtrans.
- User Impersonation: Masuk ke dashboard user untuk troubleshooting dengan audit logging otomatis.

### R5. Landing Page & Pricing
- Landing page kelas dunia sesuai spesifikasi Part 7 (Hero badge, headline gradient orange, placeholder video, problem-solution bullet points, interactive preview simulator, feature alternating cards, masonry testimonials placeholder, pricing toggle Starter Rp49k/bln vs Pro Rp99k sekali bayar, 7 FAQ accordion, orange gradient CTA, footer 4 kolom).
- Auth Pages: Split layout 40/60 premium dengan branding panel "Keuanganmu. Terkontrol." dan glowing orange focus states.

## Acceptance Criteria

### Verification & Quality Gates
- [ ] Next.js app berhasil di-build tanpa type/lint error (`npm run build`).
- [ ] Skema database SQL lengkap tersedia di `supabase/migrations/` dan dapat dieksekusi secara idempotent.
- [ ] Endpoint `/api/telegram/webhook` merespons 200 OK dan menolak update_id duplikat.
- [ ] Test case unit untuk parser nominal Indonesia ("15rb", "1,5jt", "500k", "2.5 juta", "sepuluh ribu") lolos 100%.
- [ ] Generator export PDF dan Excel menghasilkan binary file valid (.pdf dan .xlsx).
- [ ] Gatekeeper middleware membatasi fitur Pro (struk OCR, export laporan, AI advisor) untuk user Starter.
- [ ] UI sepenuhnya responsif di breakpoint 375px (mobile) dan 1280px+ (desktop), lulus tema ultra-premium tanpa nuansa template murahan.

## Follow-up — 2026-09-21T03:22:26Z

Use a full multi-agent team for SimpanUang SaaS Telegram Bot & Dashboard Integration.

Working directory: /Users/lukiramdani/.gemini/antigravity/scratch/simpandana
Integrity mode: development

## Requirements

### R1. Telegram Bot Auto-Poller & Sub-Second Processing
Sub-second natural language processing for text, voice notes, and receipt OCR transactions sent to @TugasLukiBot, with silent background auto-polling and persistent bot token resolution.

### R2. Reactive Multi-Wallet Dashboard Synchronization
Instant real-time update of total balance, wallet balances, recent transaction history table, and category budget progress bars on /dashboard upon receiving any Telegram transaction.

### R3. Granular 7-Step Status Lifecycle & Telemetry
Provide transparent 7-step status breakdown (RECEIVED -> USER_IDENTIFIED -> PARSED -> TRANSACTION_CREATED -> BALANCE_UPDATED -> DASHBOARD_SYNCED -> COMPLETED) and latency telemetry cards in /admin.

## Acceptance Criteria

### Execution & Verification
- [ ] npm test: All 123 unit test suites pass 100%.
- [ ] npm run build: Next.js production build succeeds with 0 errors across all 21 routes.
- [ ] node tests/e2e/runner.js: All 299 E2E test suites pass 100%.
- [ ] Next.js server running as daemon on port 3005 (http://localhost:3005).
