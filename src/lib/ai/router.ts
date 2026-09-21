/**
 * Multi-Provider AI Router & Failover Engine
 * Cascades requests: Gemini -> OpenAI -> DeepSeek -> Deterministic Regex Fallback.
 */

import { AIParseRequest, AIParseResponse, AIProviderAttempt, ParsedNominal } from './types';
import { logAIAttempt } from './logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseIndonesianNominal } from '@/lib/parser/nominal';

interface ProviderConfig {
  name: 'gemini' | 'openai' | 'deepseek';
  is_active: boolean;
  priority: number;
  model_name?: string;
}

export const SYSTEM_PROMPT = `You are a financial transaction extractor for Indonesian natural language text.
Extract financial transaction details from the user text.
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "amount": number, // integer amount in IDR (e.g. 15000, 5000000). If not a transaction or ambiguous, set to 0
  "type": "income" | "expense" | "transfer",
  "categoryHint": string, // Indonesian category e.g. "Makanan & Minuman", "Transportasi", "Gaji", "Belanja"
  "notes": string // concise description of the item or action
}
Do not include any conversational explanation or markdown outside the JSON object.`;

/**
 * Validates and transforms raw LLM completion content into a typed ParsedNominal object
 */
export function parseAICompletionResponse(
  rawContent: string,
  originalPrompt: string
): ParsedNominal {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('LLM completion content is empty or invalid');
  }

  // 1. Strip Markdown code fences if present (e.g. ```json ... ``` or ``` ...)
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 2. Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: extract the first JSON object {...} in case of surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`LLM output did not contain valid JSON: "${rawContent.substring(0, 100)}"`);
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM output parsed JSON is not an object');
  }

  // 3. Validate & sanitize schema fields
  let amount = 0;
  if (typeof parsed.amount === 'number' && !isNaN(parsed.amount) && isFinite(parsed.amount)) {
    amount = Math.abs(Math.round(parsed.amount));
  } else if (typeof parsed.amount === 'string') {
    const num = parseFloat(parsed.amount.replace(/[^\d.-]/g, ''));
    if (!isNaN(num) && isFinite(num)) {
      amount = Math.abs(Math.round(num));
    }
  }

  let type: 'income' | 'expense' | 'transfer' = 'expense';
  if (parsed.type && typeof parsed.type === 'string') {
    const normalizedType = parsed.type.toLowerCase().trim();
    if (['income', 'pemasukan'].includes(normalizedType)) {
      type = 'income';
    } else if (['transfer', 'pindah', 'mutasi'].includes(normalizedType)) {
      type = 'transfer';
    } else {
      type = 'expense';
    }
  }

  const categoryHint =
    typeof parsed.categoryHint === 'string' && parsed.categoryHint.trim().length > 0
      ? parsed.categoryHint.trim()
      : 'Lainnya';

  const notes =
    typeof parsed.notes === 'string' && parsed.notes.trim().length > 0
      ? parsed.notes.trim()
      : originalPrompt;

  const isAmbiguous = amount <= 0;
  const confidence = isAmbiguous ? 0.2 : 0.95;

  return {
    amount,
    type,
    categoryHint,
    notes,
    confidence,
    rawInput: originalPrompt,
    isAmbiguous,
  };
}

/**
 * Executes multi-provider AI parse with automatic failover and telemetry logging
 */
