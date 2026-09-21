const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execSync } = require('node:child_process');
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

const reportsRoute = require('../../src/app/api/reports/export/route.ts');

// Pure in-memory ZIP unpacker for verifying PKZIP structure
function parseAndUnzip(zipBuffer) {
  assert(Buffer.isBuffer(zipBuffer), 'Input must be a buffer');
  assert.strictEqual(zipBuffer.readUInt32LE(0), 0x04034b50, 'Invalid local header magic');

  const files = {};
  let offset = 0;

  while (offset < zipBuffer.length) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      // Local file header
      const compression = zipBuffer.readUInt16LE(offset + 8);
      const crc = zipBuffer.readUInt32LE(offset + 14);
      const compSize = zipBuffer.readUInt32LE(offset + 18);
      const uncompSize = zipBuffer.readUInt32LE(offset + 22);
      const nameLen = zipBuffer.readUInt16LE(offset + 26);
      const extraLen = zipBuffer.readUInt16LE(offset + 28);
      const filename = zipBuffer.toString('utf-8', offset + 30, offset + 30 + nameLen);
      const dataOffset = offset + 30 + nameLen + extraLen;
      const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compSize);

      let uncompressed;
      if (compression === 0) {
        uncompressed = compressedData;
      } else if (compression === 8) {
        uncompressed = zlib.inflateRawSync(compressedData);
      } else {
        throw new Error(`Unsupported compression: ${compression}`);
      }

      assert.strictEqual(uncompressed.length, uncompSize, `Size mismatch for ${filename}`);
      // Calculate CRC32 using zlib if available
      const computedCrc = (typeof zlib.crc32 === 'function')
        ? zlib.crc32(uncompressed)
        : null;
      if (computedCrc !== null) {
        assert.strictEqual(computedCrc >>> 0, crc >>> 0, `CRC mismatch for ${filename}`);
      }

      files[filename] = {
        name: filename,
        data: uncompressed,
        text: uncompressed.toString('utf-8'),
        crc,
        compSize,
        uncompSize
      };

      offset = dataOffset + compSize;
    } else if (sig === 0x02014b50) {
      // Central directory header
      const nameLen = zipBuffer.readUInt16LE(offset + 28);
      const extraLen = zipBuffer.readUInt16LE(offset + 30);
      const commentLen = zipBuffer.readUInt16LE(offset + 32);
      offset += 46 + nameLen + extraLen + commentLen;
    } else if (sig === 0x06054b50) {
      // End of central directory record
      offset += 22;
      break;
    } else {
      break;
    }
  }

  return files;
}

