import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const IMAGES = join(import.meta.dirname, "..", "public", "images");

const jobs = [
  ...["photography", "reading", "gaming", "hiking", "music", "nature1"].map((name) => ({
    input: `${name}.jpg`,
    output: `${name}-600w.webp`,
    run: (img) => img.resize({ width: 600, withoutEnlargement: true }).webp({ quality: 76 }),
  })),
  {
    input: "anime.jpg",
    output: "anime-480w.webp",
    run: (img) => img.resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80 }),
  },
  {
    input: "ianface.png",
    output: "ianface-480w.webp",
    run: (img) => img.resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80 }),
  },
  {
    input: "anime.jpg",
    output: "anime-avatar-64.webp",
    run: (img) => img.resize(64, 64, { fit: "cover" }).webp({ quality: 80 }),
  },
  {
    input: "anime.jpg",
    output: "favicon-32.png",
    run: (img) => img.resize(32, 32, { fit: "cover" }).png(),
  },
  {
    input: "anime.jpg",
    output: "apple-touch-icon-180.png",
    run: (img) => img.resize(180, 180, { fit: "cover" }).png(),
  },
];

for (const job of jobs) {
  const inputPath = join(IMAGES, job.input);
  const outputPath = join(IMAGES, job.output);
  if (job.output === job.input) throw new Error(`refusing to overwrite original ${job.input}`);
  if (existsSync(outputPath)) {
    console.log(`skip   ${job.output} (already exists)`);
    continue;
  }
  /* The original-size sources (`job.input`) were removed from the repo once the
     site shipped only the generated copies below -- they are still in git
     history if a rebuild is ever wanted. Skip instead of throwing when one is
     absent, so running this stays a safe no-op. */
  if (!existsSync(inputPath)) {
    console.log(`skip   ${job.output} (no source ${job.input})`);
    continue;
  }
  const info = await job.run(sharp(inputPath)).toFile(outputPath);
  console.log(`wrote  ${job.output}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
