// Generates PWA icons from an inline SVG. Run: bun scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1F3F86"/>
      <stop offset="1" stop-color="#10204C"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E9C56B"/>
      <stop offset="1" stop-color="#C79A38"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="392" cy="118" r="190" fill="#E9C56B" opacity="0.10"/>
  <g transform="translate(52,46) scale(6)">
    <path d="M11 48 Q32 64 53 48" stroke="url(#gold)" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.9"/>
    <g fill="url(#gold)">
      <path d="M40 33 C 50 37, 57 46, 60 56 C 55 47, 47 40, 39 36 Z"/>
      <path d="M40 35 C 48 41, 53 50, 53 60 C 49 51, 43 43, 38 38 Z"/>
      <path d="M38 37 C 43 43, 46 52, 44 61 C 42 53, 39 45, 36 40 Z"/>
      <path d="M25 23 C 31 15, 40 15, 45 21 C 38 23, 31 25, 27 29 Z"/>
      <ellipse cx="30" cy="31" rx="12.5" ry="6.2" transform="rotate(-25 30 31)"/>
      <circle cx="18.5" cy="23.5" r="4.4"/>
      <path d="M8.5 22.5 L 16 21 L 16 25.5 Z"/>
      <path d="M20 18.5 C 19 12.5, 22 8, 27.5 6 C 23.5 10, 23.5 14.5, 22.5 19.5 Z"/>
      <path d="M23.5 18.5 C 23.5 13, 26.5 9, 31 8 C 27.5 11.5, 27 15.5, 26.5 19.5 Z"/>
    </g>
    <circle cx="17.6" cy="23" r="1.1" fill="#10204C"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon.svg", svg);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const buf = Buffer.from(svg);

for (const s of sizes) {
  await sharp(buf).resize(s, s).png().toFile(`public/icons/icon-${s}.png`);
}
// maskable (full-bleed, same artwork keeps glyph in safe zone)
await sharp(buf).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(buf).resize(192, 192).png().toFile("public/icons/maskable-192.png");
// apple touch + favicon
await sharp(buf).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(buf).resize(32, 32).png().toFile("public/favicon.png");
await sharp(buf).resize(16, 16).png().toFile("public/favicon-16.png");
// favicon.ico (PNG payload; browsers sniff content) to avoid /favicon.ico 404
await sharp(buf).resize(32, 32).png().toFile("public/favicon.ico");

console.log("icons generated");
