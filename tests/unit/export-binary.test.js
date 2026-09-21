const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

// Setup TypeScript module loader and '@/' path alias resolver
const origResolve = Module._resolveFilename;
const projectRoot = path.resolve(__dirname, '../..');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const relPath = request.slice(2);
    const fullPath = path.resolve(projectRoot, 'src', relPath);
    return origResolve.call(this, fullPath, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

if (!require.extensions['.ts']) {
  require.extensions['.ts'] = function (module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    module._compile(compiled.outputText, filename);
  };
}

const {
  generatePdfBuffer,
  generateExcelBuffer,
  generateExportReport,
  buildZipArchive
} = require('../../src/lib/export/engine.ts');

test('Binary PDF Export Engine', async (t) => {
  await t.test('generates valid binary PDF buffer starting with %PDF- magic bytes', () => {
    const pdfBuf = generatePdfBuffer([], '2026-09-01', '2026-09-30');
    assert(Buffer.isBuffer(pdfBuf), 'Must be a genuine Buffer');
    assert(pdfBuf.length > 50, 'PDF buffer must have substantive content');
    
    // Exact magic byte check
    assert.strictEqual(pdfBuf[0], 0x25, 'Byte 0 must be %');
    assert.strictEqual(pdfBuf[1], 0x50, 'Byte 1 must be P');
    assert.strictEqual(pdfBuf[2], 0x44, 'Byte 2 must be D');
    assert.strictEqual(pdfBuf[3], 0x46, 'Byte 3 must be F');
    assert.strictEqual(pdfBuf[4], 0x2d, 'Byte 4 must be -');

    const str = pdfBuf.toString('ascii');
    assert(str.startsWith('%PDF-1.4'), 'Header must start with %PDF-1.4');
    assert(str.includes('/Type /Catalog'), 'Must contain PDF Catalog');
    assert(str.includes('/Type /Pages'), 'Must contain PDF Pages');
    assert(str.includes('xref'), 'Must contain xref table');
    assert(str.includes('startxref'), 'Must contain startxref');
    assert(str.includes('%%EOF'), 'Must terminate with %%EOF');
  });

  await t.test('includes transaction data and currency formatting in PDF content stream', () => {
    const mockTxs = [
      {
        id: 'tx-test-1',
        user_id: 'usr-101',
        wallet_id: 'w-1',
        wallet_name: 'BCA Utama',
        category_id: 'c-1',
        category_name: 'Makanan & Minuman',
        type: 'expense',
        amount: 75000,
        date: '2026-09-16',
        time_wib: '12:00',
        notes: 'Makan Siang Tim Engineering',
        source: 'telegram_text',
        created_at: '2026-09-16T12:00:00+07:00'
      }
    ];

    const pdfBuf = generatePdfBuffer(mockTxs, '2026-09-01', '2026-09-30');
    const content = pdfBuf.toString('utf-8');
    assert(content.includes('TATADANA'), 'Must include brand header');
    assert(content.includes('Makan Siang Tim'), 'Must include transaction note');
  });
});

test('Binary Excel (.xlsx) Export Engine', async (t) => {
  await t.test('generates valid OpenXML ZIP archive starting with PK\\x03\\x04 magic bytes', () => {
    const xlsxBuf = generateExcelBuffer([]);
    assert(Buffer.isBuffer(xlsxBuf), 'Must be a genuine Buffer');
    assert(xlsxBuf.length > 50, 'XLSX buffer must have substantive content');

    // Standard PKzip magic header: 0x50, 0x4B, 0x03, 0x04
    assert.strictEqual(xlsxBuf[0], 0x50, 'Byte 0 must be 0x50 (P)');
    assert.strictEqual(xlsxBuf[1], 0x4b, 'Byte 1 must be 0x4B (K)');
    assert.strictEqual(xlsxBuf[2], 0x03, 'Byte 2 must be 0x03');
    assert.strictEqual(xlsxBuf[3], 0x04, 'Byte 3 must be 0x04');
  });

  await t.test('contains standard OpenXML parts in ZIP directory', () => {
    const xlsxBuf = generateExcelBuffer();
    const bufStr = xlsxBuf.toString('binary');

    assert(bufStr.includes('[Content_Types].xml'), 'Must contain [Content_Types].xml');
    assert(bufStr.includes('xl/workbook.xml'), 'Must contain xl/workbook.xml');
    assert(bufStr.includes('xl/worksheets/sheet1.xml'), 'Must contain xl/worksheets/sheet1.xml');
  });
});

test('Export Coordinator & Gatekeeper Controls', async (t) => {
  await t.test('blocks Starter tier users with FEATURE_GATED 403 error', () => {
    assert.throws(
      () => {
        generateExportReport({
          userId: 'usr-starter',
          plan: 'starter',
          format: 'pdf',
        });
      },
      (err) => {
        return err.code === 'FEATURE_GATED' && err.statusCode === 403;
      }
    );
  });

  await t.test('rejects inverted date ranges (startDate > endDate)', () => {
    assert.throws(
      () => {
        generateExportReport({
          userId: 'usr-pro',
          plan: 'pro',
          format: 'pdf',
          startDate: '2026-10-01',
          endDate: '2026-09-01',
        });
      },
      (err) => {
        return err.code === 'INVALID_DATE_RANGE' && err.statusCode === 400;
      }
    );
  });

  await t.test('generates valid signed URL and metadata for Pro users', () => {
    const res = generateExportReport({
      userId: 'usr-pro-1',
      plan: 'pro',
      format: 'pdf',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.contentType, 'application/pdf');
    assert(res.signedUrl.startsWith('https://storage.tatadana.id/exports/usr-pro-1/'));
    assert(res.signedUrl.includes('token=valid_signed_token'));
    assert(res.sizeBytes > 0);
    assert.strictEqual(res.filename, 'laporan-keuangan-2026-09-01-2026-09-30.pdf');
  });

  await t.test('generates valid XLSX metadata and filename for Pro users', () => {
    const res = generateExportReport({
      userId: 'usr-pro-2',
      plan: 'pro',
      format: 'xlsx',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.strictEqual(res.filename, 'transaksi-keuangan-2026-09-01-2026-09-30.xlsx');
    assert.strictEqual(res.buffer[0], 0x50);
    assert.strictEqual(res.buffer[1], 0x4b);
    assert.strictEqual(res.buffer[2], 0x03);
    assert.strictEqual(res.buffer[3], 0x04);
  });
});
