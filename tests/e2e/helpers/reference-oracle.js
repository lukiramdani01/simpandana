/**
 * TataDana Reference Oracle & Mathematical Specification
 * Authoritative ground-truth implementation for parsing, calculation, and boundary verification.
 */

/**
 * Word-to-number dictionary for Indonesian number words
 */
const INDO_WORD_MAP = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  belas: 10, // used in conjunction: dua belas -> 2 + 10
  puluh: 10, // used in conjunction: dua puluh -> 2 * 10
  seratus: 100,
  ratus: 100,
  seribu: 1000,
  ribu: 1000,
  sejuta: 1000000,
  juta: 1000000,
  miliar: 1000000000,
  milyar: 1000000000,
  triliun: 1000000000000,
};

/**
 * Parse Indonesian word nominal e.g. "sepuluh ribu", "dua puluh lima ribu", "satu juta lima ratus ribu"
 */
const INDO_DIGITS = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};

function parseIndonesianWords(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Fast paths for common exact phrases
  if (cleaned === 'sepuluh ribu') return 10000;
  if (cleaned === 'dua puluh ribu') return 20000;
  if (cleaned === 'dua puluh lima ribu') return 25000;
  if (cleaned === 'lima puluh ribu') return 50000;
  if (cleaned === 'seratus ribu') return 100000;
  if (cleaned === 'satu juta') return 1000000;
  if (cleaned === 'satu juta lima ratus ribu') return 1500000;
  if (cleaned === 'dua juta lima ratus ribu') return 2500000;
  if (cleaned === 'seribu') return 1000;

  const words = cleaned.split(' ');
  let total = 0;
  let group = 0;
  let temp = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (w === 'nol' || w === 'kosong') {
      // no-op
    } else if (INDO_DIGITS[w] !== undefined) {
      if (temp > 0) {
        group += temp;
      }
      temp = INDO_DIGITS[w];
    } else if (w === 'belas') {
      group += (temp === 0 ? 1 : temp) + 10;
      temp = 0;
    } else if (w === 'sebelas') {
      if (temp > 0) group += temp;
      group += 11;
      temp = 0;
    } else if (w === 'sepuluh') {
      if (temp > 0) group += temp;
      group += 10;
      temp = 0;
    } else if (w === 'puluh') {
      group += (temp === 0 ? 1 : temp) * 10;
      temp = 0;
    } else if (w === 'seratus') {
      if (temp > 0) group += temp;
      group += 100;
      temp = 0;
    } else if (w === 'ratus') {
      group += (temp === 0 ? 1 : temp) * 100;
      temp = 0;
    } else if (w === 'seribu') {
      const periodVal = group + temp;
      total += periodVal === 0 ? 1000 : periodVal + 1000;
      group = 0;
      temp = 0;
    } else if (w === 'sejuta') {
      const periodVal = group + temp;
      total += (periodVal === 0 ? 1 : periodVal) * 1000000;
      group = 0;
      temp = 0;
    } else if (w === 'ribu') {
      const periodVal = group + temp;
      total += (periodVal === 0 ? 1 : periodVal) * 1000;
      group = 0;
      temp = 0;
    } else if (w === 'juta') {
      const periodVal = group + temp;
      total += (periodVal === 0 ? 1 : periodVal) * 1000000;
      group = 0;
      temp = 0;
    } else if (w === 'miliar' || w === 'milyar' || w === 'semiliar' || w === 'semilyar') {
      const periodVal = group + temp;
      total += (periodVal === 0 ? 1 : periodVal) * 1000000000;
      group = 0;
      temp = 0;
    } else if (w === 'triliun' || w === 'setriliun') {
      const periodVal = group + temp;
      total += (periodVal === 0 ? 1 : periodVal) * 1000000000000;
      group = 0;
      temp = 0;
    }
  }

  total += group + temp;
  return total > 0 ? total : null;
}

/**
 * Authoritative Indonesian Nominal Parser Oracle
 */
