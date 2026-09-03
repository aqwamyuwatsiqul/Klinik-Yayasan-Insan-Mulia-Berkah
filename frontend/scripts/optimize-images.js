import sharp from 'sharp';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.join(__dirname, '../public');

const MAX_WIDTH = 800;

async function run() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`Tidak ada folder ${SRC_DIR} — lewati optimasi gambar.`);
    return;
  }

  const files = await glob('**/*.{png,jpg,jpeg}', { cwd: SRC_DIR });

  for (const file of files) {
    const srcPath  = path.join(SRC_DIR, file);
    const baseName = path.basename(file, path.extname(file));

    const img      = sharp(srcPath);
    const meta     = await img.metadata();
    const width    = Math.min(meta.width, MAX_WIDTH);

    await img.clone().resize(width).webp({ quality: 85 })
      .toFile(path.join(OUT_DIR, `${baseName}.webp`));

    await img.clone().resize(width).png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `${baseName}-fallback.png`));

    console.log(`✓ ${file} → ${baseName}.webp + ${baseName}-fallback.png (max ${width}px)`);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
