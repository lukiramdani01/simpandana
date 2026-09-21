import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  approveUserProfile,
  rejectUserProfile,
  toggleUserActiveState,
  pendingUsersMemoryStore,
} from '@/lib/telegram/linking';

export async function GET() {
  try {
    let dbUsers: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) dbUsers = data;
    } catch {
      // Memory fallback
    }

    // Merge memory store pending users
    const mergedMap = new Map();
    dbUsers.forEach((u) => mergedMap.set(u.id, u));
    pendingUsersMemoryStore.forEach((u) => {
      if (!mergedMap.has(u.id)) {
        mergedMap.set(u.id, {
          id: u.id,
          full_name: u.full_name,
          phone: '-',
          plan: 'pro',
          approval_status: u.approval_status,
          is_active: u.is_active,
          telegram_user_id: u.telegram_user_id,
          telegram_chat_id: u.telegram_chat_id,
          telegram_username: u.telegram_username,
          created_at: u.registered_at,
        });
      }
    });

    const finalUsers = Array.from(mergedMap.values());

    return NextResponse.json({
      ok: true,
      users: finalUsers,
      pendingCount: finalUsers.filter((u) => u.approval_status === 'pending_approval').length,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, isActive } = body || {};

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ ok: false, error: 'userId wajib diisi' }, { status: 400 });
    }

    if (action === 'approve') {
      await approveUserProfile(userId);
      return NextResponse.json({
        ok: true,
        message: `Pengguna ${userId} berhasil disetujui! Pesan Selamat Datang otomatis telah dikirimkan ke Telegram pengguna.`,
      });
    } else if (action === 'reject') {
      await rejectUserProfile(userId);
      return NextResponse.json({
        ok: true,
        message: `Pengguna ${userId} telah ditolak. Pesan penolakan otomatis telah dikirimkan ke Telegram pengguna.`,
      });
    } else if (action === 'toggle_active') {
      const nextState = typeof isActive === 'boolean' ? isActive : true;
      await toggleUserActiveState(userId, nextState);
      return NextResponse.json({
        ok: true,
        message: `Akses pengguna ${userId} berhasil diubah menjadi ${nextState ? 'AKTIF' : 'NONAKTIF'}.`,
      });
    }

    return NextResponse.json({ ok: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
