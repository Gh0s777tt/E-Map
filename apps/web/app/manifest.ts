import type { MetadataRoute } from "next";

/**
 * #279: manifest PWA — panel instaluje się jako aplikacja na macOS/Windows
 * (Chrome/Edge: „Zainstaluj aplikację", Safari: Dock → „Dodaj do Docka").
 * Ścieżka macOS #1 wg roadmapy (PWA); #2 to apka iOS na Apple Silicon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Logistic — panel firmy",
    short_name: "E-Logistic",
    description:
      "Panel firmy transportowej: flota, zlecenia, faktury, mapa TIR, rozliczenia kierowców.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
