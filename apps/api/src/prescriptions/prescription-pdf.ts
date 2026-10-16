// Builds the consultation prescription as an A4 PDF, with no external library.
// Uses the PDF standard fonts (Helvetica / Helvetica-Bold), so text must be in
// Latin script; anything else is replaced with "?".

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionPdfData {
  doctor: {
    name: string;
    degrees: string;
    title: string;
    specialisation: string | null;
    pmdcNumber: string;
    phone: string | null;
    email: string | null;
  };
  patient: { name: string; age: string | null; gender: string | null };
  /** "15 Oct 2026" */
  date: string;
  appointmentNum: string;
  consultationType: string;
  diagnosis: string | null;
  medicines: PrescriptionMedicine[];
  labTests: string[];
  advice: string | null;
  /** "15 Oct 2026, 7:40 PM" */
  issuedAt: string;
}

// ---------------------------------------------------------------------------
// Font metrics (Adobe AFM widths, 1/1000 em) for WinAnsi codes 32..126
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
/** WinAnsi characters above 126 that doctors commonly type */
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

/** Replaces characters the standard fonts can't draw, and normalises whitespace */
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

/** Splits text into lines that fit `width` (breaks long words too) */
export function wrapText(text: string, font: Font, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of pdfSafe(text).split('\n')) {
    const words = paragraph.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      // a single word longer than the line: cut it
      while (textWidth(word, font, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && textWidth(word.slice(0, cut), font, size) > width) cut--;
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, font, size) <= width) line = candidate;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** PDF string literal in WinAnsi */
function pdfString(text: string) {
  let s = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') s += `\\${ch}`;
    else if (code >= 32 && code <= 126) s += ch;
    else if (EXTRA[ch]) s += `\\${EXTRA[ch].code.toString(8).padStart(3, '0')}`;
    else s += '?';
  }
  return `(${s})`;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const rgb = (c: RGB) => c.map((v) => v.toFixed(3)).join(' ');

const NAVY = hex('#141b34');
const GOLD = hex('#b38a3a');
const INK = hex('#1f2433');
const MUTED = hex('#6b6f80');
const LINE = hex('#ddd8cc');
const SOFT = hex('#f6f4ef');

// ---------------------------------------------------------------------------
// Tiny page writer
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_TOP = 92; // space kept free at the bottom for the footer

class Pages {
  pages: string[][] = [];
  y = 0;

  constructor(private readonly onNewPage: (p: Pages, first: boolean) => void) {
    this.addPage();
  }

  private get ops() {
    return this.pages[this.pages.length - 1];
  }

  addPage() {
    const first = this.pages.length === 0;
    this.pages.push([]);
    this.y = PAGE_H - MARGIN;
    this.onNewPage(this, first);
  }

  /** Starts a new page when fewer than `needed` points are left */
  ensure(needed: number) {
    if (this.y - needed < FOOTER_TOP) this.addPage();
  }

  text(x: number, y: number, text: string, font: Font = 'R', size = 10, color: RGB = INK) {
    this.ops.push(`BT /${font === 'B' ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(pdfSafe(text))} Tj ET`);
  }