export async function executeAIRouter(req: AIParseRequest): Promise<AIParseResponse> {
  const promptText = typeof req.content === 'string' ? req.content : '';
  const attempts: AIProviderAttempt[] = [];

  // 1. Fetch AI provider configurations from database (fallback to defaults if query fails)
  let activeProviders: ProviderConfig[] = [
    { name: 'gemini', is_active: true, priority: 1 },
    { name: 'openai', is_active: true, priority: 2 },
    { name: 'deepseek', is_active: true, priority: 3 },
  ];

  try {
    const { data: dbProviders } = await supabaseAdmin
      .from('ai_providers')
      .select('name, is_active, priority, model_name')
      .order('priority', { ascending: true });

    if (dbProviders && dbProviders.length > 0) {
      activeProviders = dbProviders as ProviderConfig[];
    }
  } catch (e) {
    // Keep default active providers on error
  }

  // Filter active and sort by priority
  let eligibleProviders = activeProviders
    .filter((p) => p.is_active)
    .sort((a, b) => a.priority - b.priority);

  if (req.forcedProvider) {
    eligibleProviders = eligibleProviders.filter((p) => p.name === req.forcedProvider);
  }

  let finalResult: ParsedNominal | null = null;
  let usedProvider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex' | null = null;
  let totalLatency = 0;

  // 2. Cascade through providers
  for (const provider of eligibleProviders) {
    const start = Date.now();
    try {
      const envKeyName = `${provider.name.toUpperCase()}_API_KEY`;
      let apiKey = process.env[envKeyName];
      let modelName = provider.model_name || (provider.name === 'gemini' ? 'gemini-2.5-flash' : undefined);
      let baseUrl = 'https://generativelanguage.googleapis.com';

      // Check DB configuration for overrides
      try {
        const { data: dbProvider } = await supabaseAdmin
          .from('ai_providers')
          .select('encrypted_api_key, model_name, base_url')
          .eq('name', provider.name)
          .maybeSingle();

        if (dbProvider) {
          if (dbProvider.encrypted_api_key) apiKey = dbProvider.encrypted_api_key;
          if (dbProvider.model_name) modelName = dbProvider.model_name;
          if (dbProvider.base_url) baseUrl = dbProvider.base_url;
        }
      } catch (dbErr) {
        // Fallback to env
      }

      // If credentials are completely unconfigured, fail this provider immediately
      if (!apiKey) {
        throw new Error(`API key for ${provider.name} is not configured (${envKeyName})`);
      }

      const isMockKey = apiKey.startsWith('mock-');

      if (isMockKey) {
        // In local/mock mode: synthesize structured LLM output and parse through parseAICompletionResponse
        // to strictly exercise the full JSON schema parser pipeline without external network calls
        const localParsed = parseIndonesianNominal(promptText);
        const mockPayload = JSON.stringify({
          amount: localParsed.amount,
          type: localParsed.type,
          categoryHint: localParsed.categoryHint,
          notes: localParsed.notes,
        });
        const parsed = parseAICompletionResponse(mockPayload, promptText);
        const latency = 120;
        await logAIAttempt({
          userId: req.userId,
          provider: provider.name,
          promptTokens: 45,
          completionTokens: 28,
          latencyMs: latency,
          status: 'success',
        });
        attempts.push({ provider: provider.name, status: 'success', latencyMs: latency });
        finalResult = parsed;
        usedProvider = provider.name;
        totalLatency = latency;
        break;
      }

      // Real external API call with 5s timeout
      const parsed = await callProviderAPI(provider.name, promptText, apiKey, modelName, baseUrl);
      const latency = Math.max(1, Date.now() - start);

      await logAIAttempt({
        userId: req.userId,
        provider: provider.name,
        promptTokens: 45,
        completionTokens: 28,
        latencyMs: latency,
        status: 'success',
      });
      attempts.push({ provider: provider.name, status: 'success', latencyMs: latency });
      finalResult = parsed;
      usedProvider = provider.name;
      totalLatency = latency;
      break;
    } catch (err: any) {
      const latency = Math.max(1, Date.now() - start);
      const errorMsg = err?.message || `Error calling ${provider.name}`;

      await logAIAttempt({
        userId: req.userId,
        provider: provider.name,
        promptTokens: 45,
        completionTokens: 0,
        latencyMs: latency,
        status: 'failed',
        errorMessage: errorMsg,
      });
      attempts.push({ provider: provider.name, status: 'failed', latencyMs: latency, error: errorMsg });
      // Continue to next provider in priority cascade
    }
  }

  // 3. Deterministic Regex Fallback if all providers failed or none eligible
  if (!finalResult) {
    const fallbackStart = Date.now();
    const fallbackParsed = parseIndonesianNominal(promptText);
    const fallbackLatency = Math.max(1, Date.now() - fallbackStart);

    await logAIAttempt({
      userId: req.userId,
      provider: 'fallback_regex',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: fallbackLatency,
      status: 'fallback_success',
    });

    attempts.push({
      provider: 'fallback_regex',
      status: 'fallback_success',
      latencyMs: fallbackLatency,
    });

    finalResult = fallbackParsed;
    usedProvider = 'fallback_regex';
    totalLatency = fallbackLatency;
  }

  return {
    provider: usedProvider!,
    result: finalResult,
    latencyMs: totalLatency,
    tokensUsed: {
      prompt: usedProvider === 'fallback_regex' ? 0 : 45,
      completion: usedProvider === 'fallback_regex' ? 0 : 28,
    },
    attempts,
  };
}

async function callProviderAPI(
  provider: string,
  prompt: string,
  apiKey: string,
  modelName?: string,
  baseUrl: string = 'https://generativelanguage.googleapis.com'
): Promise<ParsedNominal> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    if (provider === 'gemini') {
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
      const geminiModel = modelName || 'gemini-2.5-flash';
      const res = await fetch(
        `${cleanBaseUrl}/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\nUser text: "${prompt}"`,
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
          signal: controller.signal,
        }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini returned HTTP ${res.status}: ${errText.substring(0, 150)}`);
      }
      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini returned empty candidate text');
      }
      return parseAICompletionResponse(rawText, prompt);
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI returned HTTP ${res.status}: ${errText.substring(0, 150)}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty message content in completion');
      }
      return parseAICompletionResponse(content, prompt);
    } else {
      // DeepSeek
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`DeepSeek returned HTTP ${res.status}: ${errText.substring(0, 150)}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek returned empty message content in completion');
      }
      return parseAICompletionResponse(content, prompt);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
