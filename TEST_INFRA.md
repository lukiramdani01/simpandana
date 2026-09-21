# TEST_INFRA — TataDana E2E Test Infrastructure & Architecture Specification

**Project**: TataDana — Premium Indonesian Personal Finance SaaS ($5M Valuation Grade)  
**Author**: E2E Testing Track Lead (`teamwork_preview_test_writer_e2e`)  
**Status**: ACTIVE / CERTIFIED  
**Integrity Mode**: Development / Opaque-Box Dual Track  
**Timestamp**: 2026-09-15  

---

## 1. Executive Summary & Testing Philosophy

Under the Dual-Track Project Architecture, the **E2E Testing Track** operates independently from the implementation track. The test suite is designed as an **opaque-box, requirement-driven verification system** derived strictly from:
- `ORIGINAL_REQUEST.md` (Authoritative user requirements)
- `PROJECT.md` (System architecture, feature inventory, interface contracts, and code layout)
- Domain specifications mined in `.agents/teamwork_preview_spec_miner_survey_*/`

### Core Tenets of the E2E Test Suite:
1. **Opaque-Box Integrity**: Tests test observable behavior and contract specifications, not internal implementation quirks. They never rely on private unexported helper variables.
2. **Deterministic & Self-Contained**: Each test sets up its own preconditions, executes assertions independently, and does not leak state to subsequent tests.
3. **Dual Execution Capability**:
   - **Contract & Specification Mode**: Validates the end-to-end business rules, data schemas, mathematical thresholds, Indonesian linguistic nominal parsers, and API contracts directly.
   - **Live Network Mode**: When `TEST_API_URL` or a live Next.js server is available, tests can route live HTTP requests through the server endpoints (`/api/telegram/webhook`, `/api/export`, `/api/payment`, etc.).
4. **Authoritative Output Derivation**: Expected outputs are derived from documented specifications, mathematical formulas (e.g. budget utilization percentages, 50-transaction quotas), Indonesian linguistic rules ("15rb" = 15,000; "1.5jt" = 1,500,000), and RFC/file format standards (PDF `%PDF-`, Excel `PK\x03\x04`).

---

## 2. 4-Tier Test Taxonomy

The test suite is structured into four progressive tiers to ensure exhaustive, multi-layered quality gating:

```
                  ┌──────────────────────────────────────────────┐
                  │ Tier 4: Real-World Application Workflows     │  (≥5 Multi-Step Journeys)
                  ├──────────────────────────────────────────────┤
                  │ Tier 3: Cross-Feature Combinations           │  (Pairwise Interactions)
                  ├──────────────────────────────────────────────┤
                  │ Tier 2: Boundary, Extreme & Corner Cases     │  (≥5 Cases per Feature)
                  ├──────────────────────────────────────────────┤
                  │ Tier 1: Primary Feature Coverage             │  (≥5 Cases per Feature)
                  └──────────────────────────────────────────────┘
```

### 2.1 Tier 1: Feature Coverage (Category Partition)
- **Scope**: Covers all 27 features in `PROJECT.md § Feature Inventory` (F01 to F27).
- **Rule**: Minimum 5 test cases per feature (Total ≥ 135 tests).
- **Objective**: Verify the primary "happy path" and functional correctness for every discrete capability specified in the requirements.

### 2.2 Tier 2: Boundary & Corner Cases (Boundary Value Analysis)
- **Scope**: Covers all 27 features in `PROJECT.md § Feature Inventory` (F01 to F27).
- **Rule**: Minimum 5 test cases per feature (Total ≥ 135 tests).
- **Objective**: Stress-test extreme inputs, zero/negative amounts, huge nominals ("999.999.999.999"), decimal variations ("1,5jt" vs "1.5jt"), empty strings, malformed tokens, duplicate primary keys, boundary limits (month transaction 50 vs 51, audio duration 60s vs 61s, budget 79.9% vs 80.0%), and unauthorized access attempts.