  textRight(xRight: number, y: number, text: string, font: Font = 'R', size = 10, color: RGB = INK) {
    this.text(xRight - textWidth(pdfSafe(text), font, size), y, text, font, size, color);
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB) {
    this.ops.push(`${rgb(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = LINE, width = 0.75) {
    this.ops.push(`${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  /** Wrapped paragraph at the cursor; returns nothing, moves the cursor down */
  paragraph(text: string, opts: { x?: number; width?: number; font?: Font; size?: number; color?: RGB; leading?: number } = {}) {
    const { x = MARGIN, width = CONTENT_W, font = 'R', size = 10, color = INK } = opts;
    const leading = opts.leading ?? size * 1.45;
    for (const line of wrapText(text, font, size, width)) {
      this.ensure(leading);
      this.y -= leading;
      if (line) this.text(x, this.y + leading * 0.25, line, font, size, color);
    }
  }

  push(op: string) {
    this.ops.push(op);
  }
}

// ---------------------------------------------------------------------------

export function buildPrescriptionPdf(d: PrescriptionPdfData): Buffer {
  const header = (p: Pages, first: boolean) => {
    // Brand band
    p.rect(0, PAGE_H - 10, PAGE_W, 10, NAVY);
    p.rect(0, PAGE_H - 13, PAGE_W, 3, GOLD);
    let y = PAGE_H - MARGIN - 4;
    p.text(MARGIN, y, 'Tabibistan', 'B', 18, NAVY);
    p.textRight(PAGE_W - MARGIN, y, 'MEDICAL PRESCRIPTION', 'B', 11, GOLD);
    y -= 14;
    p.text(MARGIN, y, 'Online & in-clinic consultations', 'R', 8.5, MUTED);
    p.textRight(PAGE_W - MARGIN, y, d.appointmentNum, 'R', 8.5, MUTED);
    if (!first) {
      y -= 16;
      p.text(MARGIN, y, `${d.doctor.name}  ·  Patient: ${d.patient.name}  (continued)`, 'R', 9, MUTED);
      y -= 10;
      p.line(MARGIN, y, PAGE_W - MARGIN, y);
      p.y = y - 6;
      return;
    }
    y -= 24;
    // Doctor block (left) / contact (right)
    p.text(MARGIN, y, d.doctor.name, 'B', 15, NAVY);
    const right = PAGE_W - MARGIN;
    p.textRight(right, y, `PMDC Reg. No: ${d.doctor.pmdcNumber}`, 'B', 9.5, INK);
    y -= 14;
    p.text(MARGIN, y, d.doctor.degrees, 'R', 9.5, INK);
    if (d.doctor.phone) p.textRight(right, y, `Phone: ${d.doctor.phone}`, 'R', 9, MUTED);
    y -= 12;
    p.text(MARGIN, y, [d.doctor.title, d.doctor.specialisation].filter(Boolean).join(' · '), 'R', 9, MUTED);
    if (d.doctor.email) p.textRight(right, y, d.doctor.email, 'R', 9, MUTED);
    y -= 14;
    p.line(MARGIN, y, PAGE_W - MARGIN, y, GOLD, 1.2);

    // Patient panel
    y -= 50;
    p.rect(MARGIN, y, CONTENT_W, 42, SOFT);
    const cols: [string, string][] = [
      ['PATIENT NAME', d.patient.name],
      ['AGE', d.patient.age || '—'],
      ['GENDER', d.patient.gender || '—'],
      ['DATE', d.date],
      ['CONSULTATION', d.consultationType],
    ];
    const widths = [0.3, 0.1, 0.14, 0.18, 0.28].map((f) => f * (CONTENT_W - 24));
    let x = MARGIN + 12;
    cols.forEach(([label, value], i) => {
      p.text(x, y + 26, label, 'B', 7, MUTED);
      const fit = wrapText(value, 'B', 10, widths[i] - 6)[0] ?? '';
      p.text(x, y + 11, fit, 'B', 10, INK);
      x += widths[i];
    });
    p.y = y - 16;
  };

  const p = new Pages(header);

  const sectionTitle = (title: string) => {
    p.ensure(40);
    p.y -= 18;
    p.text(MARGIN, p.y, title.toUpperCase(), 'B', 9, GOLD);
    p.y -= 6;
    p.line(MARGIN, p.y, MARGIN + textWidth(title.toUpperCase(), 'B', 9), p.y, GOLD, 1);
    p.y -= 4;
  };

  // Rx mark
  p.ensure(40);
  p.y -= 26;
  p.text(MARGIN, p.y, 'Rx', 'B', 22, NAVY);
  p.y -= 4;

  if (d.diagnosis?.trim()) {
    sectionTitle('Clinical diagnosis');
    p.paragraph(d.diagnosis.trim(), { size: 10 });
  }

  // Medicines table
  if (d.medicines.length) {
    sectionTitle('Medicines');
    const colDefs: { label: string; f: number; key: keyof PrescriptionMedicine | '#' }[] = [
      { label: '#', f: 0.05, key: '#' },
      { label: 'MEDICINE', f: 0.27, key: 'name' },
      { label: 'DOSAGE', f: 0.13, key: 'dosage' },
      { label: 'FREQUENCY', f: 0.14, key: 'frequency' },
      { label: 'DURATION', f: 0.13, key: 'duration' },
      { label: 'INSTRUCTIONS', f: 0.28, key: 'instructions' },
    ];
    const colW = colDefs.map((c) => c.f * CONTENT_W);
    const headRow = () => {
      p.ensure(26);
      p.y -= 20;
      p.rect(MARGIN, p.y, CONTENT_W, 20, NAVY);
      let x = MARGIN;
      colDefs.forEach((c, i) => {
        p.text(x + 6, p.y + 7, c.label, 'B', 7.5, [1, 1, 1]);
        x += colW[i];
      });
    };
    headRow();
    d.medicines.forEach((m, idx) => {
      const cells = colDefs.map((c, i) => {
        const value = c.key === '#' ? String(idx + 1) : m[c.key] || '—';
        return wrapText(value, c.key === 'name' ? 'B' : 'R', 9.5, colW[i] - 12);
      });
      const lines = Math.max(...cells.map((c) => c.length));
      const h = lines * 12 + 10;
      if (p.y - h < FOOTER_TOP) {
        p.addPage();
        headRow();
      }
      p.y -= h;
      if (idx % 2 === 1) p.rect(MARGIN, p.y, CONTENT_W, h, SOFT);
      let x = MARGIN;
      cells.forEach((cellLines, i) => {
        cellLines.forEach((line, li) => p.text(x + 6, p.y + h - 15 - li * 12, line, colDefs[i].key === 'name' ? 'B' : 'R', 9.5, INK));
        x += colW[i];
      });
      p.line(MARGIN, p.y, PAGE_W - MARGIN, p.y);
    });
  }

  if (d.labTests.length) {
    sectionTitle('Recommended lab tests');
    for (const test of d.labTests) {
      const lines = wrapText(test, 'R', 10, CONTENT_W - 16);
      lines.forEach((line, i) => {
        p.ensure(15);
        p.y -= 15;
        if (i === 0) p.text(MARGIN + 2, p.y + 4, '•', 'B', 10, GOLD);
        p.text(MARGIN + 14, p.y + 4, line, 'R', 10, INK);
      });
    }
  }

  if (d.advice?.trim()) {
    sectionTitle('General advice');
    p.paragraph(d.advice.trim(), { size: 10 });
  }

  // Signature
  p.ensure(70);
  p.y -= 56;
  const sigX = PAGE_W - MARGIN - 180;
  p.line(sigX, p.y, PAGE_W - MARGIN, p.y, INK, 0.8);
  p.text(sigX, p.y - 12, d.doctor.name, 'B', 9.5, INK);
  p.text(sigX, p.y - 24, `PMDC Reg. No: ${d.doctor.pmdcNumber}`, 'R', 8.5, MUTED);

  // Footer on every page (needs the total page count)
  const total = p.pages.length;
  p.pages.forEach((ops, i) => {
    ops.push(`${rgb(LINE)} RG 0.75 w ${MARGIN} 62 m ${(PAGE_W - MARGIN).toFixed(2)} 62 l S`);
    const note = `Issued digitally through Tabibistan on ${d.issuedAt}. This prescription is valid with the doctor's PMDC registration shown above.`;
    wrapText(note, 'R', 7.5, CONTENT_W - 70).forEach((line, li) => {
      ops.push(`BT /F1 7.5 Tf ${rgb(MUTED)} rg ${MARGIN} ${(50 - li * 10).toFixed(2)} Td ${pdfString(line)} Tj ET`);
    });
    const label = `Page ${i + 1} of ${total}`;
    ops.push(`BT /F1 7.5 Tf ${rgb(MUTED)} rg ${(PAGE_W - MARGIN - textWidth(label, 'R', 7.5)).toFixed(2)} 50 Td ${pdfString(label)} Tj ET`);
  });

  return serialize(p.pages, `Prescription ${d.appointmentNum}`);
}

/** Writes the PDF objects, cross-reference table and trailer */
function serialize(pages: string[][], title: string): Buffer {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add('');
  const pagesObj = add('');
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const info = add(`<< /Title ${pdfString(pdfSafe(title))} /Producer (Tabibistan) >>`);
  const kids: number[] = [];
  for (const ops of pages) {
    const stream = ops.join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
