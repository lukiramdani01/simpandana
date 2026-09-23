import { NextRequest, NextResponse } from 'next/server';
import { processOmnichannelMessage } from '@/lib/omnichannel/router';
import { OmnichannelInboundMessage, OmnichannelType } from '@/lib/omnichannel/types';
import { getOmnichannelChannels } from '@/lib/omnichannel/traceStore';

// GET: Meta WhatsApp Cloud API Webhook Verification Challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const channels = getOmnichannelChannels();
  const waChannel = channels.find((c) => c.id === 'whatsapp');
  const expectedToken = waChannel?.verifyToken || 'simpandana_wa_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { ok: false, error: 'Forbidden: invalid verify token or challenge' },
    { status: 403 }
  );
}

// POST: Universal Omnichannel Inbound Webhook Receiver
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const queryChannel = searchParams.get('channel') as OmnichannelType | null;

  let inboundMsg: OmnichannelInboundMessage | null = null;

  // Case A: Meta WhatsApp Cloud API format
  if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const changeVal = body.entry[0].changes[0].value;
    const waMsg = changeVal.messages[0];
    const contact = changeVal.contacts?.[0];

    let extractedText = '';
    let mediaType: 'text' | 'image' | 'voice' = 'text';

    if (waMsg.type === 'text') {
      extractedText = waMsg.text?.body || '';
    } else if (waMsg.type === 'image') {
      extractedText = waMsg.image?.caption || '[Foto Struk]';
      mediaType = 'image';
    } else if (waMsg.type === 'audio' || waMsg.type === 'voice') {
      extractedText = '[Voice Note]';
      mediaType = 'voice';
    }

    inboundMsg = {
      id: waMsg.id,
      channel: 'whatsapp',
      sender: {
        id: waMsg.from,
        phone: waMsg.from,
        name: contact?.profile?.name || waMsg.from,
      },
      text: extractedText,
      mediaType,
      rawPayload: body,
    };
  }
  // Case B: Qontak / Fonnte / generic WhatsApp Gateway format
  else if (body?.sender && (body?.message || body?.text)) {
    inboundMsg = {
      id: body.id || body.message_id || `msg_${Date.now()}`,
      channel: (body.channel as OmnichannelType) || queryChannel || 'whatsapp',
      sender: {
        id: String(body.sender),
        phone: String(body.sender),
        name: body.sender_name || body.name || String(body.sender),
      },
      text: body.message || body.text || '',
      mediaType: body.media_type || 'text',
      mediaUrl: body.media_url,
      rawPayload: body,
    };
  }
  // Case C: Universal Standard Omnichannel Payload
  else if (body?.text !== undefined) {
    inboundMsg = {
      id: body.id || `msg_${Date.now()}`,
      channel: (body.channel as OmnichannelType) || queryChannel || 'webhook',
      sender: {
        id: body.sender?.id || body.senderId || 'user-external',
        phone: body.sender?.phone || body.phone,
        name: body.sender?.name || body.senderName || 'Omnichannel User',
      },
      text: body.text,
      mediaType: body.mediaType || 'text',
      mediaUrl: body.mediaUrl,
      rawPayload: body,
    };
  }

  if (!inboundMsg) {
    return NextResponse.json(
      { ok: false, error: 'Unrecognized omnichannel message schema' },
      { status: 400 }
    );
  }

  // Process message through unified Omnichannel Router
  const response = await processOmnichannelMessage(inboundMsg);

  return NextResponse.json(response, {
    status: response.ok ? 200 : 422,
  });
}
