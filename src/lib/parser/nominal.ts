/**
 * Indonesian Nominal NLP Parser
 * TataDana SaaS — Milestone 2 Specification Blueprint
 */

/**
 * Word-to-number dictionary for Indonesian number words
 */
export const INDO_WORD_MAP: Record<string, number> = {
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
  belas: 10, // dua belas -> 2 + 10
  puluh: 10, // dua puluh -> 2 * 10
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

const INDO_DIGITS: Record<string, number> = {
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

export interface ParsedNominal {
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  categoryHint: string;
  notes: string;
  confidence: number;
  rawInput: string;
  isAmbiguous: boolean;
  errorMessage?: string;
}

export function parseIndonesianWords(text: string): number | null {
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

export function parseIndonesianNominal(text: string): ParsedNominal {
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

  // 2. Transaction Type
  let type: 'income' | 'expense' | 'transfer' = 'expense';
  if (
    lower.includes('gajian') ||
    lower.includes('gaji') ||
    lower.includes('dapat transfer') ||
    lower.includes('pemasukan') ||
    lower.includes('income') ||
    lower.includes('terima uang') ||
    lower.includes('terima') ||
    lower.includes('dapat') ||
    lower.includes('bonus') ||
    lower.includes('honor') ||
    lower.includes('komisi') ||
    lower.includes('thr') ||
    lower.includes('omset') ||
    lower.includes('dividen') ||
    lower.includes('cashback') ||
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

  // 3. Category Hint
  let categoryHint = 'Lainnya';
  if (
    lower.includes('kopi') ||
    lower.includes('makan') ||
    lower.includes('bakso') ||
    lower.includes('boba') ||
    lower.includes('snack') ||
    lower.includes('resto') ||
    lower.includes('nasgor') ||
    lower.includes('martabak') ||
    lower.includes('bubur') ||
    lower.includes('pecel') ||
    lower.includes('starbuck') ||
    lower.includes('starbucks') ||
    lower.includes('jajan') ||
    lower.includes('sate') ||
    lower.includes('soto') ||
    lower.includes('nasi') ||
    lower.includes('ayam') ||
    lower.includes('minum') ||
    lower.includes('teh') ||
    lower.includes('es ') ||
    lower.includes('mie') ||
    lower.includes('ramen') ||
    lower.includes('roti') ||
    lower.includes('susu') ||
    lower.includes('jus')
  ) {
    categoryHint = 'Makanan & Minuman';
  } else if (
    lower.includes('bensin') ||
    lower.includes('parkir') ||
    lower.includes('ojol') ||
    lower.includes('grab') ||
    lower.includes('gojek') ||
    lower.includes('pertamax') ||
    lower.includes('pertalite') ||
    lower.includes('solar') ||
    lower.includes('tol')
  ) {
    categoryHint = 'Transportasi';
  } else if (
    lower.includes('kosan') ||
    lower.includes('kos') ||
    lower.includes('listrik') ||
    lower.includes('air') ||
    lower.includes('wifi') ||
    lower.includes('pulsa') ||
    lower.includes('pln') ||
    lower.includes('paket data') ||
    lower.includes('kuota') ||
    lower.includes('token')
  ) {
    categoryHint = 'Tagihan & Utilitas';
  } else if (lower.includes('gaji') || lower.includes('gajian') || lower.includes('bonus') || lower.includes('pemasukan') || lower.includes('omset') || lower.includes('dividen') || lower.includes('komisi') || lower.includes('thr')) {
    categoryHint = 'Gaji';
  } else if (
    lower.includes('belanja') ||
    lower.includes('baju') ||
    lower.includes('sepatu') ||
    lower.includes('supermarket') ||
    lower.includes('hp') ||
    lower.includes('laptop') ||
    lower.includes('buku') ||
    lower.includes('tokopedia') ||
    lower.includes('shopee')
  ) {
    categoryHint = 'Belanja';
  } else if (
    lower.includes('nabung') ||
    lower.includes('menabung') ||
    lower.includes('tabungan') ||
    lower.includes('simpan uang') ||
    lower.includes('simpan dana') ||
    lower.includes('celengan')
  ) {
    categoryHint = 'Tabungan';
  } else if (
    lower.includes('investasi') ||
    lower.includes('invest') ||
    lower.includes('saham') ||
    lower.includes('reksadana') ||
    lower.includes('crypto') ||
    lower.includes('kripto') ||
    lower.includes('emas') ||
    lower.includes('bibit') ||
    lower.includes('ajaib') ||
    lower.includes('pluang')
  ) {
    categoryHint = 'Investasi';
  } else if (
    lower.includes('nonton') ||
    lower.includes('bioskop') ||
    lower.includes('game') ||
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('tiket')
  ) {
    categoryHint = 'Hiburan';
  }

  // 4. Amount Extraction
  let amount = 0;
  let confidence = 0.95;

  let wordAmount: number | null = null;
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
            const rupiahMatch = lower.match(/(?:rp\.?\s*)?(\d{1,6}(?:\.\d{3})+)(?![\d])/);
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

  // 5. Clean Notes
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
    errorMessage,
  };
}

export function formatRupiah(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

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
