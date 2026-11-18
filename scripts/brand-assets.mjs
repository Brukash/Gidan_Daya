// Turns the supplied cooperative seal into transparent PNGs for the app.
//   node scripts/brand-assets.mjs <source-image>
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? '.cloud-attachments/c2dd34f5b4a22e6d77d19194a176e93618abb6887a4d51ef2b062b65f13c0a2a.webp';
const bytes = await readFile(source);
const mime = source.endsWith('.webp') ? 'image/webp' : 'image/png';
const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;

await mkdir('public/brand', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();

  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };

  // The supplied seal already has a transparent background, so trim to the
  // pixels that actually carry the mark and keep the original soft edge.
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (at(x, y)[3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const side = Math.max(maxX - minX + 1, maxY - minY + 1);
  const cx = (minX + maxX + 1) / 2;
  const cy = (minY + maxY + 1) / 2;

  const sizes = [512, 192, 180, 64, 32];
  const rendered = {};

  for (const size of sizes) {
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const target = out.getContext('2d');
    target.imageSmoothingEnabled = true;
    target.imageSmoothingQuality = 'high';
    target.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
    rendered[size] = out.toDataURL('image/png');
  }

  return {
    width,
    height,
    bounds: { minX, minY, maxX, maxY },
    side,
    corners: [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)],
    rendered,
  };
}, dataUrl);

for (const [size, url] of Object.entries(result.rendered)) {
  const file = `public/brand/coop-seal-${size}.png`;
  await writeFile(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`wrote ${file}`);
}

console.log('source:', result.width, 'x', result.height);
console.log('seal bounds:', result.bounds, 'side', result.side);
console.log('corner pixels:', result.corners.map((c) => c.join(',')).join(' | '));

await browser.close();
