/**
 * Telegram Webhook Trace & Telemetry Store
 * Stores 7-step execution traces with per-step latency measurement for Admin Simulator & Audit observability.
 */

export type WebhookStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'USER_IDENTIFIED'
  | 'PARSED'
  | 'TRANSACTION_CREATED'
  | 'BALANCE_UPDATED'
  | 'DASHBOARD_SYNCED'
  | 'COMPLETED'
  | 'FAILED'
  | 'DUPLICATE'
  | 'USER_NOT_CONNECTED'
  | 'PARSING_FAILED';

export interface WebhookTraceStep {
  status: WebhookStatus;
  timestamp: string;
  latencyMs: number;
  message?: string;
}

export interface WebhookTrace {
  updateId: number;
  telegramUserId: number | null;
  messageId: number | null;
  messageText: string;
  saasUserId: string | null;
  saasUserName: string | null;
  parserResult: {
    type?: 'income' | 'expense' | 'transfer';
    amount?: number;
    notes?: string;
    categoryHint?: string;
    isAmbiguous?: boolean;
    rawText?: string;
  } | null;
  wallet: {
    id?: string;
    name?: string;
    balanceBefore?: number;
    balanceAfter?: number;
  } | null;
  category: {
    id?: string;
    name?: string;
  } | null;
  transactionId: string | null;
  databaseStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  balanceStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  realtimeStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  latencyBreakdown: {
    webhookReceivedMs: number;
    userMappingMs: number;
    parsingMs: number;
    walletLookupMs: number;
    categoryLookupMs: number;
    transactionInsertMs: number;
    balanceUpdateMs: number;
    realtimeSyncMs: number;
    telegramResponseMs: number;
    totalMs: number;
  };
  finalStatus: WebhookStatus;
  steps: WebhookTraceStep[];
  processedAt: string;
  simulatedError?: string;
}

declare global {
  var __telegramTraceMemoryStore__: WebhookTrace[] | undefined;
}

if (!globalThis.__telegramTraceMemoryStore__) {
  globalThis.__telegramTraceMemoryStore__ = [];
}

export const traceMemoryStore: WebhookTrace[] = globalThis.__telegramTraceMemoryStore__;

export function recordWebhookTrace(trace: WebhookTrace): void {
  // Prepend new trace, keep max 50 in memory
  traceMemoryStore.unshift(trace);
  if (traceMemoryStore.length > 50) {
    traceMemoryStore.pop();
  }
}

export function getRecentWebhookTraces(limit: number = 10): WebhookTrace[] {
  return traceMemoryStore.slice(0, limit);
}

export function clearWebhookTraces(): void {
  traceMemoryStore.length = 0;
}
