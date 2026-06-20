import { darkTheme, themeToCssVars } from "@e-logistic/ui";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Logistic · GH0ST EMPIRE",
  description: "Platforma dla kierowców, spedytorów i firm transportowych.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" data-theme="dark">
      <head>
        {/* Tokeny motywu red/black wstrzyknięte z @e-logistic/ui */}
        <style>{`:root{${themeToCssVars(darkTheme)}}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
