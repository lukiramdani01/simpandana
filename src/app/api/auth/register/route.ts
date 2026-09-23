import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/userStore';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { pendingUsersMemoryStore } from '@/lib/telegram/linking';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, phone } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const result = registerUser({
      email,
      password,
      full_name: full_name || email.split('@')[0],
      phone,
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Gagal mendaftar.' },
        { status: 400 }
      );
    }

    // Send email log / fallback preview
    console.log(`[Email Mailer Log] OTP sent to ${email}: ${result.otp}`);

    // Register into memory store for pending approval view in Super Admin
    pendingUsersMemoryStore.unshift({
      id: result.user.id,
      full_name: result.user.full_name,
      telegram_username: null,
      telegram_user_id: 0,
      telegram_chat_id: 0,
      approval_status: 'pending_approval',
      is_active: false,
      registered_at: result.user.created_at,
    });

    // Attempt to also sync with Supabase profiles table if available
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: result.user.id,
        full_name: result.user.full_name,
        plan: result.user.plan,
        role: result.user.role as any,
        approval_status: (result.user.approval_status || 'pending_approval') as any,
        is_active: true,
        created_at: result.user.created_at,
      });
    } catch {
      // Supabase offline/mock fallback
    }

    const response = NextResponse.json(
      {
        ok: true,
        message: 'Registrasi berhasil! Mengalihkan langsung ke Dashboard...',
        user: result.user,
        credential: result.credential,
        requiresEmailVerification: false,
      },
      { status: 201 }
    );

    const cookieOptions = {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    response.cookies.set('tatadana_user_id', result.user.id, cookieOptions);
    response.cookies.set('tatadana_demo_email', result.user.email, cookieOptions);
    response.cookies.set('tatadana_user_status', result.user.approval_status, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Terjadi kesalahan server saat registrasi.' },
      { status: 500 }
    );
  }
}
