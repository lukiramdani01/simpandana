import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: 'Logout berhasil.',
  });

  const expiredCookieOptions = {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
  };

  response.cookies.set('tatadana_user_id', '', expiredCookieOptions);
  response.cookies.set('tatadana_demo_email', '', expiredCookieOptions);
  response.cookies.set('tatadana_user_status', '', expiredCookieOptions);

  return response;
}
