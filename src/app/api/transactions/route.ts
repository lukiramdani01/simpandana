import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, recordTransactionInStore } from '@/lib/transactionsStore';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'usr-101';
    const txs = await getAllTransactions(userId);
    return NextResponse.json({ ok: true, transactions: txs });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, type, amount, categoryName, categoryIcon, walletId, walletName, notes, source, date, items } = body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Nominal transaksi tidak valid' }, { status: 400 });
    }

    const tx = await recordTransactionInStore({
      id,
      userId: userId || 'usr-101',
      type: type || 'expense',
      amount,
      categoryName: categoryName || 'Lainnya',
      categoryIcon,
      walletId: walletId || 'w-1',
      walletName,
      notes: notes || 'Transaksi Manual',
      source: source || 'web',
      date,
      items,
    });

    return NextResponse.json({ ok: true, transaction: tx.transaction, balanceAfter: tx.balanceAfter });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to record transaction' }, { status: 500 });
  }
}
