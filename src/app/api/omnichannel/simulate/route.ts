import { NextRequest, NextResponse } from 'next/server';
import { processOmnichannelMessage } from '@/lib/omnichannel/router';
import { OmnichannelInboundMessage, OmnichannelType } from '@/lib/omnichannel/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const channel: OmnichannelType = body.channel || 'whatsapp';
    const text: string = body.text || '';
    const senderPhone: string = body.phone || body.sender || '+6281234567890';
    const senderName: string = body.senderName || 'Simulator User';

    const inboundMsg: OmnichannelInboundMessage = {
      channel,
      sender: {
        id: senderPhone,
        phone: senderPhone,
        name: senderName,
      },
      text,
      timestamp: new Date().toISOString(),
    };

    const result = await processOmnichannelMessage(inboundMsg);

    return NextResponse.json({
      ok: result.ok,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