function parseIndonesianNominalOracle(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  const rawInput = text;

  // Reject unsupported foreign currencies
  if (/(?:[\$€£¥]|(?:USD|SGD|EUR|AUD|GBP|JPY)\b)/i.test(text)) {
    return {
      amount: 0,
      type: 'expense',
      categoryHint: 'Lainnya',
      notes: text,
      confidence: 0.1,
      rawInput,
      isAmbiguous: true,
      errorMessage: 'Mata uang asing tidak didukung. Mohon gunakan Rupiah (IDR).',
    };
  }

  // 1. Normalize irregular spacing like "1 . 5 JT" -> "1.5jt", "1 , 5 juta" -> "1.5juta", "500  K" -> "500k"
  const normalized = text
    .replace(/(\d+)\s*([.,])\s*(\d+)\s*(triliun|t|miliar|milyar|m|juta|jt|ribu|rb|k)\b/gi, '$1.$3$4')
    .replace(/(\d+)\s+(triliun|t|miliar|milyar|m|juta|jt|ribu|rb|k)\b/gi, '$1$2')
    .replace(/,\s*-\b/g, '')
    .replace(/,\s*00\b/g, '')
    .trim();
  const lower = normalized.toLowerCase();

  // 2. Determine transaction type
  let type = 'expense';
  if (
    lower.includes('gajian') ||
    lower.includes('gaji') ||
    lower.includes('dapat transfer') ||
    lower.includes('pemasukan') ||
    lower.includes('income') ||
    lower.includes('terima uang') ||
    lower.includes('bonus') ||
    lower.includes('honor') ||
    lower.includes('uang masuk')
  ) {
    type = 'income';
  } else if (
    lower.startsWith('transfer') ||
    lower.includes('pindah dana') ||
    lower.includes('kirim ke') ||
    lower.includes('transfer ke')
  ) {
    type = 'transfer';
  }

  // 3. Extract Category Hint
  let categoryHint = 'Lainnya';
  if (
    lower.includes('kopi') ||
    lower.includes('makan') ||
    lower.includes('bakso') ||
    lower.includes('snack') ||
    lower.includes('resto') ||
    lower.includes('nasgor') ||
    lower.includes('martabak')
  ) {
    categoryHint = 'Makanan & Minuman';
  } else if (
    lower.includes('bensin') ||
    lower.includes('parkir') ||
    lower.includes('ojol') ||
    lower.includes('grab') ||
    lower.includes('gojek') ||
    lower.includes('pertamax')
  ) {
    categoryHint = 'Transportasi';
  } else if (
    lower.includes('kosan') ||
    lower.includes('listrik') ||
    lower.includes('air') ||
    lower.includes('wifi') ||
    lower.includes('pulsa') ||
    lower.includes('pln')
  ) {
    categoryHint = 'Tagihan & Utilitas';
  } else if (lower.includes('gaji') || lower.includes('gajian') || lower.includes('bonus')) {
    categoryHint = 'Gaji';
  } else if (
    lower.includes('belanja') ||
    lower.includes('baju') ||
    lower.includes('sepatu') ||
    lower.includes('supermarket') ||
    lower.includes('hp') ||
    lower.includes('laptop') ||
    lower.includes('buku')
  ) {
    categoryHint = 'Belanja';
  } else if (
    lower.includes('nonton') ||
    lower.includes('bioskop') ||
    lower.includes('game') ||
    lower.includes('netflix') ||
    lower.includes('tiket')
  ) {
    categoryHint = 'Hiburan';
  }

  // 4. Extract Amount
  let amount = 0;
  let confidence = 0.95;

  let wordAmount = null;
  if (!/\d/.test(lower)) {
    wordAmount = parseIndonesianWords(lower);
  }

  if (wordAmount && wordAmount > 0) {
    amount = wordAmount;
  } else {
    // Trillions
    const trillionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:triliun|t)\b/);
    if (trillionMatch) {
      const numStr = trillionMatch[1].replace(',', '.');
      amount = Math.round(parseFloat(numStr) * 1000000000000);
    } else {
      // Billions
      const billionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:milyar|miliar|m)\b/);
      if (billionMatch) {
        const numStr = billionMatch[1].replace(',', '.');
        amount = Math.round(parseFloat(numStr) * 1000000000);
      } else {
        // Millions
        const millionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/);
        if (millionMatch) {
          const numStr = millionMatch[1].replace(',', '.');
          amount = Math.round(parseFloat(numStr) * 1000000);
        } else {
          // Thousands
          const thousandMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu)\b/);
          if (thousandMatch) {
            const numStr = thousandMatch[1].replace(',', '.');
            amount = Math.round(parseFloat(numStr) * 1000);
          } else {
            // Standard Rupiah
            const rupiahMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)(?![\d])/);
            if (rupiahMatch) {
              amount = parseInt(rupiahMatch[1].replace(/\./g, ''), 10);
            } else {
              // Plain integers
              const plainMatch = lower.match(/\b(\d{4,12})\b/);
              if (plainMatch) {
                amount = parseInt(plainMatch[1], 10);
              } else {
                confidence = 0.1;
                amount = 0;
              }
            }
          }
        }
      }
    }
  }

  // 5. Extract Notes
  let notes = text
    .replace(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:triliun|t|milyar|miliar|m|jt|juta|rb|k|ribu)?\b/gi, '')
    .replace(/gajian|gaji|beli|bayar|keluar|transfer/gi, '')
    .trim();
  if (!notes) {
    notes = text;
  }

  const isAmbiguous = amount === 0 || confidence < 0.5;
  const errorMessage = isAmbiguous
    ? 'Nominal tidak terdeteksi. Silakan sertakan nominal seperti "beli bakso 15rb" atau "gajian 5jt".'
    : undefined;

  return {
    amount,
    type,
    categoryHint,
    notes,
    confidence,
    rawInput,
    isAmbiguous,
  };
}



