// Tabibistan co-branded diagnostic lab report (A4 PDF, no external libraries).
//
//   Header      Tabibistan Healthcare Network logo + "Powered by Tabibistan Lab Platform"
//               | partner lab name, address, contact, healthcare license no.
//               teal -> cyan gradient divider
//   Metadata    patient name, age / gender, order #, sample collected,
//               report generated, referring pathologist / lab director
//   Results     investigation, observed value (badge when abnormal), unit,
//               biological reference interval, flag pill; grouped by test,
//               zebra rows, continues on new pages with the header repeated
//   Remarks     pathologist remarks + advice
//   Sign-off    signature image (or stamp placeholder), name, designation;
//               Code 128 barcode of the order number; disclaimer + page numbers
//
// Fonts: the standard Helvetica family (WinAnsi). Images: see pdf-images.ts.

import { deflateSync } from 'node:zlib';
import { code128Modules, code128Width } from './code128.js';
import type { PdfImage } from './pdf-images.js';

export interface LabResultParameter {
  testName: string;
  parameter: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}

export interface LabPrescriptionPdfData {
  /** Tabibistan logo (assets/brand/tabibistan-logo.png); a vector mark is drawn when missing */
  brandLogo?: PdfImage | null;
  laboratory: {
    name: string;
    address?: string | null;
    phone?: string | null;
    /** e.g. "PHC License No." */
    licenseLabel: string;
    licenseNumber?: string | null;
    logo?: PdfImage | null;
  };
  orderNumber: string;
  /** short reference printed next to the title, e.g. first 8 chars of the record id */
  reportRef?: string | null;
  sampleCollectedDate: string;
  reportDate: string;
  patient: {
    name: string;
    age?: number | string | null;
    gender?: string | null;
  };
  /** Referring pathologist / lab director (main center's medical director) */
  referringPathologist?: string | null;
  pathologist: {
    name: string;
    designation?: string | null;
    signature?: PdfImage | null;
  };
  testResults: LabResultParameter[];
  remarks?: string | null;
  instructions?: string | null;
  /** Preview copy: "PREVIEW" watermark and a "not issued" note */
  preview?: boolean;
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
  '±': { code: 177, w: 584, wb: 584 },
  '·': { code: 183, w: 278, wb: 278 },
  'µ': { code: 181, w: 556, wb: 611 },
  '×': { code: 215, w: 584, wb: 584 },
  '½': { code: 189, w: 834, wb: 834 },
  '¼': { code: 188, w: 834, wb: 834 },
};

/** R regular, B bold, I oblique */
type Font = 'R' | 'B' | 'I';

export function pdfSafe(text: string): string {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[^\n\x20-\x7E‘’“”•–—°±·µ×½¼]/g, '?');
}

function charWidth(ch: string, font: Font) {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) return (font === 'B' ? HELVETICA_BOLD : HELVETICA)[code - 32];
  const extra = EXTRA[ch];
  return extra ? (font === 'B' ? extra.wb : extra.w) : 556;
}

export function textWidth(text: string, font: Font, size: number, charSpacing = 0) {
  let w = 0;
  let n = 0;
  for (const ch of text) {
    w += charWidth(ch, font);
    n++;
  }
  return (w * size) / 1000 + charSpacing * n;
}

export function wrapText(text: string, font: Font, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of pdfSafe(text).split('\n')) {
    const words = paragraph.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      // break words longer than the line
      let w = word;
      while (textWidth(w, font, size) > width) {
        let cut = w.length - 1;
        while (cut > 1 && textWidth(w.slice(0, cut), font, size) > width) cut--;
        if (current) {
          out.push(current);
          current = '';
        }
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const candidate = current ? `${current} ${w}` : w;
      if (textWidth(candidate, font, size) <= width) current = candidate;
      else {
        out.push(current);
        current = w;
      }
    }
    out.push(current);
  }
  return out;
}

/** Shortens text with "..." to fit the width */
function fit(text: string, font: Font, size: number, width: number) {
  const t = pdfSafe(text).replace(/\n/g, ' ');
  if (textWidth(t, font, size) <= width) return t;
  let cut = t.length;
  while (cut > 0 && textWidth(`${t.slice(0, cut).trimEnd()}...`, font, size) > width) cut--;
  return `${t.slice(0, cut).trimEnd()}...`;
}