test('PDF Engine Deep Binary Structural Verification', async (t) => {
  await t.test('verifies exact PDF 1.4 binary structure, xref byte offsets, and object mapping', () => {
    const transactions = [
      {
        id: 'tx-001',
        user_id: 'usr-101',
        wallet_id: 'w-1',
        wallet_name: 'BCA Prioritas',
        category_id: 'c-1',
        category_name: 'Gaji & Bonus',
        type: 'income',
        amount: 25000000,
        date: '2026-09-01',
        time_wib: '09:15',
        notes: 'Gaji Bulanan & Bonus Q3',
        source: 'telegram_text',
        created_at: '2026-09-01T09:15:00+07:00'
      },
      {
        id: 'tx-002',
        user_id: 'usr-101',
        wallet_id: 'w-2',
        wallet_name: 'GoPay',
        category_id: 'c-2',
        category_name: 'Makan & Minum',
        type: 'expense',
        amount: 85000,
        date: '2026-09-02',
        time_wib: '12:30',
        notes: 'Makan Siang Nasi Padang + Es Teh',
        source: 'telegram_photo',
        created_at: '2026-09-02T12:30:00+07:00'
      }
    ];

    const pdfBuf = generatePdfBuffer(transactions, '2026-09-01', '2026-09-30');

    // 1. Magic bytes & high-order ASCII safety comment
    assert.strictEqual(pdfBuf[0], 0x25, 'Byte 0: %');
    assert.strictEqual(pdfBuf[1], 0x50, 'Byte 1: P');
    assert.strictEqual(pdfBuf[2], 0x44, 'Byte 2: D');
    assert.strictEqual(pdfBuf[3], 0x46, 'Byte 3: F');
    assert.strictEqual(pdfBuf[4], 0x2d, 'Byte 4: -');
    assert.strictEqual(pdfBuf[5], 0x31, 'Byte 5: 1');
    assert.strictEqual(pdfBuf[6], 0x2e, 'Byte 6: .');
    assert.strictEqual(pdfBuf[7], 0x34, 'Byte 7: 4');
    // High-order bytes to signal binary file
    assert.strictEqual(pdfBuf[9], 0x25, 'Byte 9: % comment');
    assert(pdfBuf[10] >= 128, 'Byte 10 binary marker >= 128');

    const pdfStr = pdfBuf.toString('utf-8');

    // 2. All 6 mandatory objects present
    assert(pdfStr.includes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj'), 'Object 1: Catalog');
    assert(pdfStr.includes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj'), 'Object 2: Pages');
    assert(pdfStr.includes('3 0 obj\n<< /Type /Page'), 'Object 3: Page');
    assert(pdfStr.includes('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj'), 'Object 4: Helvetica');
    assert(pdfStr.includes('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj'), 'Object 5: Helvetica-Bold');
    assert(pdfStr.includes('6 0 obj\n<< /Length'), 'Object 6: Stream content');

    // 3. Stream length exact byte match
    const lengthMatch = pdfStr.match(/6 0 obj\n<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream\nendobj/);
    assert(lengthMatch, 'Stream object 6 regex must match');
    const declaredLength = parseInt(lengthMatch[1], 10);
    const actualStreamContent = lengthMatch[2];
    const actualStreamByteLen = Buffer.from(actualStreamContent, 'utf-8').length;
    assert.strictEqual(declaredLength, actualStreamByteLen, 'Stream /Length must match exact stream byte length');

    // 4. Validate xref offsets
    const xrefMatch = pdfStr.match(/xref\n0 7\n([\s\S]*?)trailer/);
    assert(xrefMatch, 'xref table for 7 entries must exist');
    const xrefLines = xrefMatch[1].trim().split('\n');
    assert.strictEqual(xrefLines.length, 7, 'xref must contain 7 entries');
    assert.strictEqual(xrefLines[0], '0000000000 65535 f ', 'Entry 0 must be special free list');

    for (let objNum = 1; objNum <= 6; objNum++) {
      const line = xrefLines[objNum];
      const offset = parseInt(line.substring(0, 10), 10);
      assert(!isNaN(offset), `Offset for obj ${objNum} must be number`);
      const targetHeader = `${objNum} 0 obj`;
      const actualAtOffset = pdfBuf.subarray(offset, offset + targetHeader.length).toString('utf-8');
      assert.strictEqual(actualAtOffset, targetHeader, `Offset ${offset} must point exactly to ${targetHeader}`);
    }

    // 5. Validate startxref pointer and EOF
    const startXrefMatch = pdfStr.match(/startxref\n(\d+)\n%%EOF/);
    assert(startXrefMatch, 'startxref must precede %%EOF');
    const startXrefOffset = parseInt(startXrefMatch[1], 10);
    const actualXrefTag = pdfBuf.subarray(startXrefOffset, startXrefOffset + 5).toString('utf-8');
    assert.strictEqual(actualXrefTag, 'xref\n', 'startxref offset must point directly to xref');
    assert(pdfStr.trimEnd().endsWith('%%EOF'), 'PDF must terminate with %%EOF');
  });
});

test('XLSX Engine Deep Binary & OpenXML Structure Verification', async (t) => {
  await t.test('unpacks PKZIP 2.0 archive and validates OpenXML components and schema namespaces', () => {
    const transactions = [
      {
        id: 'tx-x1',
        user_id: 'usr-101',
        wallet_id: 'w-1',
        wallet_name: 'BCA Utama',
        category_id: 'c-1',
        category_name: 'Investasi Saham',
        type: 'income',
        amount: 5000000,
        date: '2026-09-10',
        time_wib: '10:00',
        notes: 'Dividen Saham BBCA',
        source: 'web',
        created_at: '2026-09-10T10:00:00+07:00'
      }
    ];

    const xlsxBuf = generateExcelBuffer(transactions);

    // 1. Check PK magic bytes
    assert.strictEqual(xlsxBuf[0], 0x50, 'PK 1');
    assert.strictEqual(xlsxBuf[1], 0x4b, 'PK 2');
    assert.strictEqual(xlsxBuf[2], 0x03, 'PK 3');
    assert.strictEqual(xlsxBuf[3], 0x04, 'PK 4');

    // 2. Pure unpack and verify each entry
    const files = parseAndUnzip(xlsxBuf);

    const requiredParts = [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml'
    ];

    for (const part of requiredParts) {
      assert(files[part], `Missing required OpenXML part: ${part}`);
      assert(files[part].text.startsWith('<?xml version="1.0" encoding="UTF-8"'), `${part} must have XML declaration`);
    }

    // 3. Content_Types.xml validation
    const ctXml = files['[Content_Types].xml'].text;
    assert(ctXml.includes('http://schemas.openxmlformats.org/package/2006/content-types'));
    assert(ctXml.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'));
    assert(ctXml.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'));

    // 4. Workbook and Sheet1 validation
    const wbXml = files['xl/workbook.xml'].text;
    assert(wbXml.includes('sheet name="Laporan Keuangan" sheetId="1" r:id="rId1"'));

    const sheetXml = files['xl/worksheets/sheet1.xml'].text;
    assert(sheetXml.includes('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'));
    assert(sheetXml.includes('ID'), 'Header ID');
    assert(sheetXml.includes('Nominal (IDR)'), 'Header Nominal');
    assert(sheetXml.includes('Dividen Saham BBCA'), 'Contains transaction note');
    assert(sheetXml.includes('<c r="E2" t="n"><v>5000000</v></c>'), 'Row E2 has numeric nominal 5000000');
  });

  await t.test('passes Info-ZIP OS utility verification (/usr/bin/unzip -t)', () => {
    const xlsxBuf = generateExcelBuffer();
    const tempFilePath = path.join(projectRoot, 'node_modules', '.test-export.xlsx');
    
    try {
      fs.writeFileSync(tempFilePath, xlsxBuf);
      // Run OS unzip test
      const output = execSync(`unzip -t "${tempFilePath}"`, { encoding: 'utf-8' });
      assert(output.includes('No errors detected in compressed data'), 'unzip -t must report 0 errors');
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });
});

test('Adversarial & Boundary Stress Testing', async (t) => {
  await t.test('handles empty transaction list [] without crashing', () => {
    // PDF empty
    const pdfBuf = generatePdfBuffer([], '2026-09-01', '2026-09-30');
    assert(Buffer.isBuffer(pdfBuf));
    const pdfStr = pdfBuf.toString('utf-8');
    assert(pdfStr.includes('Total Pemasukan: Rp 0'));
    assert(pdfStr.includes('Total Pengeluaran: Rp 0'));
    // Parentheses in (Surplus) are escaped as \(Surplus\) in PDF text literals
    assert(pdfStr.includes('Net Cashflow: Rp 0 \\(Surplus\\)'));
    assert(pdfStr.trimEnd().endsWith('%%EOF'));

    // XLSX empty
    const xlsxBuf = generateExcelBuffer([]);
    const files = parseAndUnzip(xlsxBuf);
    const sheetXml = files['xl/worksheets/sheet1.xml'].text;
    assert(sheetXml.includes('<row r="1">'), 'Header row exists');
    assert(!sheetXml.includes('<row r="2">'), 'No data row 2');
  });

  await t.test('stress-tests 1,000 transactions performance and data integrity', () => {
    const largeTxs = [];
    let expectedIncome = 0;
    let expectedExpense = 0;

    for (let i = 1; i <= 1000; i++) {
      const isIncome = i % 2 === 0;
      const amount = i * 1000;
      if (isIncome) expectedIncome += amount;
      else expectedExpense += amount;

      largeTxs.push({
        id: `tx-stress-${i}`,
        user_id: 'usr-stress',
        wallet_id: `w-${i % 5}`,
        wallet_name: `Dompet ${i % 5}`,
        category_id: `c-${i % 10}`,
        category_name: `Kategori ${i % 10}`,
        type: isIncome ? 'income' : 'expense',
        amount,
        date: '2026-09-15',
        time_wib: '14:20',
        notes: `Transaksi massal ke-${i} dengan nominal Rp ${amount}`,
        source: 'telegram_text',
        created_at: '2026-09-15T14:20:00+07:00'
      });
    }

    // PDF generation under load
    const t0Pdf = Date.now();
    const pdfBuf = generatePdfBuffer(largeTxs, '2026-09-01', '2026-09-30');
    const pdfDuration = Date.now() - t0Pdf;
    assert(pdfDuration < 300, `PDF generation must be fast (<300ms), took ${pdfDuration}ms`);
    const pdfStr = pdfBuf.toString('utf-8');
    assert(pdfStr.includes(`Total Pemasukan: Rp ${expectedIncome.toLocaleString('id-ID')}`));
    assert(pdfStr.includes(`Total Pengeluaran: Rp ${expectedExpense.toLocaleString('id-ID')}`));

    // XLSX generation under load
    const t0Xlsx = Date.now();
    const xlsxBuf = generateExcelBuffer(largeTxs);
    const xlsxDuration = Date.now() - t0Xlsx;
    assert(xlsxDuration < 500, `XLSX generation must be fast (<500ms), took ${xlsxDuration}ms`);
    
    const files = parseAndUnzip(xlsxBuf);
    const sheetXml = files['xl/worksheets/sheet1.xml'].text;
    assert(sheetXml.includes('<row r="1001">'), 'Row 1001 must exist');
    assert(sheetXml.includes('tx-stress-1000'), 'Last transaction ID must exist');
  });

  await t.test('stress-tests 5,000 transactions without memory explosion or corruption', () => {
    const massTxs = [];
    for (let i = 1; i <= 5000; i++) {
      massTxs.push({
        id: `tx-mass-${i}`,
        user_id: 'usr-mass',
        wallet_id: 'w-1',
        wallet_name: 'BCA',
        category_id: 'c-1',
        category_name: 'Operasional',
        type: 'expense',
        amount: 50000,
        date: '2026-09-16',
        time_wib: '11:11',
        notes: `Test volume ${i}`,
        source: 'web',
        created_at: '2026-09-16T11:11:00+07:00'
      });
    }

    const t0 = Date.now();
    const xlsxBuf = generateExcelBuffer(massTxs);
    const duration = Date.now() - t0;
    assert(duration < 2000, `5,000 rows XLSX generated in ${duration}ms (target <2000ms)`);
    assert(xlsxBuf.length > 50000, 'Compressed buffer size is substantial');
    
    // Quick integrity check on unpacked sheet1.xml
    const files = parseAndUnzip(xlsxBuf);
    assert(files['xl/worksheets/sheet1.xml'].text.includes('<row r="5001">'));
  });

  await t.test('robustly escapes XML special characters and Unicode in notes & names', () => {
    const complexTxs = [
      {
        id: 'tx-sec-1',
        user_id: 'usr-101',
        wallet_id: 'w-1',
        wallet_name: 'Dompet <"Utama">',
        category_id: 'c-1',
        category_name: 'F&B <Spesial>',
        type: 'expense',
        amount: 35000,
        date: '2026-09-16',
        time_wib: '13:00',
        notes: '(OK) Soto & "Teh" \\10k',
        source: 'telegram_text',
        created_at: '2026-09-16T13:00:00+07:00'
      }
    ];

    // XLSX test
    const xlsxBuf = generateExcelBuffer(complexTxs);
    const files = parseAndUnzip(xlsxBuf);
    const sheetXml = files['xl/worksheets/sheet1.xml'].text;

    // Check XML escaping
    assert(sheetXml.includes('&amp;'), 'Ampersand must be escaped');
    assert(sheetXml.includes('&lt;'), '< must be escaped');
    assert(sheetXml.includes('&gt;'), '> must be escaped');
    assert(sheetXml.includes('&quot;'), '" must be escaped');
    assert(!sheetXml.includes(' <Spesial> '), 'Unescaped tag brackets must NOT exist');

    // PDF test
    const pdfBuf = generatePdfBuffer(complexTxs, '2026-09-01', '2026-09-30');
    const pdfStr = pdfBuf.toString('utf-8');
    assert(pdfStr.includes('\\(OK\\)'), 'Parentheses in notes must be escaped in PDF stream');
    assert(pdfStr.includes('\\\\10k'), 'Backslashes in notes must be escaped in PDF stream');
  });

  await t.test('validates date boundaries: same-day range, leap year, and reversed rejection', () => {
    // 1. Same-day range (e.g. 2026-09-15 to 2026-09-15) -> valid
    const sameDay = generateExportReport({
      userId: 'usr-pro',
      plan: 'pro',
      format: 'pdf',
      startDate: '2026-09-15',
      endDate: '2026-09-15'
    });
    assert.strictEqual(sameDay.success, true);
    assert.strictEqual(sameDay.filename, 'laporan-keuangan-2026-09-15-2026-09-15.pdf');

    // 2. Leap year date (2024-02-29) -> valid
    const leapDay = generateExportReport({
      userId: 'usr-pro',
      plan: 'pro',
      format: 'xlsx',
      startDate: '2024-02-01',
      endDate: '2024-02-29'
    });
    assert.strictEqual(leapDay.success, true);
    assert.strictEqual(leapDay.filename, 'transaksi-keuangan-2024-02-01-2024-02-29.xlsx');

    // 3. Reversed range (startDate > endDate) -> must throw INVALID_DATE_RANGE (400)
    assert.throws(
      () => {
        generateExportReport({
          userId: 'usr-pro',
          plan: 'pro',
          format: 'pdf',
          startDate: '2026-10-05',
          endDate: '2026-10-01'
        });
      },
      (err) => {
        return err.code === 'INVALID_DATE_RANGE' && err.statusCode === 400;
      }
    );
  });

  await t.test('strictly enforces Pro gatekeeper against starter, free, and empty plans', () => {
    const invalidPlans = ['starter', 'free', 'basic', '', 'trial', null];

    for (const plan of invalidPlans) {
      assert.throws(
        () => {
          generateExportReport({
            userId: 'usr-test',
            plan,
            format: 'pdf'
          });
        },
        (err) => {
          return err.code === 'FEATURE_GATED' && err.statusCode === 403;
        },
        `Plan '${plan}' must be gated with FEATURE_GATED 403`
      );
    }

    // Unsupported format
    assert.throws(
      () => {
        generateExportReport({
          userId: 'usr-pro',
          plan: 'pro',
          format: 'docx'
        });
      },
      (err) => {
        return err.code === 'UNSUPPORTED_FORMAT' && err.statusCode === 400;
      }
    );
  });
});

test('Reports API Route Handler (/api/reports/export) Integration Stress Testing', async (t) => {
  await t.test('GET /api/reports/export with download=true returns raw binary attachment', async () => {
    const mockReq = {
      method: 'GET',
      url: 'http://localhost:3000/api/reports/export?format=pdf&plan=pro&download=true&startDate=2026-09-01&endDate=2026-09-30'
    };

    const res = await reportsRoute.GET(mockReq);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/pdf');
    assert(res.headers.get('Content-Disposition').includes('attachment; filename="laporan-keuangan-'));
    
    // Check that body buffer starts with %PDF-1.4
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    assert.strictEqual(buf.subarray(0, 5).toString('ascii'), '%PDF-');
  });

  await t.test('GET /api/reports/export with download=false returns signed URL metadata', async () => {
    const mockReq = {
      method: 'GET',
      url: 'http://localhost:3000/api/reports/export?format=xlsx&plan=pro&download=false'
    };

    const res = await reportsRoute.GET(mockReq);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.filename.endsWith('.xlsx'));
    assert(json.signedUrl.includes('https://storage.tatadana.id/exports/'));
    assert(json.sizeBytes > 0);
  });

  await t.test('POST /api/reports/export accepts JSON body and returns binary Excel on download=1', async () => {
    const mockReq = {
      method: 'POST',
      url: 'http://localhost:3000/api/reports/export',
      json: async () => ({
        format: 'xlsx',
        plan: 'pro',
        download: true,
        startDate: '2026-09-01',
        endDate: '2026-09-15'
      })
    };

    const res = await reportsRoute.POST(mockReq);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    assert.strictEqual(buf.readUInt32LE(0), 0x04034b50, 'Must be PKZIP');
  });

  await t.test('blocks Starter tier users at API endpoint with 403 JSON', async () => {
    const mockReq = {
      method: 'GET',
      url: 'http://localhost:3000/api/reports/export?plan=starter&format=pdf'
    };

    const res = await reportsRoute.GET(mockReq);
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.code, 'FEATURE_GATED');
  });

  await t.test('blocks inverted date ranges at API endpoint with 400 JSON', async () => {
    const mockReq = {
      method: 'POST',
      url: 'http://localhost:3000/api/reports/export',
      json: async () => ({
        plan: 'pro',
        format: 'pdf',
        startDate: '2026-12-31',
        endDate: '2026-01-01'
      })
    };

    const res = await reportsRoute.POST(mockReq);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.code, 'INVALID_DATE_RANGE');
  });
});
