import { NextRequest, NextResponse } from 'next/server';
import { getRecentWebhookTraces } from '@/lib/telegram/traceStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const traces = getRecentWebhookTraces(10);
    return NextResponse.json({
      ok: true,
      count: traces.length,
      traces,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
