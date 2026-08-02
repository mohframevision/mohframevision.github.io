// أداة لمرة واحدة لتوليد طقم الفافيكون الكامل من favicon.svg.
// sharp مش من ضمن devDependencies (تُستخدم فقط عند الحاجة لإعادة توليد الصور):
//   npm install sharp --no-save && node scripts/generate-icons.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");

async function main() {
  const favicon = fs.readFileSync(path.join(root, "favicon.svg"));

  const jobs = [
    { size: 32, out: "favicon-32x32.png" },
    { size: 16, out: "favicon-16x16.png" },
    { size: 180, out: "apple-touch-icon.png" },
    { size: 192, out: "android-chrome-192x192.png" },
    { size: 512, out: "android-chrome-512x512.png" },
  ];

  for (const job of jobs) {
    await sharp(favicon, { density: 384 })
      .resize(job.size, job.size)
      .png()
      .toFile(path.join(root, job.out));
    console.log("wrote", job.out);
  }

  const png16 = fs.readFileSync(path.join(root, "favicon-16x16.png"));
  const png32 = fs.readFileSync(path.join(root, "favicon-32x32.png"));
  const images = [
    { size: 16, data: png16 },
    { size: 32, data: png32 },
  ];

  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entries.push(entry);
  }

  const ico = Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
  fs.writeFileSync(path.join(root, "favicon.ico"), ico);
  console.log("wrote favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