function pdfString(text: string) {
  let s = '';
  for (const ch of text) {
    const extra = EXTRA[ch];
    if (extra) s += `\\${extra.code.toString(8).padStart(3, '0')}`;
    else if (ch === '(' || ch === ')' || ch === '\\') s += `\\${ch}`;
    else s += ch;
  }
  return `(${s})`;
}

type RGB = [number, number, number];

const rgb = (c: RGB) => `${(c[0] / 255).toFixed(3)} ${(c[1] / 255).toFixed(3)} ${(c[2] / 255).toFixed(3)}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const n2 = (v: number) => v.toFixed(2);

// ---------------------------------------------------------------------------
// Layout & palette
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36;
const CW = PAGE_W - M * 2;
/** content must stay above this line (footer below) */
const BOTTOM = 56;

const TEAL: RGB = [13, 148, 136]; // teal-600
const TEAL_DARK: RGB = [15, 118, 110]; // teal-700
const CYAN: RGB = [6, 182, 212]; // cyan-500
const TEAL_SOFT: RGB = [240, 253, 250]; // teal-50
const NAVY: RGB = [20, 27, 52];
const TEXT: RGB = [30, 41, 59]; // slate-800
const MUTED: RGB = [100, 116, 139]; // slate-500
const HEAD_TEXT: RGB = [71, 85, 105]; // slate-600
const BORDER: RGB = [226, 232, 240]; // slate-200
const HEAD_BG: RGB = [241, 245, 249]; // slate-100
const ZEBRA: RGB = [248, 250, 252]; // slate-50
const WHITE: RGB = [255, 255, 255];

const FLAG_STYLE: Record<string, { fg: RGB; bg: RGB }> = {
  NORMAL: { fg: [4, 120, 87], bg: [220, 252, 231] }, // emerald
  HIGH: { fg: [190, 18, 60], bg: [255, 228, 230] }, // rose
  LOW: { fg: [180, 83, 9], bg: [254, 243, 199] }, // amber
  CRITICAL: { fg: WHITE, bg: [225, 29, 72] },
  OTHER: { fg: HEAD_TEXT, bg: HEAD_BG },
};

const flagKey = (flag: string | undefined) => {
  const f = (flag ?? '').trim().toUpperCase();
  if (!f) return '';
  if (f === 'NORMAL' || f === 'HIGH' || f === 'LOW' || f === 'CRITICAL') return f;
  return 'OTHER';
};

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

class Page {
  ops: string[] = [];
  images = new Set<string>();

  rect(x: number, y: number, w: number, h: number, fill?: RGB, stroke?: RGB, lineWidth = 0.5) {
    const parts: string[] = [];
    if (fill) parts.push(`${rgb(fill)} rg`);
    if (stroke) parts.push(`${rgb(stroke)} RG ${lineWidth} w`);
    parts.push(`${n2(x)} ${n2(y)} ${n2(w)} ${n2(h)} re`);
    parts.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.ops.push(parts.join(' '));
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, fill?: RGB, stroke?: RGB, lineWidth = 0.5, dash?: string) {
    r = Math.min(r, w / 2, h / 2);
    const k = r * 0.5523;
    const parts: string[] = ['q'];
    if (dash) parts.push(`[${dash}] 0 d`);
    if (fill) parts.push(`${rgb(fill)} rg`);
    if (stroke) parts.push(`${rgb(stroke)} RG ${lineWidth} w`);
    parts.push(
      `${n2(x + r)} ${n2(y)} m ${n2(x + w - r)} ${n2(y)} l ${n2(x + w - r + k)} ${n2(y)} ${n2(x + w)} ${n2(y + r - k)} ${n2(x + w)} ${n2(y + r)} c`,
      `${n2(x + w)} ${n2(y + h - r)} l ${n2(x + w)} ${n2(y + h - r + k)} ${n2(x + w - r + k)} ${n2(y + h)} ${n2(x + w - r)} ${n2(y + h)} c`,
      `${n2(x + r)} ${n2(y + h)} l ${n2(x + r - k)} ${n2(y + h)} ${n2(x)} ${n2(y + h - r + k)} ${n2(x)} ${n2(y + h - r)} c`,
      `${n2(x)} ${n2(y + r)} l ${n2(x)} ${n2(y + r - k)} ${n2(x + r - k)} ${n2(y)} ${n2(x + r)} ${n2(y)} c h`,
    );
    parts.push(fill && stroke ? 'B' : fill ? 'f' : 'S', 'Q');
    this.ops.push(parts.join(' '));
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: RGB, lineWidth = 0.5) {
    this.ops.push(`${rgb(stroke)} RG ${lineWidth} w ${n2(x1)} ${n2(y1)} m ${n2(x2)} ${n2(y2)} l S`);
  }

  /** horizontal teal -> cyan gradient band */
  gradient(x: number, y: number, w: number, h: number, from: RGB = TEAL, to: RGB = CYAN, steps = 80) {
    const sw = w / steps;
    for (let i = 0; i < steps; i++) this.rect(x + i * sw, y, sw + 0.3, h, mix(from, to, i / (steps - 1)));
  }

  text(x: number, y: number, text: string, font: Font, size: number, color: RGB, charSpacing = 0) {
    const f = font === 'B' ? 'F2' : font === 'I' ? 'F3' : 'F1';
    // Tc is part of the text state and carries over to later text, so always set it
    const tc = `${charSpacing} Tc `;
    this.ops.push(`BT /${f} ${size} Tf ${tc}${rgb(color)} rg ${n2(x)} ${n2(y)} Td ${pdfString(pdfSafe(text))} Tj ET`);
  }

  textRight(xRight: number, y: number, text: string, font: Font, size: number, color: RGB, charSpacing = 0) {
    this.text(xRight - textWidth(pdfSafe(text), font, size, charSpacing), y, text, font, size, color, charSpacing);
  }

  textCenter(xCenter: number, y: number, text: string, font: Font, size: number, color: RGB, charSpacing = 0) {
    this.text(xCenter - textWidth(pdfSafe(text), font, size, charSpacing) / 2, y, text, font, size, color, charSpacing);
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    this.images.add(name);
    this.ops.push(`q ${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(y)} cm /${name} Do Q`);
  }

  /** diagonal watermark (drawn first so it sits under the content) */
  watermark(text: string) {
    const size = 96;
    const w = textWidth(text, 'B', size);
    const a = Math.PI / 4;
    const cos = Math.cos(a).toFixed(4);
    const sin = Math.sin(a).toFixed(4);
    const cx = PAGE_W / 2 - (w / 2) * Math.cos(a) + 20;
    const cy = PAGE_H / 2 - (w / 2) * Math.sin(a) - 30;
    this.ops.unshift(`q ${cos} ${sin} -${sin} ${cos} ${n2(cx)} ${n2(cy)} cm BT /F2 ${size} Tf ${rgb([236, 241, 246])} rg 0 0 Td ${pdfString(text)} Tj ET Q`);
  }
}

/** Fit an image into a box (keeps aspect ratio); returns the drawn size */
function containedSize(img: PdfImage, maxW: number, maxH: number) {
  const s = Math.min(maxW / img.width, maxH / img.height);
  return { w: img.width * s, h: img.height * s };
}

/** Splits "Dr. Sana Malik (Consultant Pathologist)" -> name + designation */
export function splitPathologist(full: string): { name: string; designation: string | null } {
  const m = full.trim().match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  return m ? { name: m[1].trim(), designation: m[2].trim() } : { name: full.trim(), designation: null };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const COLS = {
  inv: 186,
  value: 82,
  unit: 62,
  ref: 118,
};
const COL_X = {
  inv: M,
  value: M + COLS.inv,
  unit: M + COLS.inv + COLS.value,
  ref: M + COLS.inv + COLS.value + COLS.unit,
  flag: M + COLS.inv + COLS.value + COLS.unit + COLS.ref,
};
const FLAG_W = CW - (COL_X.flag - M);

export function buildLabPrescriptionPdf(d: LabPrescriptionPdfData): Buffer {
  const images = new Map<string, PdfImage>();
  if (d.brandLogo) images.set('ImBrand', d.brandLogo);
  if (d.laboratory.logo) images.set('ImLab', d.laboratory.logo);
  if (d.pathologist.signature) images.set('ImSign', d.pathologist.signature);

  const pages: Page[] = [];
  let p!: Page;
  let y = 0;

  // ---- page header -------------------------------------------------------

  const brandBlock = (top: number, compact: boolean) => {
    const logoH = compact ? 30 : 50;
    let textX = M;
    if (d.brandLogo) {
      const s = containedSize(d.brandLogo, logoH * 1.4, logoH);
      p.image('ImBrand', M, top - s.h, s.w, s.h);
      textX = M + s.w + 8;
    } else {
      // vector mark: teal tile with a white medical cross
      const t = compact ? 24 : 38;
      p.roundRect(M, top - t, t, t, t * 0.22, TEAL);
      const arm = t * 0.18;
      p.rect(M + t / 2 - arm / 2, top - t * 0.78, arm, t * 0.56, WHITE);
      p.rect(M + t * 0.22, top - t / 2 - arm / 2, t * 0.56, arm, WHITE);
      textX = M + t + 8;
    }
    if (compact) {
      p.text(textX, top - 13, 'Tabibistan Healthcare Network', 'B', 10, NAVY);
      p.text(textX, top - 24, 'Powered by Tabibistan Lab Platform', 'I', 7, TEAL_DARK);
      return top - logoH;
    }
    p.text(textX, top - 18, 'Tabibistan', 'B', 17, NAVY);
    p.text(textX + textWidth('Tabibistan ', 'B', 17), top - 18, 'Healthcare Network', 'R', 17, TEAL);
    p.text(textX, top - 31, 'Powered by Tabibistan Lab Platform', 'I', 8, TEAL_DARK);
    p.text(textX, top - 43, 'Diagnostic Network  •  Verified Partner Laboratories', 'R', 7, MUTED);
    return top - logoH;
  };

  const labBlock = (top: number) => {
    const right = PAGE_W - M;
    let textRight = right;
    if (d.laboratory.logo) {
      const s = containedSize(d.laboratory.logo, 40, 40);
      p.image('ImLab', right - s.w, top - s.h, s.w, s.h);
      textRight = right - s.w - 8;
    }
    const width = 230;
    let ty = top - 11;
    for (const line of wrapText(d.laboratory.name || 'Partner Laboratory', 'B', 11, width).slice(0, 2)) {
      p.textRight(textRight, ty, line, 'B', 11, NAVY);
      ty -= 13;
    }
    if (d.laboratory.address) {
      for (const line of wrapText(d.laboratory.address, 'R', 7.5, width).slice(0, 2)) {
        p.textRight(textRight, ty, line, 'R', 7.5, MUTED);
        ty -= 9.5;
      }
    }
    if (d.laboratory.phone) {
      p.textRight(textRight, ty, `Contact: ${d.laboratory.phone}`, 'R', 7.5, MUTED);
      ty -= 9.5;
    }
    if (d.laboratory.licenseNumber) {
      const label = `${d.laboratory.licenseLabel}: `;
      const value = pdfSafe(d.laboratory.licenseNumber);
      const vw = textWidth(value, 'B', 7.5);
      p.textRight(textRight, ty, value, 'B', 7.5, TEXT);
      p.textRight(textRight - vw, ty, label, 'R', 7.5, MUTED);
      ty -= 9.5;
    }
    return ty + 2;
  };

  const tableHeader = () => {
    const h = 22;
    p.rect(M, y - h, CW, h, HEAD_BG);
    p.line(M, y - h, M + CW, y - h, BORDER, 0.75);
    const ty = y - 14;
    p.text(COL_X.inv + 8, ty, 'INVESTIGATION / TEST NAME', 'B', 6.8, HEAD_TEXT, 0.3);
    p.text(COL_X.value + 6, ty, 'OBSERVED VALUE', 'B', 6.8, HEAD_TEXT, 0.3);
    p.text(COL_X.unit + 6, ty, 'UNIT', 'B', 6.8, HEAD_TEXT, 0.3);
    p.text(COL_X.ref + 6, ty, 'BIOLOGICAL REF. INTERVAL', 'B', 6.8, HEAD_TEXT, 0.3);
    p.text(COL_X.flag + 6, ty, 'FLAG', 'B', 6.8, HEAD_TEXT, 0.3);
    y -= h;
  };

  const newPage = (withTableHeader: boolean) => {
    p = new Page();
    pages.push(p);
    if (d.preview) p.watermark('PREVIEW');
    const top = PAGE_H - 26;
    const first = pages.length === 1;
    p.gradient(0, PAGE_H - 4, PAGE_W, 4);

    if (first) {
      const leftBottom = brandBlock(top, false);
      const rightBottom = labBlock(top);
      y = Math.min(leftBottom, rightBottom) - 10;
    } else {
      const leftBottom = brandBlock(top, true);
      p.textRight(PAGE_W - M, top - 12, fit(d.laboratory.name, 'B', 9, 260), 'B', 9, NAVY);
      p.textRight(PAGE_W - M, top - 23, `${pdfSafe(d.patient.name)}  •  Order # ${d.orderNumber}  •  continued`, 'R', 7, MUTED);
      y = leftBottom - 8;
    }
    // brand divider
    p.gradient(M, y - 2, CW, 2);
    y -= 2;
    if (withTableHeader) {
      y -= 12;
      tableHeader();
    }
  };

  /** start a new page when `h` points don't fit */
  const ensure = (h: number, withTableHeader = false) => {
    if (y - h < BOTTOM) newPage(withTableHeader);
  };

  // ---- page 1: title + metadata -----------------------------------------

  newPage(false);
  y -= 18;
  p.text(M, y, 'LABORATORY DIAGNOSTIC REPORT', 'B', 10, TEAL_DARK, 1.2);
  const statusText = d.preview ? 'PREVIEW  •  NOT YET ISSUED' : 'VERIFIED & RELEASED';
  const sw = textWidth(statusText, 'B', 6.5, 0.4) + 14;
  p.roundRect(PAGE_W - M - sw, y - 4, sw, 13, 6.5, d.preview ? FLAG_STYLE.LOW.bg : FLAG_STYLE.NORMAL.bg);
  p.textCenter(PAGE_W - M - sw / 2, y, statusText, 'B', 6.5, d.preview ? FLAG_STYLE.LOW.fg : FLAG_STYLE.NORMAL.fg, 0.4);
  if (d.reportRef) p.textRight(PAGE_W - M - sw - 10, y, `Report Ref: ${d.reportRef}`, 'R', 7, MUTED);
  y -= 12;

  // 2 x 3 boxed grid
  const cellW = CW / 3;
  const cellH = 32;
  const gridTop = y;
  const ageGender =
    [d.patient.age !== null && d.patient.age !== undefined && `${d.patient.age}` !== '' ? `${d.patient.age} Years` : null, d.patient.gender ? titleCase(d.patient.gender) : null]
      .filter(Boolean)
      .join(' / ') || 'Not recorded';
  const cells: [string, string][] = [
    ['PATIENT NAME', d.patient.name || 'Not recorded'],
    ['AGE / GENDER', ageGender],
    ['ORDER #', d.orderNumber],
    ['SAMPLE COLLECTED', d.sampleCollectedDate],
    ['REPORT GENERATED', d.reportDate],
    ['REFERRING PATHOLOGIST / LAB DIRECTOR', d.referringPathologist || 'Not recorded'],
  ];
  p.roundRect(M, gridTop - cellH * 2, CW, cellH * 2, 6, ZEBRA, BORDER, 0.75);
  p.line(M, gridTop - cellH, M + CW, gridTop - cellH, BORDER, 0.75);
  p.line(M + cellW, gridTop, M + cellW, gridTop - cellH * 2, BORDER, 0.75);
  p.line(M + cellW * 2, gridTop, M + cellW * 2, gridTop - cellH * 2, BORDER, 0.75);
  cells.forEach(([label, value], i) => {
    const cx = M + (i % 3) * cellW + 10;
    const cy = gridTop - Math.floor(i / 3) * cellH;
    p.text(cx, cy - 11, fit(label, 'R', 6.3, cellW - 20), 'R', 6.3, MUTED, 0.4);
    p.text(cx, cy - 24, fit(value, 'B', 9, cellW - 20), 'B', 9, i === 2 ? TEAL_DARK : TEXT);
  });
  y = gridTop - cellH * 2 - 22;

  // ---- results ----------------------------------------------------------

  p.text(M, y, 'INVESTIGATION RESULTS', 'B', 9, NAVY, 0.8);
  // legend
  let lx = PAGE_W - M;
  for (const key of ['LOW', 'HIGH', 'NORMAL'] as const) {
    const w = textWidth(key, 'B', 6, 0.3) + 12;
    lx -= w;
    p.roundRect(lx, y - 3, w, 11, 5.5, FLAG_STYLE[key].bg);
    p.textCenter(lx + w / 2, y, key, 'B', 6, FLAG_STYLE[key].fg, 0.3);
    lx -= 5;
  }
  y -= 10;
  tableHeader();

  // group consecutive rows of the same test
  const rows = (d.testResults ?? []).filter((r) => (r.parameter || r.testName || r.result || '').trim());
  const groups: { title: string; items: LabResultParameter[] }[] = [];
  for (const r of rows) {
    const title = (r.testName || '').trim();
    const last = groups[groups.length - 1];
    if (last && last.title.toLowerCase() === title.toLowerCase()) last.items.push(r);
    else groups.push({ title, items: [r] });
  }

  if (groups.length === 0) {
    ensure(28, true);
    p.text(M + 8, y - 17, 'No result parameters were recorded for this order.', 'I', 8, MUTED);
    y -= 28;
  }

  let zebra = 0;
  const measureRow = (label: string, r: LabResultParameter, indent: number) => {
    const invLines = wrapText(label || '-', 'B', 8, COLS.inv - 14 - indent).slice(0, 3);
    const refLines = wrapText(r.referenceRange?.trim() || '-', 'R', 7.5, COLS.ref - 12).slice(0, 3);
    const valLines = wrapText(r.result?.trim() || '-', 'B', 8.5, COLS.value - 16).slice(0, 2);
    const unitLines = wrapText(r.unit?.trim() || '-', 'R', 7.5, COLS.unit - 10).slice(0, 2);
    const lines = Math.max(invLines.length, refLines.length, valLines.length, unitLines.length);
    return { invLines, refLines, valLines, unitLines, h: Math.max(20, lines * 10 + 10) };
  };

  /** test title row (repeated with "continued" when the test runs onto a new page) */
  let groupTitle: string | null = null;
  const drawGroupTitle = (title: string) => {
    p.rect(M, y - 18, CW, 18, TEAL_SOFT);
    p.rect(M, y - 18, 2.5, 18, TEAL);
    p.line(M, y - 18, M + CW, y - 18, BORDER, 0.5);
    p.text(COL_X.inv + 10, y - 12, fit(title, 'B', 8.5, CW - 24), 'B', 8.5, TEAL_DARK);
    y -= 18;
    zebra = 0;
  };

  const drawRow = (label: string, r: LabResultParameter, indent: number) => {
    const m = measureRow(label, r, indent);
    if (y - m.h < BOTTOM) {
      newPage(true);
      if (groupTitle) drawGroupTitle(`${groupTitle} (continued)`);
    }
    const top = y;
    if (zebra++ % 2 === 1) p.rect(M, top - m.h, CW, m.h, ZEBRA);
    p.line(M, top - m.h, M + CW, top - m.h, BORDER, 0.5);
    const firstBase = top - 12.5;

    m.invLines.forEach((l, i) => p.text(COL_X.inv + 8 + indent, firstBase - i * 10, l, 'B', 8, TEXT));

    const key = flagKey(r.flag);
    const abnormal = key === 'HIGH' || key === 'LOW' || key === 'CRITICAL';
    if (abnormal) {
      const style = FLAG_STYLE[key];
      const bw = Math.max(...m.valLines.map((l) => textWidth(l, 'B', 8.5))) + 10;
      const bh = m.valLines.length * 10 + 5;
      p.roundRect(COL_X.value + 4, firstBase - (m.valLines.length - 1) * 10 - 4, bw, bh, 3.5, key === 'CRITICAL' ? FLAG_STYLE.HIGH.bg : style.bg);
      m.valLines.forEach((l, i) => p.text(COL_X.value + 9, firstBase - i * 10, l, 'B', 8.5, key === 'CRITICAL' ? FLAG_STYLE.CRITICAL.bg : style.fg));
    } else {
      m.valLines.forEach((l, i) => p.text(COL_X.value + 6, firstBase - i * 10, l, 'B', 8.5, TEXT));
    }

    m.unitLines.forEach((l, i) => p.text(COL_X.unit + 6, firstBase - i * 10, l, 'R', 7.5, MUTED));
    m.refLines.forEach((l, i) => p.text(COL_X.ref + 6, firstBase - i * 10, l, 'R', 7.5, HEAD_TEXT));

    if (key) {
      const label2 = key === 'OTHER' ? fit((r.flag ?? '').trim().toUpperCase(), 'B', 6.5, FLAG_W - 26) : key;
      const style = FLAG_STYLE[key];
      const fw = textWidth(label2, 'B', 6.5, 0.3) + 14;
      p.roundRect(COL_X.flag + 6, firstBase - 3.5, fw, 12, 6, style.bg);
      p.textCenter(COL_X.flag + 6 + fw / 2, firstBase, label2, 'B', 6.5, style.fg, 0.3);
    } else {
      p.text(COL_X.flag + 8, firstBase, '-', 'R', 8, MUTED);
    }
    y -= m.h;
  };

  for (const g of groups) {
    const single = g.items.length === 1 && (!g.items[0].parameter?.trim() || g.items[0].parameter.trim().toLowerCase() === g.title.toLowerCase());
    if (single || !g.title) {
      groupTitle = null;
      for (const r of g.items) drawRow(r.parameter?.trim() || g.title || '-', r, 0);
      continue;
    }
    // test title row + its parameters (keep the title with the first parameter)
    const firstH = measureRow(g.items[0].parameter, g.items[0], 10).h;
    ensure(18 + firstH, true);
    drawGroupTitle(g.title);
    groupTitle = g.title;
    for (const r of g.items) drawRow(r.parameter?.trim() || g.title, r, 10);
    groupTitle = null;
  }
  p.line(M, y, M + CW, y, BORDER, 1);

  // ---- remarks / advice -------------------------------------------------

  const noteBox = (title: string, body: string, bullet: boolean) => {
    // advice: one bullet per line the lab typed
    const lines = bullet
      ? body
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
          .flatMap((par) => wrapText(par, 'R', 8, CW - 40).map((l, i) => (i === 0 ? `•  ${l}` : `    ${l}`)))
      : wrapText(body, 'R', 8, CW - 28);
    const lineH = 11;
    // a box that doesn't fit is split over pages, line by line
    let i = 0;
    let firstChunk = true;
    while (i < lines.length) {
      ensure(firstChunk ? 52 : 30);
      if (firstChunk) {
        y -= 20;
        p.text(M, y, title, 'B', 8.5, NAVY, 0.6);
        y -= 8;
      } else y -= 6;
      const room = Math.max(1, Math.floor((y - BOTTOM - 14) / lineH));
      const chunk = lines.slice(i, i + room);
      const h = chunk.length * lineH + 14;
      p.roundRect(M, y - h, CW, h, 5, bullet ? WHITE : ZEBRA, BORDER, 0.75);
      if (!bullet) p.rect(M, y - h + 5, 2.5, h - 10, TEAL);
      chunk.forEach((l, k) => p.text(M + 14, y - 15 - k * lineH, l, 'R', 8, TEXT));
      y -= h;
      i += chunk.length;
      firstChunk = false;
    }
  };

  noteBox(
    'PATHOLOGIST REMARKS / CLINICAL INTERPRETATION',
    d.remarks?.trim() || 'No additional remarks. Results should be interpreted in correlation with the clinical findings.',
    false,
  );
  if (d.instructions?.trim()) noteBox('ADVICE & INSTRUCTIONS', d.instructions.trim(), true);

  // ---- sign-off: barcode + signature ------------------------------------

  ensure(118);
  y -= 16;
  p.textCenter(PAGE_W / 2, y, '— End of Report —', 'I', 7.5, MUTED);
  y -= 10;
  const blockTop = y;

  // barcode (left)
  const modules = code128Modules(d.orderNumber);
  const unit = Math.min(1, 190 / code128Width(modules));
  const barH = 30;
  let bx = M + 10 * unit;
  const by = blockTop - 14 - barH;
  p.text(M, blockTop - 8, 'DIGITAL REPORT VERIFICATION', 'B', 6.5, MUTED, 0.5);
  modules.forEach((wMod, i) => {
    if (i % 2 === 0) p.rect(bx, by, wMod * unit, barH, NAVY);
    bx += wMod * unit;
  });
  const barcodeW = code128Width(modules) * unit;
  p.textCenter(M + barcodeW / 2, by - 10, d.orderNumber, 'B', 7.5, TEXT, 1);
  p.text(M, by - 22, 'Scan the barcode or quote the order number to match', 'I', 6.5, MUTED);
  p.text(M, by - 30, 'this report with its Tabibistan order record.', 'I', 6.5, MUTED);

  // signature (right)
  const sigW = 200;
  const sigX = PAGE_W - M - sigW;
  const sigCx = sigX + sigW / 2;
  const sigAreaTop = blockTop - 4;
  const sigAreaH = 44;
  if (d.pathologist.signature) {
    const s = containedSize(d.pathologist.signature, 170, sigAreaH);
    p.image('ImSign', sigCx - s.w / 2, sigAreaTop - sigAreaH + (sigAreaH - s.h) / 2, s.w, s.h);
  } else {
    p.roundRect(sigCx - 80, sigAreaTop - sigAreaH, 160, sigAreaH, 6, undefined, [148, 163, 184], 0.75, '3 2');
    p.textCenter(sigCx, sigAreaTop - sigAreaH / 2 - 3, 'Digital Signature / Lab Stamp', 'I', 7.5, MUTED);
  }
  const lineY = sigAreaTop - sigAreaH - 6;
  p.line(sigX + 10, lineY, sigX + sigW - 10, lineY, NAVY, 0.8);
  p.textCenter(sigCx, lineY - 12, fit(d.pathologist.name || 'Consultant Pathologist', 'B', 9, sigW), 'B', 9, NAVY);
  p.textCenter(sigCx, lineY - 23, fit(d.pathologist.designation || 'Consultant Pathologist', 'R', 7.5, sigW), 'R', 7.5, MUTED);
  p.textCenter(sigCx, lineY - 33, fit(d.laboratory.name, 'I', 7, sigW), 'I', 7, MUTED);
  y = Math.min(by - 30, lineY - 33) - 6;

  // ---- footers (need the page count) ------------------------------------

  pages.forEach((pg, i) => {
    pg.line(M, 46, PAGE_W - M, 46, BORDER, 0.75);
    pg.text(M, 34, 'This is an electronically generated diagnostic report issued via Tabibistan Diagnostic Network.', 'I', 7, MUTED);
    pg.textRight(PAGE_W - M, 34, `Page ${i + 1} of ${pages.length}`, 'R', 7, MUTED);
    pg.text(
      M,
      24,
      d.preview
        ? 'Preview copy for review by the laboratory. Not valid for diagnosis until the report is issued.'
        : `Order # ${d.orderNumber}  •  ${pdfSafe(d.laboratory.name)}  •  Results relate only to the sample tested.`,
      'R',
      6.5,
      d.preview ? FLAG_STYLE.LOW.fg : MUTED,
    );
    pg.gradient(0, 0, PAGE_W, 6);
  });

  return assemblePdf(pages, images, `Lab Report - ${d.orderNumber}`);
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s|-)\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// File assembly
// ---------------------------------------------------------------------------

