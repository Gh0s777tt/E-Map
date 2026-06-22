// Generator prostych, markowych ikon/splash (czerwień #E50914 na czerni #0a0a0a).
// Tworzy poprawne pliki PNG bez zależności (Node: zlib). Zastąp finalną grafiką
// przed publikacją w sklepach. Użycie: node scripts/gen-assets.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = resolve(ROOT, "assets");

const BLACK = [10, 10, 10, 255]; // #0a0a0a
const RED = [229, 9, 20, 255]; // #E50914
const TRANSPARENT = [0, 0, 0, 0];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Rysuje PNG: tło `bg`, wyśrodkowany kwadrat (zaokrąglony) w kolorze `fg`. */
function makePng(size, bg, fg, squareFrac, radiusFrac = 0.18) {
  const sq = Math.round(size * squareFrac);
  const off = Math.round((size - sq) / 2);
  const r = Math.round(sq * radiusFrac);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtr „none"
    for (let x = 0; x < size; x++) {
      let col = bg;
      const lx = x - off;
      const ly = y - off;
      if (lx >= 0 && lx < sq && ly >= 0 && ly < sq) {
        // zaokrąglone rogi
        const inCorner =
          (lx < r && ly < r && (lx - r) ** 2 + (ly - r) ** 2 > r * r) ||
          (lx > sq - r && ly < r && (lx - (sq - r)) ** 2 + (ly - r) ** 2 > r * r) ||
          (lx < r && ly > sq - r && (lx - r) ** 2 + (ly - (sq - r)) ** 2 > r * r) ||
          (lx > sq - r && ly > sq - r && (lx - (sq - r)) ** 2 + (ly - (sq - r)) ** 2 > r * r);
        if (!inCorner) col = fg;
      }
      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = col[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(ASSETS, { recursive: true });
const files = {
  "icon.png": makePng(1024, BLACK, RED, 0.56),
  "adaptive-icon.png": makePng(1024, TRANSPARENT, RED, 0.46), // logo w strefie bezpiecznej Androida
  "splash-icon.png": makePng(512, TRANSPARENT, RED, 0.5),
  "favicon.png": makePng(48, BLACK, RED, 0.62),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(resolve(ASSETS, name), buf);
  console.log(`✓ ${name} (${buf.length} B)`);
}
