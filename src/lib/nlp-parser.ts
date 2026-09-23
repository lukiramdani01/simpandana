/**
 * Natural Language Processing (NLP) Parser for Indonesian Financial Transactions
 * Unified module integrating nominal parsing, word numbers, and budget visual formatting.
 */

export * from './parser/nominal';
import {
  parseIndonesianNominal,
  parseIndonesianWords,
  formatRupiah,
  formatBudgetProgressBar,
  ParsedNominal,
} from './parser/nominal';

export interface ParsedTransaction {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  categoryIcon: string;
  notes: string;
  isAmbiguous: boolean;
  errorMessage?: string;
  confidence?: number;
  rawInput?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Makanan & Minuman': '🍜',
  'Transportasi': '🚗',
  'Tagihan & Utilitas': '🏠',
  'Gaji': '💼',
  'Belanja': '👕',
  'Hiburan': '🎮',
  'Tabungan': '🏦',
  'Investasi': '📈',
  'Pemasukan': '💰',
  'Lainnya': '📦',
  'Lain-lain': '📦',
};

/**
 * Currency amount extractor from text
 */
export function parseIndonesianCurrency(text: string): number | null {
  if (!text || typeof text !== 'string') return null;
  try {
    const parsed = parseIndonesianNominal(text);
    return parsed.amount > 0 ? parsed.amount : null;
  } catch {
    return null;
  }
}

/**
 * Full transaction parser from natural language text
 */
export function parseTransactionFromText(input: string): ParsedTransaction {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return {
      type: 'expense',
      amount: 0,
      category: 'Lainnya',
      categoryIcon: '📦',
      notes: '',
      isAmbiguous: true,
      errorMessage: 'Nominal tidak terdeteksi. Silakan sertakan nominal seperti "beli bakso 15rb" atau "gajian 5jt".',
      confidence: 0,
      rawInput: input || '',
    };
  }

  const parsed = parseIndonesianNominal(input);
  const category = parsed.type === 'income' ? 'Pemasukan' : parsed.categoryHint;
  const categoryIcon = CATEGORY_ICONS[category] || '📦';

  return {
    type: parsed.type,
    amount: parsed.amount,
    category,
    categoryIcon,
    notes: parsed.notes,
    isAmbiguous: parsed.isAmbiguous,
    errorMessage: parsed.errorMessage,
    confidence: parsed.confidence,
    rawInput: parsed.rawInput,
  };
}

/**
 * Legacy alias for formatBudgetProgressBar
 */
export function generateBudgetProgressBar(spent: number, limit: number): string {
  return formatBudgetProgressBar(spent, limit);
}
