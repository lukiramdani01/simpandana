import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/userStore';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    // Attempt to also sync with Supabase profiles table if available
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: result.user.id,
        full_name: result.user.full_name,
        plan: result.user.plan,
        approval_status: 'approved' as any,
        is_active: true,
        created_at: result.user.created_at,
      });
    } catch {
      // Supabase offline/mock fallback
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Registrasi berhasil! Silakan login dengan akun yang telah dibuat.',
        user: result.user,
        credential: result.credential,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Terjadi kesalahan server saat registrasi.' },
      { status: 500 }
    );
  }
}
