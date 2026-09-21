/**
 * AI Telemetry & Latency Logger
 * Records token consumption, response latency, and status in ai_logs.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface LogAIAttemptParams {
  userId?: string | null;
  provider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
  action?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  status: 'success' | 'failed' | 'fallback_success' | 'fallback';
  errorMessage?: string | null;
}

/**
 * Persists an AI invocation attempt in the ai_logs database table
 */
export async function logAIAttempt(params: LogAIAttemptParams): Promise<void> {
  try {
    // Map status for DB check constraint safety ('fallback_success' -> 'fallback')
    const dbStatus = params.status === 'fallback_success' ? 'fallback' : params.status;

    await supabaseAdmin.from('ai_logs').insert({
      user_id: params.userId || null,
      provider: params.provider,
      action: params.action || 'parse_transaction',
      prompt_tokens: params.promptTokens || 0,
      completion_tokens: params.completionTokens || 0,
      latency_ms: Math.max(0, Math.round(params.latencyMs)),
      status: dbStatus as any,
      error_message: params.errorMessage || null,
    });
  } catch (err) {
    console.error('[AILogger] Failed to write ai_log:', err);
  }
}