/**
 * Budget visual progress bar generator (10 blocks: █ and ░)
 */
function formatBudgetProgressBarOracle(spent, limit) {
  if (limit <= 0) {
    return `[░░░░░░░░░░] 0% (Rp ${formatRupiah(spent)} / Rp 0)`;
  }

  const ratio = spent / limit;
  const percent = Math.round(ratio * 100);
  const filledCount = Math.min(10, Math.max(0, Math.floor(ratio * 10)));
  const emptyCount = 10 - filledCount;

  const barGlyphs = "█".repeat(filledCount) + "░".repeat(emptyCount);
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
 * Format currency with Indonesian dot thousand separator
 */
function formatRupiah(num) {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Check budget threshold alert flags
 */
function checkBudgetAlertsOracle(spent, limit, prev80Sent = false, prev100Sent = false) {
  if (limit <= 0) return { alert_80: false, alert_100: false };
  const ratio = spent / limit;
  const alert_80 = ratio >= 0.8 && !prev80Sent;
  const alert_100 = ratio >= 1.0 && !prev100Sent;
  return { alert_80, alert_100, ratio };
}

/**
 * Starter plan transaction quota checker (50 limit per month)
 */
function checkStarterQuotaOracle(currentCount) {
  const LIMIT = 50;
  return {
    allowed: currentCount < LIMIT,
    count: currentCount,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - currentCount),
    error: currentCount >= LIMIT ? "Batas kuota 50 transaksi Starter tercapai" : null,
  };
}

/**
 * Voice Note duration checker (60s cap)
 */
function checkVoiceDurationOracle(durationSeconds) {
  const MAX_SECONDS = 60;
  return {
    allowed: durationSeconds <= MAX_SECONDS,
    duration: durationSeconds,
    maxAllowed: MAX_SECONDS,
    error: durationSeconds > MAX_SECONDS ? `Durasi voice note melebihi batas 60 detik (diterima: ${durationSeconds}s)` : null,
  };
}

/**
 * Pro feature gatekeeper oracle
 */
function isProFeatureAllowedOracle(plan, feature) {
  if (plan === "pro") return true;
  // Gated features for Starter: 'ocr', 'export', 'advisor'
  const GATED = ["ocr", "export", "advisor"];
  if (GATED.includes(feature)) {
    return false;
  }
  return true;
}

/**
 * PDF Magic Bytes validator (%PDF-)
 */
function verifyPdfMagicBytesOracle(buffer) {
  if (!buffer || buffer.length < 5) return false;
  const header = buffer.slice(0, 5).toString("ascii");
  return header.startsWith("%PDF-");
}

/**
 * Excel Magic Bytes validator (PK\x03\x04)
 */
function verifyExcelMagicBytesOracle(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

module.exports = {
  parseIndonesianNominalOracle,
  parseIndonesianWords,
  formatBudgetProgressBarOracle,
  formatRupiah,
  checkBudgetAlertsOracle,
  checkStarterQuotaOracle,
  checkVoiceDurationOracle,
  isProFeatureAllowedOracle,
  verifyPdfMagicBytesOracle,
  verifyExcelMagicBytesOracle,
};
