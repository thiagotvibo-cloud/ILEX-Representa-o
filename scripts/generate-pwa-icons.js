import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, bgColor, drawLeaf = true) {
  // RGB to buffer with raw RGBA values
  const [br, bg, bb] = bgColor;
  const rawData = Buffer.alloc(height * (width * 4 + 1));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      
      // Default background color
      let r = br, g = bg, b = bb, a = 255;

      if (drawLeaf) {
        // Draw centered stylized Ilex leaf / pillars icon
        const cx = width / 2;
        const cy = height / 2;
        const scale = width / 120; // baseline 120px scale
        
        // Leaf coordinates check
        const dx = (x - cx) / scale;
        const dy = (y - cy) / scale;

        // Pillar 1: Left tall pillar
        const inPillar1 = dx >= -20 && dx <= -10 && dy >= -30 && dy <= 30;
        // Pillar 2: Middle taller pillar
        const inPillar2 = dx >= -7 && dx <= 5 && dy >= -40 && dy <= 35;
        // Pillar 3: Right angled pillar
        const inPillar3 = dx >= 8 && dx <= 18 && dy >= -20 && dy <= 25;
        
        // Gold accent color #B69A67 (182, 154, 103)
        if (inPillar1 || inPillar2 || inPillar3) {
          r = 182;
          g = 154;
          b = 103;
        }
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // CRC32 helper
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons: Dark elegant green (#26, #33, #2D) with Gold leaf emblem
const darkGreen = [38, 51, 45];
const pwa192 = createPNG(192, 192, darkGreen, true);
const pwa512 = createPNG(512, 512, darkGreen, true);
const pwaMaskable = createPNG(512, 512, darkGreen, true);
const appleTouch = createPNG(180, 180, darkGreen, true);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('✅ PWA icons successfully generated in /public');
