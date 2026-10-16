// Zero-dependency PNG icon generator for VoiceOS.
//
// Draws a simple "equalizer bars" mark on a solid dark background and
// encodes it as a real PNG using only Node's built-in zlib module (no image
// libraries). Produces the full icon set required by manifest.json and iOS
// "Add to Home Screen".
//
// Run with: node scripts/generate-icons.mjs
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

// --- minimal PNG encoder -----------------------------------------------
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgbaPixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // Raw scanlines: 1 filter-type byte (0 = none) + width*4 RGBA bytes per row
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    rgbaPixels.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });
  const idat = chunk("IDAT", idatData);

  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// --- icon drawing --------------------------------------------------------
function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);

  const topColor = hexToRgb("#1b1b2e");
  const botColor = hexToRgb("#0a0a0b");
  const barColor = hexToRgb("#5b8cff");
  const barColor2 = hexToRgb("#8b5bff");

  // Background: vertical gradient, full bleed (safe for maskable icons).
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(lerp(topColor[0], botColor[0], t));
    const g = Math.round(lerp(topColor[1], botColor[1], t));
    const b = Math.round(lerp(topColor[2], botColor[2], t));
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  // Equalizer bars, centered. Keep within ~55% safe zone for maskable icons.
  const safe = maskable ? 0.5 : 0.62;
  const contentSize = size * safe;
  const contentLeft = (size - contentSize) / 2;
  const contentTop = (size - contentSize) / 2;

  const bars = [0.42, 0.68, 1.0, 0.68, 0.42];
  const gap = contentSize * 0.08;
  const barWidth = (contentSize - gap * (bars.length - 1)) / bars.length;
  const capRadius = Math.min(barWidth / 2, barWidth * 0.4);

  for (let bi = 0; bi < bars.length; bi++) {
    const barHeight = contentSize * bars[bi];
    const x0 = contentLeft + bi * (barWidth + gap);
    const x1 = x0 + barWidth;
    const y1 = contentTop + contentSize; // baseline (bottom-aligned)
    const y0 = y1 - barHeight;
    const color = bi % 2 === 0 ? barColor : barColor2;
    const cx0 = x0 + capRadius;
    const cx1 = x1 - capRadius;

    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        if (x < 0 || x >= size || y < 0 || y >= size) continue;

        // Round only the top cap of each bar (bottom sits flush on baseline).
        let visible = true;
        if (y - y0 < capRadius) {
          const px = x + 0.5;
          const py = y + 0.5;
          if (px < cx0 && py < y0 + capRadius) {
            const dx = px - cx0;
            const dy = py - (y0 + capRadius);
            if (dx * dx + dy * dy > capRadius * capRadius) visible = false;
          } else if (px > cx1 && py < y0 + capRadius) {
            const dx = px - cx1;
            const dy = py - (y0 + capRadius);
            if (dx * dx + dy * dy > capRadius * capRadius) visible = false;
          }
        }
        if (!visible) continue;

        const i = (y * size + x) * 4;
        buf[i] = color[0];
        buf[i + 1] = color[1];
        buf[i + 2] = color[2];
        buf[i + 3] = 255;
      }
    }
  }

  return buf;
}

const sizes = [
  { name: "icon-32.png", size: 32 },
  { name: "icon-180.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-192-maskable.png", size: 192, maskable: true },
  { name: "icon-512.png", size: 512 },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  const pixels = drawIcon(size, { maskable });
  const png = encodePNG(size, size, pixels);
  writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`Generated ${name} (${size}x${size}, ${png.length} bytes)`);
}
