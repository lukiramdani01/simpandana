/**
 * Multi-Provider AI Engine Types
 * Interfaces for routing, OCR extraction, voice STT, and telemetry.
 */

import { ParsedNominal } from '@/lib/parser/nominal';
export type { ParsedNominal };

export interface ReceiptItem {
  item_name: string;
  quantity: number;
  price: number;
  category_id?: string | null;
}

export interface ReceiptExtractionResult {
  merchant?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
}

export interface TranscriptData {
  transcript: string;
  duration: number;
  parsed: ParsedNominal;
}

export interface AIParseRequest {
  type: 'text' | 'image' | 'audio';
  content: string | Buffer;
  userId?: string;
  isPro?: boolean;
  forcedProvider?: 'gemini' | 'openai' | 'deepseek' | null;
}

export interface AIProviderAttempt {
  provider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
  status: 'success' | 'failed' | 'fallback_success';
  latencyMs: number;
  error?: string;
}

export interface AIParseResponse {
  provider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
  result: ParsedNominal;
  latencyMs: number;
  tokensUsed?: { prompt: number; completion: number };
  attempts: AIProviderAttempt[];
}
