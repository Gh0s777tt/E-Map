// Materiały do karty sklepu Google Play / App Store (poza binarką aplikacji):
// grafika promocyjna 1024×500 (feature graphic) + ikona sklepowa 512².
// Motyw jak w gen-mobile-assets.mjs. Tekst rysowany <text> (Helvetica) —
// wynikowe PNG są commitowane, więc render lokalny wystarczy.
//
// Użycie: node scripts/gen-store-assets.mjs   (wyjście: apps/mobile/store/)
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/mobile/store");
const RED = "#E50914";
const BLACK = "#0a0a0a";
const ROAD = "#2b2b2b";
const SMOKE = "#b3b3b3";

// Monogram „E" (geometria jak w ikonie aplikacji), przeskalowany do wysokości ~300 px.
function monogram(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="0" y="0" width="96" height="472" rx="28" fill="${RED}"/>
    <rect x="0" y="0" width="400" height="96" rx="28" fill="${RED}"/>
    <rect x="0" y="188" width="336" height="96" rx="28" fill="${RED}"/>
    <rect x="0" y="376" width="400" height="96" rx="28" fill="${RED}"/>
  </g>`;
}

const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${BLACK}"/>
  <!-- jezdnia przez całą szerokość -->
  <rect x="0" y="404" width="1024" height="36" fill="${ROAD}"/>
  ${[40, 168, 296, 424, 552, 680, 808, 936].map((x) => `<rect x="${x}" y="417" width="64" height="10" rx="5" fill="${RED}"/>`).join("")}
  ${monogram(96, 76, 0.58)}
  <text x="404" y="216" font-family="Helvetica, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">E-LOGISTIC</text>
  <text x="408" y="272" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="400" fill="${SMOKE}">Flota · zlecenia · CMR/POD · mapa TIR</text>
  <text x="408" y="316" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="400" fill="${SMOKE}">Działa offline — synchronizuje po zasięgu</text>
</svg>`;

const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BLACK}"/>
  ${monogram(312, 232, 1)}
  <rect x="232" y="768" width="560" height="40" rx="20" fill="${ROAD}"/>
  ${[292, 412, 532, 652].map((x) => `<rect x="${x}" y="782" width="72" height="12" rx="6" fill="${RED}"/>`).join("")}
</svg>`;

mkdirSync(OUT, { recursive: true });
await sharp(Buffer.from(feature)).png().toFile(resolve(OUT, "feature-graphic-1024x500.png"));
console.log("✓ feature-graphic-1024x500.png");
await sharp(Buffer.from(icon512)).resize(512, 512).png().toFile(resolve(OUT, "icon-512.png"));
console.log("✓ icon-512.png");

// #279: ikony PWA panelu web (instalacja na macOS/Windows).
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web/public");
await sharp(Buffer.from(icon512)).resize(512, 512).png().toFile(resolve(WEB, "icon-512.png"));
await sharp(Buffer.from(icon512)).resize(192, 192).png().toFile(resolve(WEB, "icon-192.png"));
console.log("✓ web/public/icon-512.png + icon-192.png (PWA)");
