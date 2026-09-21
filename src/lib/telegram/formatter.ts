/**
 * Telegram Message & Data Formatter
 * Formats Indonesian currency, WIB dates, visual budget progress bars,
 * and standard Part 4.4 & 4.5 structured bot responses.
 */

/**
 * Format number into Indonesian Rupiah format with dot separator (e.g. 1.500.000)
 */
export function formatRupiah(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Visual budget progress bar using exactly 10 glyph blocks (█ and ░)
 * Matches reference oracle specification:
 * - Normal: [█████░░░░░] 50% (Rp 500.000 / Rp 1.000.000) Sisa: Rp 500.000
 * - Overflow: [██████████] 250% (Rp 2.500.000 / Rp 1.000.000) ⚠️ Melebihi budget sebesar Rp 1.500.000!
 * - Zero limit: [░░░░░░░░░░] 0% (Rp 50.000 / Rp 0)
 */
export function formatBudgetProgressBar(spent: number, limit: number): string {
  if (limit <= 0) {
    return `[░░░░░░░░░░] 0% (Rp ${formatRupiah(spent)} / Rp 0)`;
  }

  const ratio = spent / limit;
  const percent = Math.round(ratio * 100);
  const filledCount = Math.min(10, Math.max(0, Math.floor(ratio * 10)));
  const emptyCount = 10 - filledCount;
  const barGlyphs = '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  const remaining = Math.max(0, limit - spent);

  if (spent > limit) {
    const overflow = spent - limit;
    return `[██████████] ${percent}% (Rp ${formatRupiah(spent)} / Rp ${formatRupiah(
      limit
    )}) ⚠️ Melebihi budget sebesar Rp ${formatRupiah(overflow)}!`;
  }

  return `[${barGlyphs}] ${percent}% (Rp ${formatRupiah(spent)} / Rp ${formatRupiah(
    limit
  )}) Sisa: Rp ${formatRupiah(remaining)}`;
}

/**
 * Get current date string in WIB (Asia/Jakarta) YYYY-MM-DD
 */
export function getWIBDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
}

/**
 * Format WIB Date for display (e.g. "Rabu, 16 September 2026")
 */
export function formatWIBDisplay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format WIB date and time header (Part 4.4 & 4.5): 📅 [Hari], [Tanggal] — [Jam WIB]
 */
export function formatWIBHeader(date: Date = new Date()): string {
  const day = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).format(date);
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':');

  return `📅 ${day}, ${dateStr} — ${timeStr} WIB`;
}

/**
 * Maps category name to contextual emoji
 */
export function getCategoryEmoji(categoryName: string): string {
  const lower = (categoryName || '').toLowerCase();
  if (lower.includes('makan') || lower.includes('minum') || lower.includes('kopi') || lower.includes('bakso') || lower.includes('padang')) return '🍜';
  if (lower.includes('transport') || lower.includes('bensin') || lower.includes('ojol') || lower.includes('parkir') || lower.includes('pertamax')) return '🚗';
  if (lower.includes('hiburan') || lower.includes('nonton') || lower.includes('game') || lower.includes('netflix')) return '🎮';
  if (lower.includes('tagihan') || lower.includes('listrik') || lower.includes('air') || lower.includes('pulsa') || lower.includes('wifi') || lower.includes('pln')) return '🏠';
  if (lower.includes('sehat') || lower.includes('obat') || lower.includes('dokter')) return '💊';
  if (lower.includes('belanja') || lower.includes('baju') || lower.includes('supermarket') || lower.includes('mall')) return '👕';
  if (lower.includes('pendidikan') || lower.includes('kursus') || lower.includes('buku')) return '📚';
  if (lower.includes('gaji') || lower.includes('income') || lower.includes('bonus') || lower.includes('honor')) return '💰';
  return '📦';
}

export interface FormatExpenseReplyParams {
  amount: number;
  categoryName: string;
  walletName?: string;
  notes?: string;
  balanceAfter?: number;
  budgetLimit?: number;
  currentSpent?: number;
  progressBarString?: string;
  advisorWarning?: string;
}

/**
 * Generates structured bot reply for Expense (Specification Part 4.4)
 */
export function formatTelegramExpenseReply(params: FormatExpenseReplyParams): string {
  const header = formatWIBHeader();
  const emoji = getCategoryEmoji(params.categoryName);
  const wallet = params.walletName || 'Tunai (Cash)';
  const notes = params.notes || params.categoryName;
  const balance = params.balanceAfter !== undefined ? `Rp${formatRupiah(params.balanceAfter)}` : 'Tersinkron';

  let reply = `${header}
💸 Pengeluaran tercatat!
├ Nominal : Rp${formatRupiah(params.amount)}
├ Kategori : ${emoji} ${params.categoryName}
├ Dompet : 👛 ${wallet}
├ Catatan : ${notes}
└ Saldo : ${balance}`;

  if (params.budgetLimit && params.budgetLimit > 0 && params.currentSpent !== undefined) {
    const ratio = params.currentSpent / params.budgetLimit;
    const percent = Math.min(999, Math.round(ratio * 100));
    const sisa = Math.max(0, params.budgetLimit - params.currentSpent);
    const filledBlocks = Math.min(10, Math.max(0, Math.floor(ratio * 10)));
    const emptyBlocks = 10 - filledBlocks;
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    let motivation = '';
    if (ratio >= 1.0) {
      motivation = '\n⚠️ Budget kategori ini telah melampaui batas maksimal!';
    } else if (ratio >= 0.8) {
      motivation = '\n⚠️ Perhatian: Budget kategori ini hampir habis!';
    } else {
      motivation = '\n💡 Terkendali dengan baik! Tetap hemat ya.';
    }

    reply += `\n\n📊 Budget ${params.categoryName} bulan ini:
[${bar}] ${percent}% — sisa Rp${formatRupiah(sisa)}${motivation}`;
  } else if (params.progressBarString) {
    reply += `\n\n📊 Budget ${params.categoryName} bulan ini:\n${params.progressBarString}`;
  }

  if (params.advisorWarning) {
    reply += `\n\n${params.advisorWarning}`;
  }

  return reply;
}

export interface FormatIncomeReplyParams {
  amount: number;
  walletName?: string;
  balanceAfter?: number;
}

/**
 * Generates structured bot reply for Income (Specification Part 4.5)
 */
export function formatTelegramIncomeReply(params: FormatIncomeReplyParams): string {
  const header = formatWIBHeader();
  const wallet = params.walletName || 'Tunai (Cash)';
  const balance = params.balanceAfter !== undefined ? `Rp${formatRupiah(params.balanceAfter)}` : 'Tersinkron';

  return `${header}
💰 Pemasukan Rp ${formatRupiah(params.amount)} tercatat!
├ Nominal : Rp${formatRupiah(params.amount)}
├ Kategori : 💼 Pemasukan
├ Dompet : 👛 ${wallet}
└ Saldo baru : ${balance}

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya, semoga rezeki makin berkah dan melimpah.`;
}
