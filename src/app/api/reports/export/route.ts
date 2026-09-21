import { NextRequest, NextResponse } from 'next/server';
import { generateExportReport } from '@/lib/export/engine';
import { initialTransactions } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

async function handleExport(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const format = body.format || searchParams.get('format') || 'pdf';
    const startDate = body.startDate || searchParams.get('startDate') || '2026-09-01';
    const endDate = body.endDate || searchParams.get('endDate') || '2026-09-30';
    const plan = body.plan || searchParams.get('plan') || 'pro';
    const userId = body.userId || searchParams.get('userId') || 'usr-101';
    const directDownload = body.download === true || searchParams.get('download') === 'true' || searchParams.get('download') === '1';

    // Pro Gatekeeper
    if (plan === 'starter') {
      return NextResponse.json(
        {
          error: 'Fitur export laporan (PDF & Excel) hanya tersedia untuk pengguna Pro.',
          code: 'FEATURE_GATED',
        },
        { status: 403 }
      );
    }

    // Date range validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        {
          error: 'Invalid date range: startDate cannot be after endDate',
          code: 'INVALID_DATE_RANGE',
        },
        { status: 400 }
      );
    }

    const result = generateExportReport({
      userId,
      plan,
      format,
      startDate,
      endDate,
      transactions: initialTransactions,
    });

    if (directDownload) {
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Content-Length': String(result.sizeBytes),
        },
      });
    }

    return NextResponse.json({
      success: true,
      filename: result.filename,
      contentType: result.contentType,
      signedUrl: result.signedUrl,
      sizeBytes: result.sizeBytes,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: error.message || 'Gagal menghasilkan export laporan',
        code: error.code || 'EXPORT_ERROR',
      },
      { status }
    );
  }
}
