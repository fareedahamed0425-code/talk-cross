import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createPng(width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Generate uncompressed raw scanlines: (1 filter byte + width * 4 bytes) per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Center coords
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / (width * 0.45);
      const dy = (y - cy) / (height * 0.45);
      const distSq = dx * dx + dy * dy;

      // Rounded rectangle mask (radius ~ 22%)
      const rx = Math.abs(x - cx) / (width * 0.48);
      const ry = Math.abs(y - cy) / (height * 0.48);

      if (rx < 0.95 && ry < 0.95) {
        // Burgundy Gradient: from (#e11d48) to (#800020)
        const t = (x + y) / (width + height);
        const r = Math.round(225 * (1 - t) + 128 * t);
        const g = Math.round(29 * (1 - t) + 0 * t);
        const b = Math.round(72 * (1 - t) + 32 * t);

        // Simple Speech bubble shape inside
        const bx = Math.abs(x - cx) / (width * 0.28);
        const by = (y - cy + height * 0.04) / (height * 0.22);

        if (bx * bx + by * by < 0.65) {
          // White speech bubble
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;

          // 3 dots inside speech bubble
          const dotDist1 = Math.hypot(x - (cx - width * 0.1), y - cy);
          const dotDist2 = Math.hypot(x - cx, y - cy);
          const dotDist3 = Math.hypot(x - (cx + width * 0.1), y - cy);
          const dotRadius = width * 0.028;

          if (dotDist1 < dotRadius || dotDist2 < dotRadius || dotDist3 < dotRadius) {
            rawData[pxOffset] = 128;
            rawData[pxOffset + 1] = 0;
            rawData[pxOffset + 2] = 32;
            rawData[pxOffset + 3] = 255;
          }
        } else {
          // Burgundy background
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = calculateCrc(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate files in frontend/public
const publicDir = path.join(__dirname, 'public');
const png192 = createPng(192, 192);
const png512 = createPng(512, 512);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

console.log('✅ Generated icon-192.png (', png192.length, 'bytes)');
console.log('✅ Generated icon-512.png (', png512.length, 'bytes)');
