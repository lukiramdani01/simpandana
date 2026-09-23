import { NextRequest, NextResponse } from 'next/server';
import { getOmnichannelChannels, updateOmnichannelChannel } from '@/lib/omnichannel/traceStore';
import { OmnichannelType } from '@/lib/omnichannel/types';

export async function GET() {
  const channels = getOmnichannelChannels();
  return NextResponse.json({
    ok: true,
    channels,
    summary: {
      totalChannels: channels.length,
      activeChannels: channels.filter((c) => c.status === 'active').length,
      totalMessagesReceived: channels.reduce((acc, c) => acc + c.totalReceived, 0),
      totalMessagesSuccess: channels.reduce((acc, c) => acc + c.totalSuccess, 0),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Channel ID is required' }, { status: 400 });
    }
    updateOmnichannelChannel(id as OmnichannelType, updates || {});
    return NextResponse.json({
      ok: true,
      channels: getOmnichannelChannels(),
      message: `Channel ${id} updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
