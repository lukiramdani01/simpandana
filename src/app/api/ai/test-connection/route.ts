import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  try {
    const body = await request.json();
    const { apiKey, baseUrl } = body || {};

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'API Key wajib diisi.',
        log: `[${timestamp}] [VALIDATION_ERROR] API Key Google AI Studio tidak boleh kosong.`,
        models: [],
      }, { status: 400 });
    }

    const cleanKey = apiKey.trim();
    const cleanBaseUrl = (baseUrl && typeof baseUrl === 'string' && baseUrl.trim().length > 0)
      ? baseUrl.trim().replace(/\/+$/, '')
      : 'https://generativelanguage.googleapis.com';

    // Intercept Telegram Bot Token in Google AI Studio Key field
    if (cleanKey.includes(':') || /^\d{8,12}:/.test(cleanKey)) {
      return NextResponse.json({
        ok: false,
        error: '⚠️ Kunci API Tidak Valid — Token Telegram Terdeteksi! Kode yang Anda masukkan adalah Bot Token Telegram, bukan Google AI Studio API Key.',
        log: `[${timestamp}] [VALIDATION_ERROR] Token Bot Telegram ('${cleanKey.substring(0, 15)}...') dimasukkan ke dalam kolom Google AI Studio API Key.\n\n` +
          `Saran Solusi Langkah demi Langkah:\n` +
          `1. Buka browser dan buka link: https://aistudio.google.com/app/apikey\n` +
          `2. Login menggunakan akun Google Anda dan klik 'Create API key'.\n` +
          `3. Salin API Key yang diawali dengan 'AIzaSy...'.\n` +
          `4. Tempelkan kunci 'AIzaSy...' tersebut ke kolom Google AI Studio API Key, lalu klik tombol Fetch Models / Test Koneksi kembali.`,
        models: [],
      });
    }
    const targetUrl = `${cleanBaseUrl}/v1beta/models?key=${cleanKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      const isAbort = networkErr?.name === 'AbortError';
      const errMsg = isAbort ? 'Request Timeout (8000ms)' : networkErr?.message || 'Network fetch failed';
      return NextResponse.json({
        ok: false,
        error: `Gagal terhubung ke server API (${errMsg})`,
        log: `[${timestamp}] [NETWORK_ERROR] GET ${cleanBaseUrl}/v1beta/models -> ${errMsg}\nSaran: Periksa koneksi internet atau Base URL yang Anda masukkan.`,
        models: [],
      });
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errBodyText = '';
      try {
        errBodyText = await res.text();
      } catch {
        errBodyText = 'Tidak ada detail pesan error dari server.';
      }

      let parsedErrJson: any = null;
      try {
        parsedErrJson = JSON.parse(errBodyText);
      } catch {
        // Not JSON
      }

      const detailedErrMsg = parsedErrJson?.error?.message || errBodyText.substring(0, 300) || res.statusText;
      const errorCode = parsedErrJson?.error?.code || res.status;
      const errorStatus = parsedErrJson?.error?.status || 'API_ERROR';

      return NextResponse.json({
        ok: false,
        error: `HTTP ${res.status}: ${detailedErrMsg}`,
        log: `[${timestamp}] [HTTP_${errorCode}_${errorStatus}] GET ${cleanBaseUrl}/v1beta/models\nStatus Code: ${res.status} ${res.statusText}\nPesan Error Server:\n${JSON.stringify(parsedErrJson || errBodyText, null, 2)}`,
        models: [],
      });
    }

    const json = await res.json();
    const rawModels: any[] = Array.isArray(json?.models) ? json.models : [];

    // Filter and format models supporting generateContent
    const geminiModels = rawModels
      .filter((m: any) => {
        const name = String(m.name || '');
        const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
        return name.includes('gemini') && (methods.length === 0 || methods.includes('generateContent'));
      })
      .map((m: any) => {
        const fullPath = String(m.name || '');
        const modelId = fullPath.startsWith('models/') ? fullPath.replace('models/', '') : fullPath;
        return {
          id: modelId,
          displayName: m.displayName || modelId,
          description: m.description || '',
        };
      });

    // Fallback list of Gemini models if list came back empty
    const finalModels = geminiModels.length > 0 ? geminiModels : [
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Tercepat)', description: 'Model Generasi Baru Serba Bisa & Cepat' },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (Akurasi Tinggi)', description: 'Model Penalaran Kompleks & Multimodal' },
      { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', description: 'Cepat dan Ringan untuk Tugas Harian' },
      { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', description: 'Sangat Hemat Kuota & Cepat' },
      { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', description: 'Kapasitas Konteks Panjang' },
    ];

    return NextResponse.json({
      ok: true,
      message: 'Terhubung ke Google AI Studio! API Key valid dan siap digunakan.',
      log: `[${timestamp}] [SUCCESS_200_OK] GET ${cleanBaseUrl}/v1beta/models\nBerhasil memverifikasi API key Google AI Studio.\nTotal model ditemukan: ${finalModels.length} Gemini models.`,
      models: finalModels,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Internal Server Error',
      log: `[${timestamp}] [SERVER_EXCEPTION] ${err?.stack || err?.message || err}`,
      models: [],
    }, { status: 500 });
  }
}
