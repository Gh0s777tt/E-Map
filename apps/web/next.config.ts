import type { NextConfig } from "next";

/**
 * Nagłówki bezpieczeństwa (P2 z audytu). Bez sztywnego CSP — mapa korzysta z wielu
 * źródeł (MapTiler, OSM, Overpass, blob-workery), a zbyt restrykcyjny CSP by ją zepsuł;
 * `geolocation=(self)` bo apka używa GPS (mapa „moja lokalizacja", formularze).
 */
// CSP w trybie Report-Only (audyt #214, P3) — najpierw OBSERWACJA naruszeń (nie blokuje),
// docelowo zacieśnić i włączyć enforce. Allowlista pod mapę (MapTiler/TomTom/OSM/Overpass),
// Supabase (REST + realtime WSS) i routing (HERE/GraphHopper/TomTom). `'unsafe-inline'` (style inline)
// i `'unsafe-eval'` (Turbopack/MapLibre) — do usunięcia przy przejściu na enforce.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.maptiler.com https://api.tomtom.com https://*.api.tomtom.com https://*.openstreetmap.org https://overpass-api.de https://router.hereapi.com https://graphhopper.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const config: NextConfig = {
  reactStrictMode: true,
  // React Compiler (React 19) — automatyczna memoizacja (mniej re-renderów, mniej ręcznego
  // useMemo/useCallback). Next stosuje go tylko do plików React (optymalizacja SWC), więc build
  // pozostaje szybki i kompatybilny z Turbopack. Wymaga devDep `babel-plugin-react-compiler`.
  reactCompiler: true,
  transpilePackages: [
    "@e-logistic/api",
    "@e-logistic/core",
    "@e-logistic/ui",
    "@e-logistic/i18n",
    "@e-logistic/maps",
  ],
  // Tree-shaking barrel-importów pakietów współdzielonych (import tylko użytych symboli).
  experimental: {
    optimizePackageImports: [
      "@e-logistic/core",
      "@e-logistic/ui",
      "@e-logistic/api",
      "@e-logistic/maps",
      "@e-logistic/i18n",
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Stare polskie ścieżki → nowe angielskie (zero martwych linków/zakładek).
  async redirects() {
    return [
      { source: "/szkody", destination: "/damages", permanent: true },
      { source: "/diety", destination: "/per-diem", permanent: true },
      { source: "/wyplaty", destination: "/payouts", permanent: true },
      { source: "/czas-pracy", destination: "/work-time", permanent: true },
    ];
  },
};

export default config;