### 2.3 Tier 3: Cross-Feature Combinations (Pairwise Interaction Coverage)
- **Scope**: Validates the emergent behavior when two or more distinct subsystems interact.
- **Rule**: Comprehensive pairwise coverage of critical subsystem junctions (≥20 test cases).
- **Key Interactions**:
  1. *Telegram Ingress + Indonesian Nominal Parsing + Multi-Wallet Balance Trigger*
  2. *Vision OCR + Line Item Breakdown + Category Budget Threshold Warning*
  3. *Voice Note STT (60s) + AI Router Failover + Transaction Ledger Ingestion*
  4. *Multi-Wallet Inter-Transfer + Balance Sync + Daily Cashflow Trendline*
  5. *Starter Plan Transaction Quota Guard (50/mo) + Midtrans Payment + Pro Plan Activation*
  6. *Pro Gatekeeper Middleware + On-Demand PDF/Excel Binary Generation + Supabase Signed URL*
  7. *Superadmin Impersonation + Tenant RLS Bypass + Mandatory `audit_logs` Trail*
  8. *AI Category Surge (>50%) + Burn Rate Warning (>80% Income) + Bot Telegram Notification*

### 2.4 Tier 4: Real-World Application Scenarios (Multi-Step Workflows)
- **Scope**: End-to-end lifecycles representing realistic user and administrator journeys.
- **Rule**: Minimum 5 rich multi-step scenarios.
- **Scenarios Included**:
  1. **Scenario 1 — New User Onboarding & Monthly Salary Split**:
     - User signs up via Phone OTP (dev bypass `123456`) → Profile & Cash wallet initialized → Logs Rp 15.000.000 salary via Telegram text → Transfers funds to BCA and GoPay → Verifies dashboard KPI cards and wallet balances.
  2. **Scenario 2 — Pro Family Supermarket Run (OCR Struk Pintar)**:
     - Pro user uploads supermarket receipt photo → Vision OCR extracts 5 items, PPN 11%, total Rp 450.000 → Items saved in `transaction_items` → Wallet deducted → Category budget passes 80% threshold → Telegram responds with item breakdown and visual progress bar `[████████░░] 82%`.
  3. **Scenario 3 — Monthly Financial Audit & Export**:
     - User logs daily expenses via voice note and text → Reviews transaction ledger with pagination & date filters → Generates PDF report and Excel spreadsheet → Validates binary signatures and signed URL delivery.
  4. **Scenario 4 — Starter Tier Quota Ceiling & Midtrans Upgrade**:
     - Starter user records 50 transactions → 51st transaction is blocked with friendly Pro upgrade notification → User initiates Pro upgrade via Midtrans → Webhook confirms payment → User status transitions to `pro` → Unlimited transactions and OCR unlocked.
  5. **Scenario 5 — Multi-Provider AI Resilient Failover**:
     - User submits colloquial expense entry → Primary Gemini provider simulates timeout (5000ms) → Secondary OpenAI provider returns 429 rate limit → Tertiary DeepSeek returns 500 error → Offline Deterministic Regex Parser kicks in → Transaction successfully parsed and logged with full audit telemetry in `ai_logs`.
  6. **Scenario 6 — Admin AI Switchboard Tuning & User Impersonation**:
     - Superadmin logs in → Navigates to `/admin` → Reconfigures AI switchboard to parallel race mode → Initiates impersonation session to troubleshoot user transaction → System logs immutable audit record in `audit_logs` → Verifies user view with orange theme banner.
  7. **Scenario 7 — Budget Threshold Surge & Pro Financial Advisor Alerts**:
     - User records entertainment expense causing "Hiburan" category to spike >50% compared to previous week → Monthly burn rate crosses 80% of monthly income → Bot engine dispatches combined advisory insights alongside visual budget overflow glyphs `[██████████] 110%`.

---

## 3. Directory Layout & File Manifest

The E2E test suite resides exclusively under `tests/e2e/`:

