import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function clearSessionAndRedirect(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);

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

export async function GET(request: NextRequest) {
  return clearSessionAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return clearSessionAndRedirect(request);
}
