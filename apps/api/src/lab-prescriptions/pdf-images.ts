// Turns PNG / JPEG files into PDF image XObjects for the lab report (no external libraries).
// PNG: decoded with zlib (8 / 16-bit, gray, RGB, palette, with or without alpha;
// non-interlaced), optionally scaled down, then stored as FlateDecode RGB + an
// alpha soft mask. JPEG: embedded as-is (DCTDecode).

import { readFile } from 'node:fs/promises';
import { isAbsolute, join, normalize, relative } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

export interface PdfImage {
  width: number;
  height: number;
  /** 'DeviceRGB' | 'DeviceGray' */
  colorSpace: 'DeviceRGB' | 'DeviceGray';
  filter: 'FlateDecode' | 'DCTDecode';
  data: Buffer;
  /** 8-bit alpha channel, FlateDecode, same size (PNG only) */
  alpha?: Buffer;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Reads a PNG or JPEG from disk; null when missing or not a supported image. */
export async function loadPdfImage(filePath: string, maxSide = 900): Promise<PdfImage | null> {
  try {
    return decodePdfImage(await readFile(filePath), maxSide);
  } catch {
    return null;
  }
}

/**
 * "/uploads/lab-signatures/x.png" -> absolute path inside <cwd>/uploads, or null
 * for anything outside it (remote URLs, "../" tricks).
 */
export function uploadsPathOf(url: string | null | undefined, uploadRoot: string): string | null {
  if (!url) return null;
  const clean = url.split(/[?#]/)[0];
  if (!clean.startsWith('/uploads/')) return null;
  const full = normalize(join(uploadRoot, decodeURIComponent(clean.slice('/uploads/'.length))));
  const rel = relative(uploadRoot, full);
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? full : null;
}

export function decodePdfImage(buf: Buffer, maxSide = 900): PdfImage | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIG)) return decodePng(buf, maxSide);
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return readJpeg(buf);
  return null;
}

// ---------------------------------------------------------------------------
// JPEG: only the size and colour components are needed
// ---------------------------------------------------------------------------

function readJpeg(buf: Buffer): PdfImage | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      const comps = buf[i + 9];
      if (comps !== 1 && comps !== 3) return null; // CMYK JPEGs are not supported
      return { width, height, colorSpace: comps === 1 ? 'DeviceGray' : 'DeviceRGB', filter: 'DCTDecode', data: buf };
    }
    i += 2 + len;
  }
  return null;
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

function decodePng(buf: Buffer, maxSide: number): PdfImage | null {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!width || !height || interlace !== 0 || width * height > 25_000_000) return null;

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType as 0 | 2 | 3 | 4 | 6];
  if (!channels || ![1, 2, 4, 8, 16].includes(bitDepth)) return null;
  if (colorType === 3 && !palette) return null;

  const raw = inflateSync(Buffer.concat(idat));
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3); // bytes per complete pixel (for filters)
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  if (raw.length < height * (stride + 1)) return null;

  // Undo the per-scanline filters
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const left = x >= bpp ? pixels[dst + x - bpp] : 0;
      const up = y > 0 ? pixels[dst - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? pixels[dst - stride + x - bpp] : 0;
      let out: number;
      switch (filter) {
        case 0:
          out = v;
          break;
        case 1:
          out = v + left;
          break;
        case 2:
          out = v + up;
          break;
        case 3:
          out = v + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          out = v + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          return null;
      }
      pixels[dst + x] = out & 0xff;
    }
  }

  // Expand to 8-bit RGB + alpha
  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height, 255);
  let hasAlpha = colorType === 4 || colorType === 6;
  const sample = (row: number, index: number): number => {
    // index-th sample of the row, scaled to 0..255 (palette indexes are returned raw)
    if (bitDepth === 8) return pixels[row * stride + index];
    if (bitDepth === 16) return pixels[row * stride + index * 2];
    const bitPos = index * bitDepth;
    const byte = pixels[row * stride + (bitPos >> 3)];
    const v = (byte >> (8 - bitDepth - (bitPos & 7))) & ((1 << bitDepth) - 1);
    return colorType === 3 ? v : Math.round((v * 255) / ((1 << bitDepth) - 1));
  };
  const trnsGray = trns && colorType === 0 && trns.length >= 2 ? trns.readUInt16BE(0) : null;
  const trnsRgb = trns && colorType === 2 && trns.length >= 6 ? [trns.readUInt16BE(0), trns.readUInt16BE(2), trns.readUInt16BE(4)] : null;
  const scaleTrns = (v: number) => (bitDepth === 16 ? v >> 8 : bitDepth === 8 ? v : Math.round((v * 255) / ((1 << bitDepth) - 1)));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * width + x;
      let r: number;
      let g: number;
      let b: number;
      let a = 255;
      if (colorType === 0) {
        r = g = b = sample(y, x);
        if (trnsGray !== null && r === scaleTrns(trnsGray)) a = 0;
      } else if (colorType === 2) {
        r = sample(y, x * 3);
        g = sample(y, x * 3 + 1);
        b = sample(y, x * 3 + 2);
        if (trnsRgb && r === scaleTrns(trnsRgb[0]) && g === scaleTrns(trnsRgb[1]) && b === scaleTrns(trnsRgb[2])) a = 0;
      } else if (colorType === 3) {
        const idx = sample(y, x);
        r = palette![idx * 3] ?? 0;
        g = palette![idx * 3 + 1] ?? 0;
        b = palette![idx * 3 + 2] ?? 0;
        if (trns && idx < trns.length) a = trns[idx];
      } else if (colorType === 4) {
        r = g = b = sample(y, x * 2);
        a = sample(y, x * 2 + 1);
      } else {
        r = sample(y, x * 4);
        g = sample(y, x * 4 + 1);
        b = sample(y, x * 4 + 2);
        a = sample(y, x * 4 + 3);
      }
      rgb[o * 3] = r;
      rgb[o * 3 + 1] = g;
      rgb[o * 3 + 2] = b;
      alpha[o] = a;
      if (a !== 255) hasAlpha = true;
    }
  }

  // Scale down large images (box filter) to keep report files small
  let w = width;
  let h = height;
  let outRgb = rgb;
  let outAlpha = alpha;
  const factor = Math.max(width, height) / maxSide;
  if (factor > 1) {
    w = Math.max(1, Math.round(width / factor));
    h = Math.max(1, Math.round(height / factor));
    outRgb = Buffer.alloc(w * h * 3);
    outAlpha = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor((y * height) / h);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / h));
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor((x * width) / w);
        const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / w));
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sa = 0;
        let n = 0;
        for (let yy = y0; yy < y1; yy++) {
          for (let xx = x0; xx < x1; xx++) {
            const o = yy * width + xx;
            const av = alpha[o];
            // alpha-weighted colour so transparent edges don't darken
            sr += rgb[o * 3] * av;
            sg += rgb[o * 3 + 1] * av;
            sb += rgb[o * 3 + 2] * av;
            sa += av;
            n++;
          }
        }
        const o = y * w + x;
        outRgb[o * 3] = sa ? Math.round(sr / sa) : 255;
        outRgb[o * 3 + 1] = sa ? Math.round(sg / sa) : 255;
        outRgb[o * 3 + 2] = sa ? Math.round(sb / sa) : 255;
        outAlpha[o] = Math.round(sa / n);
      }
    }
  }

  return {
    width: w,
    height: h,
    colorSpace: 'DeviceRGB',
    filter: 'FlateDecode',
    data: deflateSync(outRgb),
    alpha: hasAlpha ? deflateSync(outAlpha) : undefined,
  };
}