```
tests/e2e/
├── runner.js                      # Standalone CLI test runner (exit 0 on pass, 1 on fail)
├── helpers/
│   ├── test-harness.js            # Assertions, test runner context, reporting formatters
│   ├── reference-oracle.js        # Mathematical & grammatical oracle for nominals & budgets
│   ├── schema-validator.js        # PostgreSQL table schema & column contract validators
│   ├── mock-adapters.js           # Deterministic mock server & API response simulators
│   └── fixtures.js                # Standard test entities (profiles, wallets, categories, etc.)
├── tier1-feature/
│   ├── f01-db-schemas.test.js     # Feature 1: 12 Tables & Schema Integrity
│   ├── f02-rls-rbac.test.js       # Feature 2: RLS & Tenant Isolation
│   ├── f03-auth-dual-mode.test.js # Feature 3: Email/OAuth/Phone OTP Dev Bypass
│   ├── f04-db-triggers.test.js    # Feature 4: Automation Triggers & Balance Sync
│   ├── f05-telegram-idem.test.js  # Feature 5: Telegram Webhook Idempotency
│   ├── f06-nominal-parser.test.js # Feature 6: Indonesian Nominal Parser
│   ├── f07-ocr-receipt.test.js    # Feature 7: Vision OCR Receipt Parser (Pro)
│   ├── f08-voice-stt.test.js      # Feature 8: Voice Note STT Ingress (60s cap)
│   ├── f09-ai-failover.test.js    # Feature 9: Multi-Provider AI Failover & Telemetry
│   ├── f10-bot-formatting.test.js # Feature 10: Bot Progress Bar & Motivation Quotes
│   ├── f11-multi-wallet.test.js   # Feature 11: Multi-Wallet & Inter-Wallet Transfer
│   ├── f12-budget-tracker.test.js # Feature 12: Category Budget Tracker (80%/100%)
│   ├── f13-tx-limits.test.js      # Feature 13: Transaction CRUD & 50 tx/mo Limit
│   ├── f14-parser-unit.test.js    # Feature 14: Indonesian Parser Unit Test Coverage
│   ├── f15-ui-theme.test.js       # Feature 15: $5M SaaS UI Theme & Design Tokens
│   ├── f16-dashboard.test.js      # Feature 16: Financial Dashboard Beranda & KPIs
│   ├── f17-reports-ledger.test.js # Feature 17: Native Reports & Ledger Table
│   ├── f18-responsive.test.js     # Feature 18: Responsive Layout (375px & 1280px+)
│   ├── f19-onboarding.test.js     # Feature 19: Onboarding Flow & Settings
│   ├── f20-gatekeeper.test.js     # Feature 20: Pro Feature Gatekeeper Middleware
│   ├── f21-export-engine.test.js  # Feature 21: On-Demand PDF & Excel Export Engine
│   ├── f22-ai-advisor.test.js     # Feature 22: AI Financial Advisor Spikes & Burn Rate
│   ├── f23-admin-suite.test.js    # Feature 23: Admin Dashboard & User Management
│   ├── f24-ai-switchboard.test.js # Feature 24: AI Switchboard Config & Logs
│   ├── f25-midtrans.test.js       # Feature 25: Midtrans Payment & Manual Approvals
│   ├── f26-impersonation.test.js  # Feature 26: User Impersonation & Audit Trail
│   └── f27-landing-page.test.js   # Feature 27: World-Class Landing Page & 40/60 Auth
├── tier2-boundary/
│   ├── f01-bnd-schemas.test.js    # Schema boundary & constraint checks
│   ├── f02-bnd-rls.test.js        # RLS boundary & cross-tenant injection checks
│   ├── f03-bnd-auth.test.js       # Auth boundary, expired tokens, phone formatting
│   ├── f04-bnd-triggers.test.js   # Trigger boundary: zero deltas, deleted categories
│   ├── f05-bnd-idem.test.js       # Duplicate update_id bursts, concurrent webhooks
│   ├── f06-bnd-parser.test.js     # Nominal boundaries: 999.999.999, negative, words
│   ├── f07-bnd-ocr.test.js        # OCR boundaries: corrupt photos, zero-item receipts
│   ├── f08-bnd-voice.test.js      # Voice boundaries: exactly 60s vs 61s, silent audio
│   ├── f09-bnd-ai.test.js         # AI boundaries: all providers 500, empty prompt
│   ├── f10-bnd-bot.test.js        # Bot boundaries: 0% and 250% budget overflow bars
│   ├── f11-bnd-wallet.test.js     # Wallet boundaries: self-transfer, negative balance
│   ├── f12-bnd-budget.test.js     # Budget boundaries: 79.9% vs 80.0%, 99.9% vs 100.0%
│   ├── f13-bnd-limits.test.js     # Transaction quota boundaries: exactly 50 vs 51 tx
│   ├── f14-bnd-parser-ext.test.js # Parser boundaries: mixed scripts, unicode currencies
│   ├── f15-bnd-theme.test.js      # CSS tokens boundary: contrast ratios, hex values
│   ├── f16-bnd-dashboard.test.js  # Dashboard boundaries: empty state, 0 income 0 expense
│   ├── f17-bnd-reports.test.js    # Ledger boundaries: 0 results, page out-of-bounds
│   ├── f18-bnd-responsive.test.js # Viewport boundaries: 320px, 375px, 768px, 1280px
│   ├── f19-bnd-onboarding.test.js # Settings boundaries: invalid WIB hour (25:00)
│   ├── f20-bnd-gatekeeper.test.js # Gatekeeper boundaries: unknown plan, forged header
│   ├── f21-bnd-export.test.js     # Export boundaries: inverted date range, 0 transactions
│   ├── f22-bnd-advisor.test.js    # Advisor boundaries: 49.9% vs 50.1% spike threshold
│   ├── f23-bnd-admin.test.js      # Admin boundaries: non-admin 403, missing session
│   ├── f24-bnd-switchboard.test.js# Switchboard boundaries: invalid weights, 0 active
│   ├── f25-bnd-midtrans.test.js   # Midtrans boundaries: invalid signature, duplicate order
│   ├── f26-bnd-audit.test.js      # Audit boundaries: non-nullable reason, immutable log
│   └── f27-bnd-landing.test.js    # Landing boundaries: pricing toggle state changes
├── tier3-combination/
│   ├── c01-ocr-wallet-budget.test.js   # OCR scan -> wallet deduction -> budget trigger
│   ├── c02-webhook-idem-format.test.js # Webhook update -> idempotency check -> bot reply
│   ├── c03-transfer-analytics.test.js  # Inter-wallet transfer -> balance sync -> cashflow
│   ├── c04-auth-rls-admin.test.js      # Superadmin impersonation -> RLS bypass -> audit log
│   ├── c05-quota-midtrans-pro.test.js  # Starter quota hit (50) -> Midtrans pay -> Pro upgrade
│   ├── c06-ai-failover-telemetry.test.js# AI failover chain -> fallback regex -> ai_logs
│   ├── c07-pro-gatekeeper-export.test.js# Gatekeeper check -> binary PDF/Excel -> signed URL
│   └── c08-voice-stt-parser-ledger.test.js# Voice note 60s -> STT preview -> ledger insert
└── tier4-workflow/
    ├── w01-onboarding-salary-split.test.js     # Multi-step onboarding to salary distribution
    ├── w02-pro-supermarket-ocr.test.js         # Multi-step OCR receipt to budget threshold
    ├── w03-monthly-audit-export.test.js        # Multi-step daily logging to PDF/XLSX export
    ├── w04-starter-ceiling-upgrade.test.js     # Multi-step quota breach to Midtrans Pro upgrade
    ├── w05-ai-outage-fallback-recovery.test.js # Multi-step AI cascading outage to regex recovery
    ├── w06-admin-switchboard-impersonation.test.js # Multi-step admin switchboard & audit
    └── w07-budget-surge-advisor-flow.test.js   # Multi-step expense surge to advisory alerts
```

