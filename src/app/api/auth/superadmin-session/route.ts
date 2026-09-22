import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const superadminUser = {
    id: 'usr-superadmin-01',
    email: 'lramdanie02@gmail.com',
    full_name: 'Luki Ramdani (Superadmin)',
    role: 'superadmin',
    plan: 'pro',
    email_verified: true,
    approval_status: 'APPROVED',
  };

  const requestedEmail = req.nextUrl.searchParams.get('email');
  let targetUser = superadminUser;
  let redirectTarget = req.nextUrl.searchParams.get('to') || '/admin';

  if (requestedEmail && requestedEmail.toLowerCase().includes('djmtire')) {
    targetUser = {
      id: 'usr-1790097410738-28',
      email: 'djmtire21@gmail.com',
      full_name: 'Djm Tire',
      role: 'user',
      plan: 'starter',
      email_verified: true,
      approval_status: 'pending_approval',
    };
    redirectTarget = req.nextUrl.searchParams.get('to') || '/dashboard';
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Session Initializing...</title>
</head>
<body style="background:#080C14;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <h2 style="font-size:24px;margin-bottom:8px;">Masuk ke akun ${targetUser.full_name}...</h2>
    <p style="color:#94a3b8;font-size:14px;">Mengalihkan ke ${redirectTarget}...</p>
  </div>
  <script>
    try {
      localStorage.setItem('tatadana_user', JSON.stringify(${JSON.stringify(targetUser)}));
      localStorage.setItem('tatadana_session', JSON.stringify({
        access_token: 'tatadana-token-' + Date.now(),
        user: ${JSON.stringify(targetUser)},
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30
      }));
    } catch (e) {
      console.error(e);
    }
    window.location.href = '${redirectTarget}';
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

  const cookieOptions = {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };

  response.cookies.set('tatadana_user_id', targetUser.id, cookieOptions);
  response.cookies.set('tatadana_demo_email', targetUser.email, cookieOptions);
  response.cookies.set('tatadana_user_status', targetUser.approval_status, cookieOptions);

  return response;
}
