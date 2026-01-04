import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const srcPath = path.resolve(process.cwd(), 'client/public/swasthyatrack-logo.jpeg');
    if (!fs.existsSync(srcPath)) {
      console.error('Source file not found:', srcPath);
      process.exit(1);
    }

    const image = await Jimp.read(srcPath);

    const outDir = path.resolve(process.cwd(), 'client/public');
    const sizes = [48, 256, 512];

    for (const size of sizes) {
      const outPath = path.join(outDir, `logo-swasthya-${size}.png`);
      const clone = image.clone();

      // Create a square canvas of requested size with white background, then contain the image centered
      const canvas = new Jimp(size, size, 0xffffffff);
      clone.contain(size, size, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
      canvas.composite(clone, 0, 0);

      await canvas.writeAsync(outPath);
      console.log('Wrote', outPath);
    }

    // Also write a full-size PNG fallback
    const fallbackPath = path.join(outDir, 'logo-swasthya.png');
    await image.writeAsync(fallbackPath);
    console.log('Wrote', fallbackPath);

    process.exit(0);
  } catch (err) {
    console.error('Error generating logos:', err);
    process.exit(1);
  }
})();