---

## 4. Test Execution & Automation Protocol

### 4.1 CLI Command Interface
The test suite can be run directly using Node.js without requiring any third-party test runners:

```bash
# Run all tiers (Tier 1 through Tier 4)
node tests/e2e/runner.js

# Or via npm script
npm run test:e2e

# Run a specific tier
node tests/e2e/runner.js --tier=1
node tests/e2e/runner.js --tier=2
node tests/e2e/runner.js --tier=3
node tests/e2e/runner.js --tier=4

# Run a specific feature
node tests/e2e/runner.js --feature=06

# Verbose output with full assertion traces
node tests/e2e/runner.js --verbose
```

### 4.2 Exit Code Convention
- `0`: All executed test cases passed successfully.
- `1`: One or more test cases failed (with failure stack trace, file path, and expected vs actual diff).

---

## 5. Authoritative Expected Output Derivation

Every assertion in the test suite is derived from authoritative specifications:

| Domain | Rule / Formula | Authoritative Source |
| :--- | :--- | :--- |
| **Indonesian Nominal "rb" / "k"** | `amount = value * 1,000` (e.g. `15rb` -> `15000`, `500k` -> `500000`) | `ORIGINAL_REQUEST.md` R2, Line 33 |
| **Indonesian Nominal "jt" / "juta"**| `amount = value * 1,000,000` (e.g. `1.5jt` -> `1500000`, `2.5 juta` -> `2500000`) | `ORIGINAL_REQUEST.md` R2, Line 33 |
| **Indonesian Words** | `"sepuluh ribu"` -> `10000`, `"satu juta lima ratus ribu"` -> `1500000` | `ORIGINAL_REQUEST.md` Line 69 |
| **Budget Progress Bar** | 10 glyph segments: `filled = Math.min(10, Math.floor(spent / limit * 10))` using `█` and `░` | `ORIGINAL_REQUEST.md` R2, Line 37 |
| **Budget 80% Alert** | `spent >= 0.80 * limit` triggers `alert_80_sent = true` | `ORIGINAL_REQUEST.md` R1 Line 17, R2 Line 40 |
| **Budget 100% Alert** | `spent >= 1.00 * limit` triggers `alert_100_sent = true` | `ORIGINAL_REQUEST.md` R1 Line 17, R2 Line 40 |
| **Starter Quota Limit** | `monthly_tx_count <= 50` allowed; 51st rejected with HTTP 403 / Pro upgrade message | `ORIGINAL_REQUEST.md` R2, Line 41 |
| **Voice STT Duration** | `duration <= 60` allowed; `> 60` rejected with descriptive error | `ORIGINAL_REQUEST.md` R2, Line 35 |
| **Voice STT Feedback** | Must include verbatim prefix `🎙️ Transkrip: "` | `ORIGINAL_REQUEST.md` R2 Line 35, Line 49 |
| **Idempotency Gate** | Duplicate `update_id` in `telegram_webhook_updates` returns HTTP 200 `{ ok: true, duplicate: true }` without mutation | `ORIGINAL_REQUEST.md` R1 Line 25, R2 Line 30 |
| **PDF Binary Header** | Buffer must begin with `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`) | RFC 3778 / PDF Standard |
| **Excel Binary Header** | Buffer must begin with `PK\x03\x04` (`0x50, 0x4B, 0x03, 0x04`) | OpenXML ZIP Container Spec |
| **Pro Feature Gates** | Starter users blocked from `ocr`, `export`, and `advisor`; Pro users allowed | `ORIGINAL_REQUEST.md` Line 71 |
| **Phone OTP Bypass** | Phone number with OTP code `'123456'` verified instantly in dev mode | `ORIGINAL_REQUEST.md` R1 Line 27, Line 50 |

