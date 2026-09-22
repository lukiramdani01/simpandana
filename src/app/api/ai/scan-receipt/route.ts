import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { extractReceiptVision } from '@/lib/ai/ocr';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageBase64 = '';
    let imageBuffer: Buffer | undefined;
    let fileName = '';
    let caption = '';
    let mimeType = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = (formData.get('file') || formData.get('image')) as File | null;
      if (file) {
        fileName = file.name;
        mimeType = file.type || 'image/jpeg';
        const arrayBuffer = await file.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        imageBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }
      caption = (formData.get('caption') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      imageBase64 = body.image || '';
      fileName = body.fileName || '';
      caption = body.caption || '';
      if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:([^;]+);(?:base64|utf8),(.+)$/);
        if (match) {
          mimeType = match[1];
        }
      }
    }

    const result = await extractReceiptVision({
      imageBase64,
      imageBuffer,
      mimeType,
      fileName,
      caption,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/scan-receipt] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Gagal memproses struk dengan OCR',
      },
      { status: 500 }
    );
  }
}
