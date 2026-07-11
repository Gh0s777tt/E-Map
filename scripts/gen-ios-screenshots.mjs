// Zrzuty ekranu do App Store — iPhone 6.5" (1284×2778) i iPad 13" (2048×2732).
// Rysowane jako SVG (mockup ekranu aplikacji + baner) i rasteryzowane sharp.
// Reprezentują realne ekrany aplikacji kierowcy: Pulpit, Mapa TIR, Moje zlecenia,
// Formularz Paliwo (offline). Wynik: apps/mobile/store/screenshots/{iphone,ipad}/.
//
// Użycie: node scripts/gen-ios-screenshots.mjs
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/mobile/store/screenshots");
const RED = "#E50914";
const BLACK = "#0a0a0a";
const CARD = "#161616";
const CARD2 = "#1e1e1e";
const LINE = "#2b2b2b";
const WHITE = "#ffffff";
const SMOKE = "#b3b3b3";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const F = "Helvetica, Arial, sans-serif";

// Ramka telefonu (mockup 1020×2160) wyśrodkowana na kanwie cw×ch + baner z hasłem.
// `body` renderuje treść ekranu w układzie współrzędnych 1020×2160 (origin 0,0).
function frame(caption, subtitle, body, cw, ch) {
  const sw = 1020;
  const sh = 2160;
  const sx = Math.round((cw - sw) / 2);
  const sy = 470;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141414"/><stop offset="1" stop-color="#050505"/>
    </linearGradient>
    <clipPath id="screen"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="72"/></clipPath>
  </defs>
  <rect width="${cw}" height="${ch}" fill="url(#bg)"/>
  <text x="${cw / 2}" y="210" font-family="${F}" font-size="72" font-weight="800" fill="${WHITE}" text-anchor="middle">${caption}</text>
  <text x="${cw / 2}" y="290" font-family="${F}" font-size="38" font-weight="400" fill="${SMOKE}" text-anchor="middle">${subtitle}</text>
  <rect x="${sx - 16}" y="${sy - 16}" width="${sw + 32}" height="${sh + 32}" rx="88" fill="#000000" stroke="${RED}" stroke-width="3"/>
  <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="72" fill="${BLACK}"/>
  <g clip-path="url(#screen)"><g transform="translate(${sx} ${sy})">
    ${statusBar()}
    ${body}
  </g></g>
  <rect x="${cw / 2 - 120}" y="${sy + 22}" width="240" height="34" rx="17" fill="#000000"/>
</svg>`;
}

function statusBar() {
  return `<text x="60" y="70" font-family="${F}" font-size="34" font-weight="700" fill="${WHITE}">9:41</text>
    <g transform="translate(840 44)">
      <rect x="0" y="6" width="8" height="18" rx="2" fill="${WHITE}"/><rect x="14" y="2" width="8" height="22" rx="2" fill="${WHITE}"/>
      <rect x="28" y="-2" width="8" height="26" rx="2" fill="${WHITE}"/><rect x="42" y="-6" width="8" height="30" rx="2" fill="${WHITE}"/>
      <rect x="72" y="0" width="46" height="24" rx="6" fill="none" stroke="${WHITE}" stroke-width="3"/><rect x="76" y="4" width="34" height="16" rx="3" fill="${GREEN}"/>
    </g>`;
}

function header(title, back = false) {
  return `<rect x="0" y="110" width="1020" height="120" fill="${BLACK}"/>
    ${back ? `<path d="M56 176 l-22 -6 l22 -6" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <text x="${back ? 96 : 56}" y="190" font-family="${F}" font-size="52" font-weight="800" fill="${WHITE}">${title}</text>
    <rect x="0" y="230" width="1020" height="2" fill="${LINE}"/>`;
}

function tile(x, y, glyph, label) {
  return `<g transform="translate(${x} ${y})">
    <rect width="452" height="300" rx="36" fill="${CARD}" stroke="${LINE}" stroke-width="2"/>
    <rect x="40" y="44" width="96" height="96" rx="24" fill="${RED}"/>
    <text x="88" y="112" font-family="${F}" font-size="58" font-weight="800" fill="${WHITE}" text-anchor="middle">${glyph}</text>
    <text x="40" y="220" font-family="${F}" font-size="44" font-weight="700" fill="${WHITE}">${label}</text>
    <text x="40" y="266" font-family="${F}" font-size="30" font-weight="400" fill="${SMOKE}">Otwórz →</text>
  </g>`;
}

const dashboardBody = `${header("Pulpit")}
   <text x="56" y="330" font-family="${F}" font-size="36" font-weight="400" fill="${SMOKE}">Witaj, Jan · E2E Test Company</text>
   ${tile(56, 380, "⛽", "Paliwo")}
   ${tile(544, 380, "📦", "Zlecenia")}
   ${tile(56, 712, "🗺", "Mapa TIR")}
   ${tile(544, 712, "📄", "Dokumenty")}
   ${tile(56, 1044, "⏱", "Czas pracy")}
   ${tile(544, 1044, "✅", "Checklisty")}
   <rect x="56" y="1400" width="908" height="150" rx="28" fill="${CARD2}" stroke="${LINE}" stroke-width="2"/>
   <rect x="88" y="1440" width="70" height="70" rx="16" fill="${GREEN}"/>
   <text x="120" y="1487" font-family="${F}" font-size="40" font-weight="800" fill="${BLACK}" text-anchor="middle">✓</text>
   <text x="190" y="1470" font-family="${F}" font-size="38" font-weight="700" fill="${WHITE}">Wszystko zsynchronizowane</text>
   <text x="190" y="1516" font-family="${F}" font-size="30" font-weight="400" fill="${SMOKE}">Ostatnia synchronizacja przed chwilą</text>`;

const mapBody = `<rect x="0" y="90" width="1020" height="1710" fill="#0d1a12"/>
   ${[220, 520, 860, 1180, 1500].map((y) => `<rect x="0" y="${y}" width="1020" height="2" fill="#14261a"/>`).join("")}
   ${[180, 460, 720].map((x) => `<rect x="${x}" y="90" width="2" height="1710" fill="#14261a"/>`).join("")}
   <path d="M120 1650 C 300 1300, 250 1000, 520 820 S 820 520, 900 240" fill="none" stroke="${RED}" stroke-width="14" stroke-linecap="round"/>
   <circle cx="120" cy="1650" r="26" fill="${WHITE}" stroke="${RED}" stroke-width="8"/>
   <circle cx="900" cy="240" r="26" fill="${RED}" stroke="${WHITE}" stroke-width="6"/>
   <g transform="translate(470 760)"><path d="M0 -46 C 30 -46 46 -22 46 0 C 46 34 0 66 0 66 C 0 66 -46 34 -46 0 C -46 -22 -30 -46 0 -46 Z" fill="${AMBER}"/><text x="0" y="12" font-family="${F}" font-size="40" text-anchor="middle">P</text></g>
   <g transform="translate(300 1180)"><path d="M0 -46 C 30 -46 46 -22 46 0 C 46 34 0 66 0 66 C 0 66 -46 34 -46 0 C -46 -22 -30 -46 0 -46 Z" fill="${RED}"/><text x="0" y="12" font-family="${F}" font-size="36" text-anchor="middle">⛽</text></g>
   <g transform="translate(720 480)"><path d="M0 -46 C 30 -46 46 -22 46 0 C 46 34 0 66 0 66 C 0 66 -46 34 -46 0 C -46 -22 -30 -46 0 -46 Z" fill="${AMBER}"/><text x="0" y="12" font-family="${F}" font-size="40" text-anchor="middle">P</text></g>
   ${header("Mapa TIR")}
   <rect x="40" y="1560" width="940" height="200" rx="32" fill="${CARD}" stroke="${LINE}" stroke-width="2"/>
   <text x="80" y="1630" font-family="${F}" font-size="34" font-weight="400" fill="${SMOKE}">Dystans</text>
   <text x="80" y="1690" font-family="${F}" font-size="52" font-weight="800" fill="${WHITE}">842 km</text>
   <text x="420" y="1630" font-family="${F}" font-size="34" font-weight="400" fill="${SMOKE}">Czas</text>
   <text x="420" y="1690" font-family="${F}" font-size="52" font-weight="800" fill="${WHITE}">9 h 40</text>
   <text x="720" y="1630" font-family="${F}" font-size="34" font-weight="400" fill="${SMOKE}">Myto</text>
   <text x="720" y="1690" font-family="${F}" font-size="52" font-weight="800" fill="${RED}">128 €</text>`;

function order(y, city, addr, status, color) {
  return `<g transform="translate(56 ${y})">
    <rect width="908" height="240" rx="32" fill="${CARD}" stroke="${LINE}" stroke-width="2"/>
    <text x="40" y="80" font-family="${F}" font-size="46" font-weight="800" fill="${WHITE}">${city}</text>
    <text x="40" y="138" font-family="${F}" font-size="32" font-weight="400" fill="${SMOKE}">${addr}</text>
    <text x="40" y="196" font-family="${F}" font-size="30" font-weight="400" fill="${SMOKE}">CMR · POD · 24 t</text>
    <rect x="600" y="40" width="268" height="66" rx="33" fill="${color}"/>
    <text x="734" y="84" font-family="${F}" font-size="34" font-weight="700" fill="${BLACK}" text-anchor="middle">${status}</text>
  </g>`;
}
const ordersBody = `${header("Moje zlecenia")}
   ${order(300, "Warszawa → Berlin", "ul. Poznańska 14 → Alexanderplatz 2", "W trasie", AMBER)}
   ${order(580, "Łódź → Praga", "Rzgowska 210 → Wenceslas Sq. 5", "Załadunek", RED)}
   ${order(860, "Gdańsk → Wrocław", "Port → Legnicka 48", "Dostarczone", GREEN)}
   ${order(1140, "Kraków → Wiedeń", "Nowa Huta → Stephansplatz", "Zaplanowane", SMOKE)}
   ${order(1420, "Poznań → Hamburg", "Głogowska 90 → Speicherstadt", "W trasie", AMBER)}`;

function field(y, label, value, unit = "") {
  return `<g transform="translate(56 ${y})">
    <text x="0" y="0" font-family="${F}" font-size="34" font-weight="400" fill="${SMOKE}">${label}</text>
    <rect x="0" y="24" width="908" height="110" rx="24" fill="${CARD}" stroke="${LINE}" stroke-width="2"/>
    <text x="36" y="96" font-family="${F}" font-size="46" font-weight="700" fill="${WHITE}">${value}</text>
    ${unit ? `<text x="872" y="96" font-family="${F}" font-size="40" font-weight="400" fill="${SMOKE}" text-anchor="end">${unit}</text>` : ""}
  </g>`;
}
const fuelBody = `${header("Paliwo", true)}
   <rect x="56" y="300" width="908" height="96" rx="48" fill="#3a2a00"/>
   <circle cx="120" cy="348" r="20" fill="${AMBER}"/>
   <text x="164" y="362" font-family="${F}" font-size="36" font-weight="700" fill="${AMBER}">Tryb offline — zapisze się i wyśle później</text>
   ${field(456, "Stacja", "Orlen · A2 MOP Wartkowice")}
   ${field(616, "Litry", "620", "L")}
   ${field(776, "Cena / litr", "1,58", "€")}
   ${field(936, "Przebieg", "512 340", "km")}
   ${field(1096, "Karta paliwowa", "DKV •••• 4821")}
   <rect x="56" y="1300" width="908" height="130" rx="32" fill="${RED}"/>
   <text x="510" y="1382" font-family="${F}" font-size="46" font-weight="800" fill="${WHITE}" text-anchor="middle">Zapisz tankowanie</text>`;

const SHOTS = [
  [
    "01-pulpit.png",
    "Cała flota w jednej aplikacji",
    "Pulpit kierowcy — wszystko pod ręką",
    dashboardBody,
  ],
  ["02-mapa.png", "Mapa dla ciężarówek", "Trasa TIR, parkingi i stacje paliw w okolicy", mapBody],
  [
    "03-zlecenia.png",
    "Zlecenia i statusy jednym dotknięciem",
    "Pełne dane załadunku i rozładunku",
    ordersBody,
  ],
  [
    "04-paliwo.png",
    "Formularze działają bez zasięgu",
    "Paliwo, AdBlue i trasa — sync po powrocie sieci",
    fuelBody,
  ],
];
const DEVICES = [
  { dir: "iphone", cw: 1284, ch: 2778 },
  { dir: "ipad", cw: 2048, ch: 2732 },
];

for (const dev of DEVICES) {
  const out = resolve(BASE, dev.dir);
  mkdirSync(out, { recursive: true });
  for (const [name, cap, sub, body] of SHOTS) {
    const svg = frame(cap, sub, body, dev.cw, dev.ch);
    await sharp(Buffer.from(svg)).png().toFile(resolve(out, name));
    console.log(`✓ ${dev.dir}/${name} (${dev.cw}×${dev.ch})`);
  }
}
console.log('\nGotowe: zrzuty iPhone 6.5" i iPad 13" w apps/mobile/store/screenshots/');
