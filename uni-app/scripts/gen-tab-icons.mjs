/**
 * 生成原生 tabBar 用 81×81 PNG 线框图标。
 * node scripts/gen-tab-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 81;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../src/static/tab");

const GRAY = [148, 163, 184, 255];
const TEAL = [13, 148, 136, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const src = (y * SIZE + x) * 4;
      const dst = row + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function createCanvas() {
  return Buffer.alloc(SIZE * SIZE * 4);
}

function setPixel(px, x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
  px[i + 3] = color[3];
}

function fillCircle(px, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
    for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(px, x, y, color);
    }
  }
}

function strokeCircle(px, cx, cy, r, thickness, color) {
  const outer = r + thickness / 2;
  const inner = r - thickness / 2;
  const o2 = outer * outer;
  const i2 = inner * inner;
  for (let y = Math.floor(cy - outer - 1); y <= cy + outer + 1; y += 1) {
    for (let x = Math.floor(cx - outer - 1); x <= cx + outer + 1; x += 1) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= o2 && d2 >= i2) setPixel(px, x, y, color);
    }
  }
}

function fillRect(px, x0, y0, x1, y1, color) {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y += 1) {
    for (let x = xa; x <= xb; x += 1) setPixel(px, x, y, color);
  }
}

function strokeLine(px, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    fillCircle(px, x, y, thickness / 2, color);
  }
}

function drawHome(px, color) {
  strokeLine(px, 16, 42, 40, 20, 6, color);
  strokeLine(px, 40, 20, 64, 42, 6, color);
  strokeLine(px, 24, 40, 24, 64, 6, color);
  strokeLine(px, 24, 64, 56, 64, 6, color);
  strokeLine(px, 56, 64, 56, 40, 6, color);
  fillRect(px, 35, 48, 45, 64, color);
}

function drawChat(px, color) {
  strokeCircle(px, 38, 34, 20, 5, color);
  strokeLine(px, 28, 50, 22, 64, 5, color);
  strokeLine(px, 22, 64, 38, 52, 5, color);
}

function drawTrain(px, color) {
  fillCircle(px, 20, 40, 10, color);
  fillCircle(px, 60, 40, 10, color);
  fillRect(px, 18, 34, 62, 46, color);
  fillRect(px, 12, 30, 20, 50, color);
  fillRect(px, 60, 30, 68, 50, color);
}

function drawRecords(px, color) {
  fillRect(px, 18, 46, 28, 64, color);
  fillRect(px, 35, 28, 45, 64, color);
  fillRect(px, 52, 36, 62, 64, color);
  strokeLine(px, 16, 66, 64, 66, 4, color);
}

function drawProfile(px, color) {
  strokeCircle(px, 40, 26, 12, 5, color);
  const cx = 40;
  const cy = 70;
  const r = 24;
  const thickness = 5;
  for (let y = 44; y <= 72; y += 1) {
    for (let x = 12; x <= 68; x += 1) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      const outer = (r + thickness / 2) ** 2;
      const inner = (r - thickness / 2) ** 2;
      if (d2 <= outer && d2 >= inner && y <= 70) setPixel(px, x, y, color);
    }
  }
}

const ICONS = {
  home: drawHome,
  chat: drawChat,
  train: drawTrain,
  records: drawRecords,
  profile: drawProfile,
};

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, draw] of Object.entries(ICONS)) {
  for (const [suffix, color] of [
    ["", GRAY],
    ["-active", TEAL],
  ]) {
    const px = createCanvas();
    draw(px, color);
    writeFileSync(resolve(OUT_DIR, `${name}${suffix}.png`), encodePng(px));
  }
}

console.log("wrote tab icons to", OUT_DIR);
