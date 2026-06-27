import type { NextConfig } from "next";

/**
 * Nagłówki bezpieczeństwa (P2 z audytu). Bez sztywnego CSP — mapa korzysta z wielu
 * źródeł (MapTiler, OSM, Overpass, blob-workery), a zbyt restrykcyjny CSP by ją zepsuł;
 * `geolocation=(self)` bo apka używa GPS (mapa „moja lokalizacja", formularze).
 */
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
];

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@e-logistic/api",
    "@e-logistic/core",
    "@e-logistic/ui",
    "@e-logistic/i18n",
    "@e-logistic/maps",
  ],
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
