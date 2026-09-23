import { NextResponse } from 'next/server';
import { resetPasswordDirect, getUserByEmail } from '@/lib/auth/userStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, newPassword } = body || {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email wajib diisi' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password baru minimal 6 karakter' }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = getUserByEmail(emailClean);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Email tidak ditemukan di sistem' }, { status: 404 });
    }

    const result = resetPasswordDirect(emailClean, newPassword);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error || 'Gagal mereset password' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Password berhasil diubah! Silakan masuk dengan password baru Anda.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
