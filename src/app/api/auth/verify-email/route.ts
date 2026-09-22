import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailOTP, verifyEmailToken, getUserByEmail } from '@/lib/auth/userStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, otp, token } = body || {};

    let result;
    if (token) {
      result = verifyEmailToken(token);
    } else if (email && otp) {
      result = verifyEmailOTP(email, otp);
    } else {
      return NextResponse.json(
        { ok: false, error: 'Email dan kode OTP atau token verifikasi wajib diisi.' },
        { status: 400 }
      );
    }

    if (!result.success || !result.user) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Verifikasi email gagal.' },
        { status: 400 }
      );
    }

    const user = result.user;

    const response = NextResponse.json({
      ok: true,
      message: 'Email berhasil diverifikasi! Mengalihkan ke Dashboard...',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        plan: user.plan,
        email_verified: true,
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
      { ok: false, error: err?.message || 'Terjadi kesalahan server saat verifikasi email.' },
      { status: 500 }
    );
  }
}
