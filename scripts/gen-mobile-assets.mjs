// Generator grafik aplikacji mobilnej (ikony + splash) — zamiast ręcznych PNG.
// Motyw: czerń #0a0a0a + czerwień #E50914 (GH0ST EMPIRE), monogram „E" z drogą.
// Czysta geometria SVG (bez fontów) ⇒ identyczny render na każdej maszynie.
//
// Użycie: node scripts/gen-mobile-assets.mjs   (wyjście: apps/mobile/assets/)
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/mobile/assets");
const RED = "#E50914";
const BLACK = "#0a0a0a";
const ROAD = "#2b2b2b";

/**
 * Monogram: litera „E" (spine + 3 belki, zaokrąglenia) nad jezdnią z czerwoną
 * przerywaną linią środkową. Wyśrodkowany w canvasie 1024×1024.
 * `scale` zmniejsza logo wokół środka (strefa bezpieczna adaptive ≈ 66%).
 */
function logoSvg({ background, scale = 1 }) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : "";
  const g = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${bg}
  <g transform="${g}">
    <!-- E -->
    <rect x="312" y="232" width="96" height="472" rx="28" fill="${RED}"/>
    <rect x="312" y="232" width="400" height="96" rx="28" fill="${RED}"/>
    <rect x="312" y="420" width="336" height="96" rx="28" fill="${RED}"/>
    <rect x="312" y="608" width="400" height="96" rx="28" fill="${RED}"/>
    <!-- droga -->
    <rect x="232" y="768" width="560" height="40" rx="20" fill="${ROAD}"/>
    <rect x="292" y="782" width="72" height="12" rx="6" fill="${RED}"/>
    <rect x="412" y="782" width="72" height="12" rx="6" fill="${RED}"/>
    <rect x="532" y="782" width="72" height="12" rx="6" fill="${RED}"/>
    <rect x="652" y="782" width="72" height="12" rx="6" fill="${RED}"/>
  </g>
</svg>`;
}

async function render(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(OUT, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

mkdirSync(OUT, { recursive: true });
// Ikona sklepowa/iOS: pełne tło (iOS sam maskuje rogi).
await render(logoSvg({ background: BLACK }), 1024, "icon.png");
// Android adaptive: przezroczysty foreground, logo w strefie bezpiecznej (~62%);
// tło daje `adaptiveIcon.backgroundColor` w app.json.
await render(logoSvg({ background: null, scale: 0.62 }), 1024, "adaptive-icon.png");
// Splash (resizeMode contain, tło #0a0a0a z app.json) — przezroczysty PNG.
await render(logoSvg({ background: null, scale: 0.9 }), 1024, "splash-icon.png");
// Favicon (web build Expo).
await render(logoSvg({ background: BLACK }), 48, "favicon.png");
