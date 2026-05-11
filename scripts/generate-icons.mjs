import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const iconDir = join(root, "public", "icons");
mkdirSync(iconDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, index) => {
  let current = index;
  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function isRoundedRect(x, y, left, top, right, bottom, radius) {
  const innerX = x >= left + radius && x <= right - radius;
  const innerY = y >= top + radius && y <= bottom - radius;
  if ((innerX && y >= top && y <= bottom) || (innerY && x >= left && x <= right)) {
    return true;
  }

  const cornerX = x < left + radius ? left + radius : right - radius;
  const cornerY = y < top + radius ? top + radius : bottom - radius;
  return (x - cornerX) ** 2 + (y - cornerY) ** 2 <= radius ** 2;
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const background = [13, 13, 13, 255];
  const card = [24, 24, 24, 255];
  const stroke = [217, 217, 217, 255];
  const soft = [139, 139, 139, 255];
  const margin = Math.round(size * 0.12);
  const radius = Math.round(size * 0.22);
  const left = margin;
  const top = margin;
  const right = size - margin - 1;
  const bottom = size - margin - 1;
  const unit = size / 512;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      let color = background;

      if (isRoundedRect(x, y, left, top, right, bottom, radius)) {
        color = card;
      }

      const lineWidth = Math.max(2, Math.round(8 * unit));
      const inset = Math.round(size * 0.2);
      const borderLeft = left + lineWidth;
      const borderRight = right - lineWidth;
      const borderTop = top + lineWidth;
      const borderBottom = bottom - lineWidth;
      const onOuter =
        isRoundedRect(x, y, left, top, right, bottom, radius) &&
        !isRoundedRect(x, y, borderLeft, borderTop, borderRight, borderBottom, radius - lineWidth);

      if (onOuter) color = soft;

      const barLeft = inset;
      const barRight = Math.round(size * 0.72);
      const stemRight = Math.round(size * 0.32);
      const topBarTop = Math.round(size * 0.3);
      const midBarTop = Math.round(size * 0.47);
      const botBarTop = Math.round(size * 0.64);
      const barHeight = Math.max(8, Math.round(size * 0.08));
      const stemTop = topBarTop;
      const stemBottom = botBarTop + barHeight;

      const inStem =
        x >= barLeft && x <= stemRight && y >= stemTop && y <= stemBottom;
      const inTop =
        x >= barLeft && x <= barRight && y >= topBarTop && y <= topBarTop + barHeight;
      const inMid =
        x >= barLeft && x <= Math.round(size * 0.64) && y >= midBarTop && y <= midBarTop + barHeight;
      const inBot =
        x >= barLeft && x <= barRight && y >= botBarTop && y <= botBarTop + barHeight;

      if (inStem || inTop || inMid || inBot) color = stroke;

      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }

  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    scanlines[rowStart] = 0;
    pixels.copy(scanlines, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

[
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
].forEach(([name, size]) => {
  writeFileSync(join(iconDir, name), drawIcon(size));
});

console.log("Execute PWA 아이콘을 생성했습니다.");
