/**
 * #301: Raport tygodniowy jako PDF (pdf-lib — czysty JS, działa w serverless).
 * Motyw marki: czarny nagłówek + czerwony akcent #E50914. Fonty standardowe
 * PDF nie znają polskich znaków (WinAnsi), więc treść przechodzi przez
 * strip diakrytyków — "Zakończone" → "Zakonczone".
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface WeeklyReportData {
  companyName: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  delivered: number;
  liters: number;
  fuelCost: number;
  expenses: number;
}

const RED = rgb(0.898, 0.035, 0.078); // #E50914
const BLACK = rgb(0.039, 0.039, 0.039); // #0a0a0a
const GREY = rgb(0.45, 0.45, 0.45);

/** WinAnsi nie koduje ą/ę/ś/… — zamieniamy na odpowiedniki ASCII. */
function ascii(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l").replaceAll("Ł", "L");
}

/** Buduje PDF raportu i zwraca go jako base64 (załącznik Resend). */
export async function weeklyReportPdf(d: WeeklyReportData): Promise<string> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // Nagłówek: czarna belka + logo tekstowe
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: BLACK });
  page.drawText("E", { x: 48, y: height - 66, size: 30, font: bold, color: RED });
  page.drawText("-LOGISTIC", { x: 68, y: height - 66, size: 30, font: bold, color: rgb(1, 1, 1) });
  page.drawText(ascii("Raport tygodniowy"), {
    x: 48,
    y: height - 92,
    size: 13,
    font,
    color: rgb(0.8, 0.8, 0.8),
  });

  let y = height - 160;
  page.drawText(ascii(d.companyName), { x: 48, y, size: 20, font: bold, color: BLACK });
  y -= 22;
  page.drawText(`${d.fromDate} - ${d.toDate}`, { x: 48, y, size: 12, font, color: GREY });
  y -= 44;

  const rows: [string, string][] = [
    [ascii("Dostawy zakończone"), String(d.delivered)],
    [ascii("Zatankowane paliwo"), `${Math.round(d.liters)} l`],
    [ascii("Koszt paliwa (wg wpisów)"), `${Math.round(d.fuelCost)}`],
    [ascii("Zgłoszenia wydatków kierowców"), String(d.expenses)],
  ];
  for (const [label, value] of rows) {
    page.drawRectangle({ x: 48, y: y - 8, width: 3, height: 26, color: RED });
    page.drawText(label, { x: 62, y, size: 13, font, color: BLACK });
    page.drawText(value, {
      x: width - 48 - bold.widthOfTextAtSize(value, 15),
      y,
      size: 15,
      font: bold,
      color: BLACK,
    });
    y -= 42;
  }

  y -= 12;
  page.drawText(ascii("Szczegóły: panel E-Logistic → Raporty / Statystyki / Rejestr wydatków."), {
    x: 48,
    y,
    size: 10,
    font,
    color: GREY,
  });
  page.drawText("e-logistic-one.vercel.app", { x: 48, y: 48, size: 10, font, color: RED });

  return Buffer.from(await doc.save()).toString("base64");
}
