import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email || 'luki@tatadana.id';
    const fullName = body?.name || body?.full_name || 'Luki Ramdani';
    const phone = body?.phone || '+6281234567890';
    const userId = body?.id || body?.user_id || 'usr-101';

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: 'pro',
        plan: 'pro',
      },
      message: `Berhasil masuk sebagai ${fullName}`,
    });

    response.cookies.set('tatadana_user_id', userId, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set('tatadana_demo_email', email, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal membuat sesi demo' },
      { status: 500 }
    );
  }
}
