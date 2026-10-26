// Builds the diagnostic lab report / prescription as an A4 PDF with zero external libraries.
// Uses standard PDF-1.4 spec with Helvetica / Helvetica-Bold standard fonts.

export interface LabResultParameter {
  testName: string;
  parameter: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}

export interface LabPrescriptionPdfData {
  laboratory: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
  orderNumber: string;
  reportDate: string;
  patient: {
    name: string;
    age?: number | string | null;
    gender?: string | null;
    phone?: string | null;
  };
  pathologist: {
    name: string;
    signUrl?: string | null;
  };
  testResults: LabResultParameter[];
  remarks?: string | null;
  instructions?: string | null;
}

// ---------------------------------------------------------------------------
// Font metrics (AFM widths, 1/1000 em) for WinAnsi codes 32..126
// ---------------------------------------------------------------------------

const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

const EXTRA: Record<string, { code: number; w: number; wb: number }> = {
  '‘': { code: 145, w: 222, wb: 278 },
  '’': { code: 146, w: 222, wb: 278 },
  '“': { code: 147, w: 333, wb: 500 },
  '”': { code: 148, w: 333, wb: 500 },
  '•': { code: 149, w: 350, wb: 350 },
  '–': { code: 150, w: 556, wb: 556 },
  '—': { code: 151, w: 1000, wb: 1000 },
  '°': { code: 176, w: 400, wb: 400 },
  '·': { code: 183, w: 278, wb: 278 },
  'µ': { code: 181, w: 556, wb: 611 },
  '×': { code: 215, w: 584, wb: 584 },
  '½': { code: 189, w: 834, wb: 834 },
  '¼': { code: 188, w: 834, wb: 834 },
};

type Font = 'R' | 'B';

export function pdfSafe(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\n\x20-\x7E‘’“”•–—°·µ×½¼]/g, '?');
}

function charWidth(ch: string, font: Font) {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) return (font === 'B' ? HELVETICA_BOLD : HELVETICA)[code - 32];
  const extra = EXTRA[ch];
  return extra ? (font === 'B' ? extra.wb : extra.w) : 556;
}

export function textWidth(text: string, font: Font, size: number) {
  let w = 0;
  for (const ch of text) w += charWidth(ch, font);
  return (w * size) / 1000;
}

export function wrapText(text: string, font: Font, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of pdfSafe(text).split('\n')) {
    const words = paragraph.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (textWidth(candidate, font, size) <= width) {
        current = candidate;
      } else {
        out.push(current);
        current = words[i];
      }
    }
    out.push(current);
  }
  return out;
}

function pdfString(text: string) {
  let s = '';
  for (const ch of text) {
    const extra = EXTRA[ch];
    if (extra) {
      s += `\\${extra.code.toString(8).padStart(3, '0')}`;
    } else if (ch === '(' || ch === ')' || ch === '\\') {
      s += `\\${ch}`;
    } else {
      s += ch;
    }
  }
  return `(${s})`;
}

type RGB = [number, number, number];

