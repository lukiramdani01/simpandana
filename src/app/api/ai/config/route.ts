import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase/admin';

// In-memory runtime cache fallback if database is unavailable
let runtimeAIConfig = {
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: process.env.GEMINI_API_KEY || '',
  defaultModel: 'gemini-2.5-flash',
  isConnected: true,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const { data: dbProviders, error } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('name', 'gemini')
      .maybeSingle();

    if (!error && dbProviders) {
      return NextResponse.json({
        ok: true,
        config: {
          baseUrl: dbProviders.base_url || runtimeAIConfig.baseUrl,
          apiKey: dbProviders.encrypted_api_key || runtimeAIConfig.apiKey,
          defaultModel: dbProviders.model_name || runtimeAIConfig.defaultModel,
          isConnected: dbProviders.is_active ?? true,
          updatedAt: dbProviders.updated_at || runtimeAIConfig.updatedAt,
        }
      });
    }
  } catch (err) {
    // Database query failed, use runtime cache
  }

  return NextResponse.json({
    ok: true,
    config: runtimeAIConfig,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, defaultModel } = body || {};

    const cleanBaseUrl = baseUrl?.trim() || 'https://generativelanguage.googleapis.com';
    const cleanApiKey = apiKey?.trim() || '';
    const cleanModel = defaultModel?.trim() || 'gemini-2.5-flash';

    runtimeAIConfig = {
      baseUrl: cleanBaseUrl,
      apiKey: cleanApiKey,
      defaultModel: cleanModel,
      isConnected: cleanApiKey.length > 0,
      updatedAt: new Date().toISOString(),
    };

    // Attempt to persist in Supabase DB
    try {
      await supabaseAdmin
        .from('ai_providers')
        .upsert({
          name: 'gemini',
          is_active: true,
          priority: 1,
          encrypted_api_key: cleanApiKey,
          model_name: cleanModel,
          base_url: cleanBaseUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'name' });
    } catch (dbErr) {
      // Memory fallback saved successfully
    }

    return NextResponse.json({
      ok: true,
      message: 'Pengaturan AI Central berhasil disimpan!',
      config: runtimeAIConfig,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Gagal menyimpan pengaturan AI',
    }, { status: 500 });
  }
}
