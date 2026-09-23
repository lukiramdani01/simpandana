import { NextRequest, NextResponse } from 'next/server';
import { getOmnichannelTraces } from '@/lib/omnichannel/traceStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const traces = getOmnichannelTraces(limit);

  return NextResponse.json({
    ok: true,
    traces,
    count: traces.length,
  });
}
