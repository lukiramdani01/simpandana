import { NextRequest, NextResponse } from 'next/server';
import { getUserWallets, saveUserWallets } from '@/lib/walletsStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const email = searchParams.get('email') || undefined;

    const wallets = getUserWallets(userId, email);
    return NextResponse.json({ ok: true, wallets });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, wallets } = body || {};

    if (!Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Daftar dompet tidak valid' },
        { status: 400 }
      );
    }

    const success = saveUserWallets({ userId, email, wallets });
    return NextResponse.json({ ok: success });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to save wallets' },
      { status: 500 }
    );
  }
}
