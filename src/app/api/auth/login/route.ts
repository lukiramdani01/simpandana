import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth/userStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, credential } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const result = verifyCredentials({ email, password, credential });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Autentikasi gagal.' },
        { status: 401 }
      );
    }

    const user = result.user;

    const response = NextResponse.json({
      ok: true,
      message: `Login berhasil! Selamat datang kembali, ${user.full_name}.`,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        plan: user.plan,
      },
    });

    const cookieOptions = {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    response.cookies.set('tatadana_user_id', user.id, cookieOptions);
    response.cookies.set('tatadana_demo_email', user.email, cookieOptions);
    response.cookies.set('tatadana_user_status', 'APPROVED', cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Terjadi kesalahan server saat login.' },
      { status: 500 }
    );
  }
}