function assemblePdf(pages: Page[], images: Map<string, PdfImage>, title: string): Buffer {
  const objects: Buffer[] = [];
  const reserve = () => {
    objects.push(Buffer.alloc(0));
    return objects.length;
  };
  const set = (id: number, body: string | Buffer[]) => {
    objects[id - 1] = typeof body === 'string' ? Buffer.from(body, 'latin1') : Buffer.concat(body);
  };
  const stream = (dict: string, data: Buffer) => [Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')];

  const catalog = reserve();
  const pagesId = reserve();
  const fontR = reserve();
  const fontB = reserve();
  const fontI = reserve();
  set(catalog, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  set(fontR, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  set(fontB, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  set(fontI, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  const imageIds = new Map<string, number>();
  for (const [name, img] of images) {
    let smask = '';
    if (img.alpha) {
      const sid = reserve();
      set(sid, stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, img.alpha));
      smask = ` /SMask ${sid} 0 R`;
    }
    const id = reserve();
    set(
      id,
      stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /${img.colorSpace} /BitsPerComponent 8 /Filter /${img.filter}${smask}`, img.data),
    );
    imageIds.set(name, id);
  }

  const pageIds: number[] = [];
  for (const pg of pages) {
    const content = reserve();
    set(content, stream('/Filter /FlateDecode', deflateSync(Buffer.from(pg.ops.join('\n'), 'latin1'))));
    const xobjects = [...pg.images].filter((n) => imageIds.has(n)).map((n) => `/${n} ${imageIds.get(n)} 0 R`);
    const id = reserve();
    set(
      id,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Contents ${content} 0 R ` +
        `/Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R /F3 ${fontI} 0 R >>${xobjects.length ? ` /XObject << ${xobjects.join(' ')} >>` : ''} >> >>`,
    );
    pageIds.push(id);
  }
  set(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const info = reserve();
  set(info, `<< /Title ${pdfString(pdfSafe(title))} /Producer (Tabibistan Lab Platform) /Creator (Tabibistan Diagnostic Network) >>`);

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let length = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(length);
    const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
    const tail = Buffer.from('\nendobj\n', 'latin1');
    chunks.push(head, body, tail);
    length += head.length + body.length + tail.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(chunks);
}