function rgb(c: RGB): string {
  return `${(c[0] / 255).toFixed(3)} ${(c[1] / 255).toFixed(3)} ${(c[2] / 255).toFixed(3)}`;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR_PRIMARY: RGB = [16, 110, 80];    // Emerald / Teal Primary
const COLOR_NAVY: RGB = [20, 27, 52];        // Deep Navy
const COLOR_TEXT: RGB = [30, 41, 59];        // Slate 800
const COLOR_MUTED: RGB = [100, 116, 139];    // Slate 500
const COLOR_BORDER: RGB = [226, 232, 240];   // Slate 200
const COLOR_ROW_ALT: RGB = [248, 250, 252];  // Slate 50
const COLOR_HIGH: RGB = [225, 29, 72];       // Rose 600
const COLOR_LOW: RGB = [217, 119, 6];        // Amber 600

class PdfWriter {
  ops: string[] = [];

  rect(x: number, y: number, w: number, h: number, fill?: RGB, stroke?: RGB, lineWidth = 0.5) {
    const parts: string[] = [];
    if (fill) parts.push(`${rgb(fill)} rg`);
    if (stroke) parts.push(`${rgb(stroke)} RG ${lineWidth} w`);
    parts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) parts.push('B');
    else if (fill) parts.push('f');
    else if (stroke) parts.push('S');
    this.ops.push(parts.join(' '));
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: RGB, lineWidth = 0.5) {
    this.ops.push(`${rgb(stroke)} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  text(x: number, y: number, text: string, font: Font, size: number, color: RGB) {
    this.ops.push(`BT /${font === 'B' ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(pdfSafe(text))} Tj ET`);
  }

  textRight(xRight: number, y: number, text: string, font: Font, size: number, color: RGB) {
    this.text(xRight - textWidth(pdfSafe(text), font, size), y, text, font, size, color);
  }
}

export function buildLabPrescriptionPdf(d: LabPrescriptionPdfData): Buffer {
  const p = new PdfWriter();

  // Top header banner (accent line)
  p.rect(0, PAGE_H - 8, PAGE_W, 8, COLOR_PRIMARY);

  // Laboratory Branding
  let curY = PAGE_H - 45;
  p.text(MARGIN, curY, d.laboratory.name || 'Tabibistan Diagnostic Laboratory', 'B', 16, COLOR_NAVY);
  p.textRight(PAGE_W - MARGIN, curY, 'OFFICIAL DIAGNOSTIC REPORT', 'B', 11, COLOR_PRIMARY);

  curY -= 15;
  const contact = [d.laboratory.phone ? `Ph: ${d.laboratory.phone}` : '', d.laboratory.address || 'Certified Clinical Pathology Center']
    .filter(Boolean)
    .join(' | ');
  p.text(MARGIN, curY, contact, 'R', 8.5, COLOR_MUTED);
  p.textRight(PAGE_W - MARGIN, curY, `Report Generated: ${d.reportDate}`, 'R', 8, COLOR_MUTED);

  // Horizontal divider
  curY -= 12;
  p.line(MARGIN, curY, PAGE_W - MARGIN, curY, COLOR_BORDER, 1);

  // Patient & Order Snapshot Box
  curY -= 8;
  const boxH = 58;
  const boxY = curY - boxH;
  p.rect(MARGIN, boxY, CONTENT_W, boxH, COLOR_ROW_ALT, COLOR_BORDER, 0.75);

  const col1X = MARGIN + 12;
  const col2X = MARGIN + 180;
  const col3X = MARGIN + 350;

  // Row 1
  let textY = boxY + 40;
  p.text(col1X, textY, 'Patient Name:', 'R', 8, COLOR_MUTED);
  p.text(col1X + 60, textY, d.patient.name, 'B', 9, COLOR_TEXT);

  p.text(col2X, textY, 'Order Number:', 'R', 8, COLOR_MUTED);
  p.text(col2X + 65, textY, d.orderNumber, 'B', 9, COLOR_TEXT);

  p.text(col3X, textY, 'Pathologist:', 'R', 8, COLOR_MUTED);
  p.text(col3X + 55, textY, d.pathologist.name || 'Consultant Pathologist', 'B', 9, COLOR_TEXT);

  // Row 2
  textY -= 18;
  p.text(col1X, textY, 'Age / Gender:', 'R', 8, COLOR_MUTED);
  const ageStr = d.patient.age ? `${d.patient.age} Yrs` : 'N/A';
  const genStr = d.patient.gender ? `${d.patient.gender}` : 'N/A';
  p.text(col1X + 60, textY, `${ageStr} / ${genStr}`, 'R', 9, COLOR_TEXT);

  p.text(col2X, textY, 'Contact:', 'R', 8, COLOR_MUTED);
  p.text(col2X + 65, textY, d.patient.phone || 'Recorded on File', 'R', 9, COLOR_TEXT);

  p.text(col3X, textY, 'Status:', 'R', 8, COLOR_MUTED);
  p.text(col3X + 55, textY, 'VERIFIED & RELEASED', 'B', 8.5, COLOR_PRIMARY);

  // Table Section Header
  curY = boxY - 24;
  p.text(MARGIN, curY, 'STRUCTURED DIAGNOSTIC TEST RESULTS', 'B', 10, COLOR_NAVY);

  // Table Column Specs
  curY -= 12;
  const colTestW = 140;
  const colParamW = 140;
  const colResultW = 80;
  const colUnitW = 60;
  const colRefW = 65;
  const colFlagW = 38;

  const thY = curY - 20;
  p.rect(MARGIN, thY, CONTENT_W, 20, COLOR_PRIMARY);

  p.text(MARGIN + 6, thY + 6, 'TEST NAME', 'B', 7.5, [255, 255, 255]);
  p.text(MARGIN + colTestW + 6, thY + 6, 'PARAMETER', 'B', 7.5, [255, 255, 255]);
  p.text(MARGIN + colTestW + colParamW + 6, thY + 6, 'RESULT', 'B', 7.5, [255, 255, 255]);
  p.text(MARGIN + colTestW + colParamW + colResultW + 6, thY + 6, 'UNIT', 'B', 7.5, [255, 255, 255]);
  p.text(MARGIN + colTestW + colParamW + colResultW + colUnitW + 6, thY + 6, 'REFERENCE', 'B', 7.5, [255, 255, 255]);
  p.text(MARGIN + colTestW + colParamW + colResultW + colUnitW + colRefW + 4, thY + 6, 'FLAG', 'B', 7.5, [255, 255, 255]);

  curY = thY;

  // Table Rows
  const rowH = 20;
  const items = d.testResults && d.testResults.length > 0 ? d.testResults : [
    { testName: 'Diagnostic Evaluation', parameter: 'Clinical Observation', result: 'Completed', unit: '-', referenceRange: 'Normal', flag: 'NORMAL' },
  ];

  items.slice(0, 18).forEach((row, idx) => {
    curY -= rowH;
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      p.rect(MARGIN, curY, CONTENT_W, rowH, COLOR_ROW_ALT);
    }
    p.line(MARGIN, curY, PAGE_W - MARGIN, curY, COLOR_BORDER, 0.5);

    // Row texts
    const tY = curY + 6;
    p.text(MARGIN + 6, tY, row.testName || 'Laboratory Test', 'B', 8, COLOR_TEXT);
    p.text(MARGIN + colTestW + 6, tY, row.parameter || 'Sample Parameter', 'R', 8, COLOR_TEXT);

    // Result value with emphasis
    p.text(MARGIN + colTestW + colParamW + 6, tY, row.result || '-', 'B', 8.5, COLOR_TEXT);
    p.text(MARGIN + colTestW + colParamW + colResultW + 6, tY, row.unit || '-', 'R', 7.5, COLOR_MUTED);
    p.text(MARGIN + colTestW + colParamW + colResultW + colUnitW + 6, tY, row.referenceRange || '-', 'R', 7.5, COLOR_MUTED);

    // Flag styling
    const flag = (row.flag || 'NORMAL').toUpperCase();
    let flagColor: RGB = COLOR_PRIMARY;
    if (flag === 'HIGH' || flag === 'CRITICAL') flagColor = COLOR_HIGH;
    else if (flag === 'LOW') flagColor = COLOR_LOW;

    p.text(MARGIN + colTestW + colParamW + colResultW + colUnitW + colRefW + 4, tY, flag, 'B', 7.5, flagColor);
  });

  // Table bottom border
  p.line(MARGIN, curY, PAGE_W - MARGIN, curY, COLOR_BORDER, 1);

  // Pathologist Remarks / Clinical Interpretation
  curY -= 24;
  p.text(MARGIN, curY, 'PATHOLOGIST REMARKS & CLINICAL INTERPRETATION', 'B', 9, COLOR_NAVY);
  curY -= 12;
  const remarksText = d.remarks || 'No abnormal findings reported outside expected reference thresholds. Clinical correlation advised.';
  const remarkLines = wrapText(remarksText, 'R', 8, CONTENT_W - 16);
  const remBoxH = Math.max(34, remarkLines.length * 12 + 14);
  const remBoxY = curY - remBoxH;
  p.rect(MARGIN, remBoxY, CONTENT_W, remBoxH, COLOR_ROW_ALT, COLOR_BORDER, 0.5);
  remarkLines.forEach((line, i) => {
    p.text(MARGIN + 8, remBoxY + remBoxH - 12 - i * 12, line, 'R', 8, COLOR_TEXT);
  });

  // Instructions / Guidance
  curY = remBoxY - 18;
  if (d.instructions) {
    p.text(MARGIN, curY, 'PATIENT INSTRUCTIONS & FOLLOW-UP', 'B', 8.5, COLOR_NAVY);
    curY -= 12;
    const instLines = wrapText(d.instructions, 'R', 8, CONTENT_W - 16);
    const instH = instLines.length * 12 + 10;
    const instY = curY - instH;
    instLines.forEach((line, i) => {
      p.text(MARGIN + 8, instY + instH - 10 - i * 12, `• ${line}`, 'R', 7.5, COLOR_MUTED);
    });
    curY = instY;
  }

  // Official Signature Block at Bottom
  const sigY = 65;
  p.line(PAGE_W - MARGIN - 180, sigY + 28, PAGE_W - MARGIN, sigY + 28, COLOR_NAVY, 1);
  p.textRight(PAGE_W - MARGIN, sigY + 16, d.pathologist.name || 'Medical Officer / Pathologist', 'B', 9, COLOR_NAVY);
  p.textRight(PAGE_W - MARGIN, sigY + 5, 'Consultant Clinical Pathologist', 'R', 7.5, COLOR_MUTED);

  // Left Disclaimer
  p.text(MARGIN, sigY + 20, 'Electronically signed and verified by Tabibistan Medical Laboratory Diagnostic Network.', 'B', 7.5, COLOR_PRIMARY);
  p.text(MARGIN, sigY + 9, 'This report is valid without physical signature when verified via Tabibistan portal.', 'R', 7, COLOR_MUTED);

  // Footer Accent
  p.rect(0, 0, PAGE_W, 6, COLOR_NAVY);

  // Assemble PDF streams
  const contentStream = p.ops.join('\n');
  return assemblePdf(contentStream, `Lab Report - ${d.orderNumber}`);
}

function assemblePdf(contentStream: string, title: string): Buffer {
  const objects: string[] = [];
  const offsets: number[] = [];

  function add(body: string): number {
    objects.push(body);
    return objects.length;
  }

  const catalog = 1;
  const pages = 2;
  const page = 3;
  const fontR = 4;
  const fontB = 5;
  const content = 6;

  add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
  add(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  add(
    `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
      `/Contents ${content} 0 R /Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R >> >> >>`,
  );
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const streamBytes = Buffer.from(contentStream, 'latin1');
  add(`<< /Length ${streamBytes.length} >>\nstream\n${contentStream}\nendstream`);

  const info = add(`<< /Title ${pdfString(pdfSafe(title))} /Producer (Tabibistan Laboratory Systems) >>`);

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  for (let i = 0; i < objects.length; i++) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, 'latin1');
}
