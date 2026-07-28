// Generates the PWA app icons from an inline SVG (torii gate on primary teal).
// Re-run with `node scripts/generate-icons.mjs` after changing the design.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const PRIMARY = "#0f9c8f";

function torii({ scale = 1, offsetY = 0 } = {}) {
  // Torii silhouette centered in a 512x512 box, scaled/offset for safe-zone padding.
  const cx = 256;
  const cy = 256 + offsetY;
  const s = scale;
  return `
    <g transform="translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})">
      <rect x="96" y="140" width="320" height="34" rx="10" fill="white" />
      <rect x="106" y="182" width="300" height="18" rx="6" fill="white" />
      <rect x="150" y="200" width="26" height="220" rx="4" fill="white" />
      <rect x="336" y="200" width="26" height="220" rx="4" fill="white" />
      <rect x="140" y="270" width="232" height="20" rx="6" fill="white" />
    </g>
  `;
}

function iconSvg({ rounded }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="96" fill="${PRIMARY}" />`
    : `<rect width="512" height="512" fill="${PRIMARY}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${torii()}</svg>`;
}

function maskableSvg() {
  // Maskable icons get cropped to a circle/rounded-square by the OS, so keep
  // the artwork inside the ~80% safe zone.
  const bg = `<rect width="512" height="512" fill="${PRIMARY}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${torii({ scale: 0.7 })}</svg>`;
}

const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", svg: iconSvg({ rounded: true }), size: 192 },
  { name: "icon-512.png", svg: iconSvg({ rounded: true }), size: 512 },
  { name: "icon-maskable-512.png", svg: maskableSvg(), size: 512 },
  { name: "apple-touch-icon.png", svg: iconSvg({ rounded: false }), size: 180 },
];

for (const { name, svg, size } of targets) {
  const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(new URL(name, outDir), buffer);
  console.log(`wrote public/icons/${name}`);
}
