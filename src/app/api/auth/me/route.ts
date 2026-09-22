import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth/userStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('tatadana_user_id')?.value;
    const status = req.cookies.get('tatadana_user_status')?.value;

    if (!userId || userId.trim() === '') {
      return NextResponse.json(
        { ok: false, authenticated: false, message: 'Belum login.' },
        { status: 401 }
      );
    }

    const user = getUserById(userId);

    if (!user) {
      // Fallback if userId exists in cookie
      return NextResponse.json({
        ok: true,
        authenticated: true,
        user: {
          id: userId,
          email: req.cookies.get('tatadana_demo_email')?.value || 'pengguna@simpandana.my.id',
          full_name: 'Pengguna',
          role: 'user',
          plan: 'starter',
          approval_status: status || 'APPROVED',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error checking session' },
      { status: 500 }
    );
  }
}
