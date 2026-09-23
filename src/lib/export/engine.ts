import { deflateRawSync, crc32 as zlibCrc32 } from 'zlib';
import { Transaction } from '@/lib/types';
import { initialTransactions } from '@/lib/mock-data';

// Standard CRC32 calculation with fallback
function calculateCrc32(buf: Buffer): number {
  if (typeof zlibCrc32 === 'function') {
    return zlibCrc32(buf);
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export interface ZipFileEntry {
  path: string;
  data: Buffer | string;
}

/**
 * Pure TypeScript in-memory ZIP builder compliant with PKZIP 2.0 / ECMA-376
 * Output starts with magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
 */
export function buildZipArchive(entries: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const rawData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf-8');
    const pathBuf = Buffer.from(entry.path, 'utf-8');
    const crc = calculateCrc32(rawData);
    const uncompressedSize = rawData.length;

    // Use deflate compression
    const compressedData = deflateRawSync(rawData);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + path length)
    const localHeader = Buffer.alloc(30 + pathBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method (8 = Deflate)
    localHeader.writeUInt16LE(0x4800, 10); // time (09:00:00)
    localHeader.writeUInt16LE(0x5821, 12); // date (2024-01-01)
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(pathBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    pathBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + path length)
    const centralHeader = Buffer.alloc(46 + pathBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // method (Deflate)
    centralHeader.writeUInt16LE(0x4800, 12);
    centralHeader.writeUInt16LE(0x5821, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(pathBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    pathBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuffer.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

/**
 * Generates an OpenXML (.xlsx) Spreadsheet binary buffer
 */
export function generateExcelBuffer(transactions: Transaction[] = initialTransactions): Buffer {
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  // _rels/.rels
  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // xl/workbook.xml
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Laporan Keuangan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  // xl/_rels/workbook.xml.rels
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;

  // xl/worksheets/sheet1.xml
  const headers = ['ID', 'Tanggal WIB', 'Jam WIB', 'Jenis', 'Nominal (IDR)', 'Kategori', 'Dompet', 'Catatan', 'Sumber'];
  
  let rowsXml = '';
  // Header row (row 1, style 1 for bold)
  rowsXml += `<row r="1">`;
  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    rowsXml += `<c r="${colLetter}1" s="1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  rowsXml += `</row>`;

  // Data rows
  transactions.forEach((tx, rowIdx) => {
    const r = rowIdx + 2;
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
    const rowValues = [
      { col: 'A', val: tx.id, type: 'str' },
      { col: 'B', val: tx.date, type: 'str' },
      { col: 'C', val: tx.time_wib || '00:00', type: 'str' },
      { col: 'D', val: typeLabel, type: 'str' },
      { col: 'E', val: String(tx.amount), type: 'num' },
      { col: 'F', val: tx.category_name || '-', type: 'str' },
      { col: 'G', val: tx.wallet_name || '-', type: 'str' },
      { col: 'H', val: tx.notes || '', type: 'str' },
      { col: 'I', val: tx.source || 'web', type: 'str' },
    ];

    rowsXml += `<row r="${r}">`;
    for (const v of rowValues) {
      if (v.type === 'num') {
        rowsXml += `<c r="${v.col}${r}" t="n"><v>${v.val}</v></c>`;
      } else {
        rowsXml += `<c r="${v.col}${r}" t="inlineStr"><is><t>${escapeXml(v.val)}</t></is></c>`;
      }
    }
    rowsXml += `</row>`;
  });

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rowsXml}
  </sheetData>
</worksheet>`;

  return buildZipArchive([
    { path: '[Content_Types].xml', data: contentTypesXml },
    { path: '_rels/.rels', data: packageRelsXml },
    { path: 'xl/workbook.xml', data: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { path: 'xl/styles.xml', data: stylesXml },
    { path: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
  ]);
}

/**
 * Generates a valid standard PDF 1.4 binary document starting with %PDF-1.4
 */
export function generatePdfBuffer(
  transactions: Transaction[] = initialTransactions,
  startDate = '2026-09-01',
  endDate = '2026-09-30'
): Buffer {
  const escapePdf = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  let streamContent = '';

  // 1. Header Box Decoration (Dark Blue Pill Header background)
  streamContent += '0.06 0.12 0.28 rg\n'; // Primary Blue background
  streamContent += '40 735 515 70 re f\n'; // Rectangle [x, y, w, h]

  // Top Title Banner
  streamContent += 'BT\n';
  streamContent += '/F2 16 Tf\n';
  streamContent += '1 1 1 rg\n'; // White text
  streamContent += '55 775 Td\n';
  streamContent += `(${escapePdf('SIMPANUANG (TATADANA) - LAPORAN KEUANGAN')}) Tj\n`;
  streamContent += 'ET\n';

  // Subtitle / Period (Clean WIB timestamp)
  const nowWIB = new Date();
  const wibTimeStr = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(nowWIB);

  streamContent += 'BT\n';
  streamContent += '/F1 9 Tf\n';
  streamContent += '0.8 0.9 1 rg\n'; // Light blue text
  streamContent += '55 750 Td\n';
  streamContent += `(${escapePdf(`Periode: ${startDate} s/d ${endDate}  |  Dicetak: ${wibTimeStr} WIB`)}) Tj\n`;
  streamContent += 'ET\n';

  // Reset to dark text
  streamContent += '0.1 0.1 0.1 rg\n';

  // 2. Summary KPI Box (Light Grey Box with Border)
  streamContent += '0.96 0.97 0.99 rg\n';
  streamContent += '40 655 515 65 re f\n';
  streamContent += '0.82 0.86 0.92 RG\n'; // Border stroke color
  streamContent += '0.8 w\n';
  streamContent += '40 655 515 65 re S\n';

  // Summary Metrics Text (3 Columns layout)
  streamContent += 'BT\n';
  streamContent += '/F2 8.5 Tf\n';
  streamContent += '0.35 0.4 0.5 rg\n';
  streamContent += '55 698 Td\n';
  streamContent += `(${escapePdf('TOTAL PEMASUKAN')}) Tj\n`;
  streamContent += '165 0 Td\n';
  streamContent += `(${escapePdf('TOTAL PENGELUARAN')}) Tj\n`;
  streamContent += '175 0 Td\n';
  streamContent += `(${escapePdf('NET CASHFLOW')}) Tj\n`;
  streamContent += 'ET\n';

  // Subtitle string for tests backward compatibility & clean visual
  streamContent += 'BT\n';
  streamContent += '/F2 10 Tf\n';
  // Total Income (Green)
  streamContent += '0.08 0.6 0.35 rg\n';
  streamContent += '55 675 Td\n';
  streamContent += `(${escapePdf(`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`)}) Tj\n`;
  // Total Expense (Red/Rose)
  streamContent += '0.85 0.18 0.18 rg\n';
  streamContent += '165 0 Td\n';
  streamContent += `(${escapePdf(`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`)}) Tj\n`;
  // Net Cashflow (Blue or Red depending on sign)
  if (netCashflow >= 0) {
    streamContent += '0.1 0.45 0.9 rg\n';
  } else {
    streamContent += '0.85 0.18 0.18 rg\n';
  }
  streamContent += '175 0 Td\n';
  streamContent += `(${escapePdf(`Net Cashflow: Rp ${netCashflow.toLocaleString('id-ID')} (${netCashflow >= 0 ? 'Surplus' : 'Defisit'})`)}) Tj\n`;
  streamContent += 'ET\n';

  // 3. Table Header Bar (Dark Navy Fill)
  streamContent += '0.12 0.18 0.28 rg\n';
  streamContent += '40 615 515 22 re f\n';

  // Table Column Titles with Exact Absolute Coordinates
  streamContent += '1 1 1 rg\n'; // White text
  streamContent += `BT /F2 8.5 Tf 48 622 Td (${escapePdf('TANGGAL')}) Tj ET\n`;
  streamContent += `BT /F2 8.5 Tf 115 622 Td (${escapePdf('JENIS')}) Tj ET\n`;
  streamContent += `BT /F2 8.5 Tf 165 622 Td (${escapePdf('NOMINAL')}) Tj ET\n`;
  streamContent += `BT /F2 8.5 Tf 255 622 Td (${escapePdf('KATEGORI')}) Tj ET\n`;
  streamContent += `BT /F2 8.5 Tf 375 622 Td (${escapePdf('DOMPET')}) Tj ET\n`;
  streamContent += `BT /F2 8.5 Tf 465 622 Td (${escapePdf('CATATAN')}) Tj ET\n`;

  // Table rows with alternating zebra striping and strict column coordinates
  let y = 595;
  const rows = transactions.slice(0, 28);

  for (let i = 0; i < rows.length; i++) {
    const tx = rows[i];
    const isEven = i % 2 === 0;

    // Row zebra background
    if (isEven) {
      streamContent += '0.96 0.97 0.99 rg\n';
      streamContent += `40 ${y - 4} 515 18 re f\n`;
    }

    // Row Bottom Border Line
    streamContent += '0.88 0.90 0.94 RG\n';
    streamContent += '0.4 w\n';
    streamContent += `40 ${y - 4} m 555 ${y - 4} l S\n`;

    const isIncome = tx.type === 'income';
    const typeLabel = isIncome ? '+ MASUK' : '- KELUAR';
    const amountFormatted = `Rp ${tx.amount.toLocaleString('id-ID')}`;
    const categoryClean = (tx.category_name || '-').slice(0, 20);
    const walletClean = (tx.wallet_name || '-').slice(0, 18);
    const notesClean = (tx.notes || '-').slice(0, 30);

    // 1. Tanggal (Dark grey)
    streamContent += `BT /F1 8 Tf 0.25 0.3 0.38 rg 48 ${y} Td (${escapePdf(tx.date || '-')}) Tj ET\n`;

    // 2. Jenis (+MASUK Green, -KELUAR Red)
    if (isIncome) {
      streamContent += `BT /F2 7.5 Tf 0.08 0.58 0.32 rg 115 ${y} Td (${escapePdf(typeLabel)}) Tj ET\n`;
    } else {
      streamContent += `BT /F2 7.5 Tf 0.82 0.16 0.16 rg 115 ${y} Td (${escapePdf(typeLabel)}) Tj ET\n`;
    }

    // 3. Nominal (Bold dark text)
    streamContent += `BT /F2 8 Tf 0.12 0.15 0.22 rg 165 ${y} Td (${escapePdf(amountFormatted)}) Tj ET\n`;

    // 4. Kategori
    streamContent += `BT /F1 8 Tf 0.18 0.22 0.3 rg 255 ${y} Td (${escapePdf(categoryClean)}) Tj ET\n`;

    // 5. Dompet
    streamContent += `BT /F1 8 Tf 0.2 0.25 0.35 rg 375 ${y} Td (${escapePdf(walletClean)}) Tj ET\n`;

    // 6. Catatan (Muted text)
    streamContent += `BT /F1 8 Tf 0.4 0.45 0.52 rg 465 ${y} Td (${escapePdf(notesClean)}) Tj ET\n`;

    y -= 19;
  }

  // Footer Box
  streamContent += '0.85 0.88 0.92 RG\n';
  streamContent += '0.5 w\n';
  streamContent += '40 55 m 555 55 l S\n';

  streamContent += 'BT\n';
  streamContent += '/F1 7.5 Tf\n';
  streamContent += '0.45 0.5 0.6 rg\n';
  streamContent += '50 42 Td\n';
  streamContent += `(${escapePdf('Laporan resmi SimpanUang (TataDana) Financial Intelligence • Akses Akun Pro Lifetime • simpandana.my.id')}) Tj\n`;
  streamContent += 'ET\n';

  const streamBuf = Buffer.from(streamContent, 'utf-8');

  // Construct PDF Objects
  const objects: Buffer[] = [];
  const offsets: number[] = [];

  // obj 1: Catalog
  objects.push(Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  // obj 2: Pages
  objects.push(Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'));
  // obj 3: Page
  objects.push(Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n'));
  // obj 4: Font Helvetica
  objects.push(Buffer.from('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'));
  // obj 5: Font Helvetica-Bold
  objects.push(Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'));
  // obj 6: Stream Content
  objects.push(Buffer.from(`6 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`));

  const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  let currentOffset = header.length;

  for (const obj of objects) {
    offsets.push(currentOffset);
    currentOffset += obj.length;
  }

  // Cross-reference table (xref)
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  const startXrefOffset = currentOffset;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXrefOffset}\n%%EOF\n`;

  return Buffer.concat([header, ...objects, Buffer.from(xref, 'utf-8'), Buffer.from(trailer, 'utf-8')]);
}

export interface ExportOptions {
  userId?: string;
  plan?: string;
  format?: 'pdf' | 'xlsx' | 'excel' | 'csv' | string;
  startDate?: string;
  endDate?: string;
  transactions?: Transaction[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  contentType: string;
  buffer: Buffer;
  signedUrl: string;
  sizeBytes: number;
}

/**
 * Main export coordinator with Pro Gatekeeper and date range validation
 */
export function generateExportReport(options: ExportOptions): ExportResult {
  const {
    userId = 'usr-101',
    plan = 'pro',
    format = 'pdf',
    startDate = '2026-09-01',
    endDate = '2026-09-30',
    transactions = initialTransactions,
  } = options;

  // Pro Gatekeeper Check
  if (plan !== 'pro') {
    const error: any = new Error('Fitur export laporan (PDF & Excel) hanya tersedia untuk pengguna Pro.');
    error.code = 'FEATURE_GATED';
    error.statusCode = 403;
    throw error;
  }

  // Date Range Validation
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    const error: any = new Error('Invalid date range: startDate cannot be after endDate');
    error.code = 'INVALID_DATE_RANGE';
    error.statusCode = 400;
    throw error;
  }

  const normalizedFormat = format.toLowerCase();

  if (normalizedFormat === 'pdf') {
    const buffer = generatePdfBuffer(transactions, startDate, endDate);
    const filename = `laporan-keuangan-${startDate}-${endDate}.pdf`;
    return {
      success: true,
      filename,
      contentType: 'application/pdf',
      buffer,
      signedUrl: `https://storage.tatadana.id/exports/${userId}/${Date.now()}.pdf?token=valid_signed_token`,
      sizeBytes: buffer.length,
    };
  } else if (normalizedFormat === 'xlsx' || normalizedFormat === 'excel') {
    const buffer = generateExcelBuffer(transactions);
    const filename = `transaksi-keuangan-${startDate}-${endDate}.xlsx`;
    return {
      success: true,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
      signedUrl: `https://storage.tatadana.id/exports/${userId}/${Date.now()}.xlsx?token=valid_signed_token`,
      sizeBytes: buffer.length,
    };
  } else {
    const error: any = new Error(`Unsupported export format: ${format}`);
    error.code = 'UNSUPPORTED_FORMAT';
    error.statusCode = 400;
    throw error;
  }
}
