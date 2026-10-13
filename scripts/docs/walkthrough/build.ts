import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { DOC, OUTPUT_BASENAME } from '../../../docs/product-walkthrough/content';
import { renderDocument } from './render';

/**
 * Builds `docs/product-walkthrough/<basename>.html` (self-contained, images
 * inlined as JPEG data URIs) and the matching A4 PDF.
 *
 *   npx tsx scripts/docs/walkthrough/build.ts            # html + pdf
 *   npx tsx scripts/docs/walkthrough/build.ts --no-pdf   # html only (fast preview)
 *
 * Inputs: JPEG shots written straight by the capture spec into `shots/`
 * (JPEG, not WebP: Chromium embeds JPEG streams in a PDF as-is, while WebP
 * gets decoded to raw bitmaps and the PDF balloons 5×). Runs on any OS.
 */

const ROOT = path.resolve(__dirname, '../../..');
const DOC_DIR = path.join(ROOT, 'docs/product-walkthrough');
const SHOTS = path.join(DOC_DIR, 'shots');

function shotPath(id: string): string | null {
  const jpg = path.join(SHOTS, `${id}.jpg`);
  return fs.existsSync(jpg) ? jpg : null;
}

function collectShotIds(): string[] {
  const ids = new Set<string>();
  for (const chapter of DOC.chapters) {
    for (const block of chapter.blocks) {
      if (block.kind === 'screens' || block.kind === 'wide')
        block.items.forEach((s) => ids.add(s.shot));
    }
  }
  return [...ids];
}

function main(): void {
  const missing: string[] = [];
  const dataUri = new Map<string, string>();
  for (const id of collectShotIds()) {
    const file = shotPath(id);
    if (!file) {
      missing.push(id);
      continue;
    }
    dataUri.set(id, `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`);
  }
  if (missing.length > 0)
    console.warn(`⚠️  ${missing.length} shots missing (grey box in output): ${missing.join(', ')}`);

  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844"><rect width="100%" height="100%" fill="#eee8da"/></svg>'
    );
  const html = renderDocument(DOC, (id) => dataUri.get(id) ?? placeholder);
  const htmlPath = path.join(DOC_DIR, `${OUTPUT_BASENAME}.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ ${path.relative(ROOT, htmlPath)} (${(html.length / 1e6).toFixed(1)} MB)`);

  if (process.argv.includes('--no-pdf')) return;
  void toPdf(htmlPath, path.join(DOC_DIR, `${OUTPUT_BASENAME}.pdf`));
}

async function toPdf(htmlPath: string, pdfPath: string): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(
    `✓ ${path.relative(ROOT, pdfPath)} (${(fs.statSync(pdfPath).size / 1e6).toFixed(1)} MB)`
  );
}

main();
