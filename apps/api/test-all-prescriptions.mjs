import 'dotenv/config';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';

async function scanAll() {
  const dir = './uploads/prescriptions';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

  console.log(`Scanning ${files.length} prescription files...`);
  const worker = await createWorker('eng');

  const distinctTexts = new Set();

  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const ret = await worker.recognize(fullPath);
      const text = (ret.data.text || '').trim();
      if (text.length > 20 && !distinctTexts.has(text.slice(0, 50))) {
        distinctTexts.add(text.slice(0, 50));
        console.log(`\n================== FILE: ${file} ==================`);
        console.log(text);
      }
    } catch (e) {
      // skip
    }
  }

  await worker.terminate();
}

scanAll().catch(console.error);
