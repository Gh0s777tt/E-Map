import { darkTheme, lightTheme, themeToCssVars } from "@e-logistic/ui";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Logistic · GH0ST EMPIRE",
  description: "Platforma dla kierowców, spedytorów i firm transportowych.",
};

/**
 * Anty-migotanie (FOUC): ustawia zapisany tryb (lub preferencję systemu) na <html>
 * synchronicznie, przed pierwszym malowaniem. Bez tego strona mignęłaby ciemna →
 * jasna przy wejściu użytkownika z zapisanym trybem jasnym.
 */
const NO_FLASH = `(function(){try{var t=localStorage.getItem("el-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" data-theme="dark">
      <head>
        {/* Tokeny motywu red/black (oba tryby) — jedno źródło z @e-logistic/ui. */}
        <style>{`:root[data-theme="dark"]{${themeToCssVars(darkTheme)}}:root[data-theme="light"]{${themeToCssVars(lightTheme)}}`}</style>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: zaufany statyczny skrypt anty-FOUC (bez danych użytkownika) */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