---

## 6. Traceability Matrix (Features 1–27)

| Feature # | Feature Name | Tier 1 Suite | Tier 2 Suite | Tier 3/4 Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **F01** | Database Migrations & Schemas | `f01-db-schemas.test.js` | `f01-bnd-schemas.test.js` | `c04`, `w01` |
| **F02** | Row Level Security (RLS) & RBAC | `f02-rls-rbac.test.js` | `f02-bnd-rls.test.js` | `c04`, `w06` |
| **F03** | Dual-Mode Authentication | `f03-auth-dual-mode.test.js` | `f03-bnd-auth.test.js` | `c04`, `w01` |
| **F04** | Database Automation Triggers | `f04-db-triggers.test.js` | `f04-bnd-triggers.test.js` | `c01`, `c03`, `w01` |
| **F05** | Telegram Webhook Idempotency | `f05-telegram-idem.test.js` | `f05-bnd-idem.test.js` | `c02`, `w01` |
| **F06** | Indonesian Nominal Parser | `f06-nominal-parser.test.js` | `f06-bnd-parser.test.js` | `c02`, `w01`, `w03` |
| **F07** | Vision OCR Receipt Parser (Pro) | `f07-ocr-receipt.test.js` | `f07-bnd-ocr.test.js` | `c01`, `w02` |
| **F08** | Voice Note STT Ingress | `f08-voice-stt.test.js` | `f08-bnd-voice.test.js` | `c08`, `w03` |
| **F09** | Multi-Provider AI Failover | `f09-ai-failover.test.js` | `f09-bnd-ai.test.js` | `c06`, `w05` |
| **F10** | Bot Response Formatting & Commands | `f10-bot-formatting.test.js` | `f10-bnd-bot.test.js` | `c01`, `c02`, `w02` |
| **F11** | Multi-Wallet & Transfer Engine | `f11-multi-wallet.test.js` | `f11-bnd-wallet.test.js` | `c01`, `c03`, `w01` |
| **F12** | Category Budget Tracker | `f12-budget-tracker.test.js` | `f12-bnd-budget.test.js` | `c01`, `w02`, `w07` |
| **F13** | Transaction Management & Limits | `f13-tx-limits.test.js` | `f13-bnd-limits.test.js` | `c05`, `w04` |
| **F14** | Indonesian Parser Unit Test Suite | `f14-parser-unit.test.js` | `f14-bnd-parser-ext.test.js`| `w01`, `w05` |
| **F15** | $5M SaaS UI Theme & Design Tokens | `f15-ui-theme.test.js` | `f15-bnd-theme.test.js` | `w01`, `w06` |
| **F16** | Financial Dashboard Beranda | `f16-dashboard.test.js` | `f16-bnd-dashboard.test.js`| `w01`, `w02` |
| **F17** | Native Reports & Ledger Table | `f17-reports-ledger.test.js` | `f17-bnd-reports.test.js` | `w03` |
| **F18** | Responsive Mobile & Desktop Layout | `f18-responsive.test.js` | `f18-bnd-responsive.test.js`| `w01`, `w03` |
| **F19** | Onboarding Flow & Settings | `f19-onboarding.test.js` | `f19-bnd-onboarding.test.js`| `w01` |
| **F20** | Pro Feature Gatekeeper Middleware | `f20-gatekeeper.test.js` | `f20-bnd-gatekeeper.test.js`| `c05`, `c07`, `w04` |
| **F21** | On-Demand PDF & Excel Export | `f21-export-engine.test.js` | `f21-bnd-export.test.js` | `c07`, `w03` |
| **F22** | AI Financial Advisor (Pro) | `f22-ai-advisor.test.js` | `f22-bnd-advisor.test.js` | `w07` |
| **F23** | Admin Dashboard & RBAC | `f23-admin-suite.test.js` | `f23-bnd-admin.test.js` | `c04`, `w06` |
| **F24** | AI Provider Switchboard | `f24-ai-switchboard.test.js` | `f24-bnd-switchboard.test.js`| `c06`, `w06` |
| **F25** | Midtrans Payment & Manual Approvals| `f25-midtrans.test.js` | `f25-bnd-midtrans.test.js` | `c05`, `w04` |
| **F26** | User Impersonation & Audit Logs | `f26-impersonation.test.js` | `f26-bnd-audit.test.js` | `c04`, `w06` |
| **F27** | Landing Page & 40/60 Split Auth | `f27-landing-page.test.js` | `f27-bnd-landing.test.js` | `w01`, `w04` |

---
*Signed by E2E Testing Sub-Orchestrator & Test Writer — TataDana Dual Track Quality Architecture.*
