import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { normalizeIndonesianPhone, isValidIndonesianPhone } from '@/lib/auth/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phone;

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Nomor telepon wajib diisi.' },
        { status: 400 }
      );
    }

    if (!isValidIndonesianPhone(rawPhone)) {
      return NextResponse.json(
        {
          error:
            'Nomor telepon tidak valid. Gunakan format nomor handphone Indonesia (misal: 08123456789 atau +628123456789).',
        },
        { status: 400 }
      );
    }

    const phone = normalizeIndonesianPhone(rawPhone);
    const isDev =
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_DEV_OTP_BYPASS !== 'false';

    // In dev mode or bypass mode, simulate instant OTP dispatch
    if (isDev) {
      console.log(`[AUTH OTP DEV] OTP for ${phone} is: 123456`);
      return NextResponse.json({
        success: true,
        message: 'Kode OTP terkirim! (Gunakan kode bypass: 123456)',
        phone,
        devBypass: true,
      });
    }

    // In production mode: integration with SMS/WhatsApp provider
    return NextResponse.json({
      success: true,
      message: 'Kode OTP telah dikirimkan ke nomor WhatsApp / SMS Anda.',
      phone,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memproses pengiriman OTP' },
      { status: 500 }
    );
  }
}
