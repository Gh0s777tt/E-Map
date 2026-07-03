/**
 * Parser CSV (RFC 4180) — odwrotność [`toCsv`](./csv.ts). Czysty, bez zależności.
 * Obsługuje: pola w cudzysłowach zawierające separator / nową linię / escapowany (`""`)
 * cudzysłów, końce linii CRLF i LF, oraz BOM UTF-8 na początku pliku.
 * Separator auto-wykrywany (`;` lub `,`) na podstawie pierwszej linii, albo podany jawnie.
 */

/** Zgaduje separator z pierwszej linii: częstszy z `;`/`,` (Excel PL domyślnie `;`). */
export function detectCsvSeparator(firstLine: string): ";" | "," {
  let semi = 0;
  let comma = 0;
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ";") semi++;
    else if (!inQuotes && ch === ",") comma++;
  }
  return comma > semi ? "," : ";";
}

/**
 * Parsuje dokument CSV do tablicy wierszy (każdy wiersz = tablica komórek-stringów).
 * Puste linie są pomijane. Pierwszy wiersz zwykle to nagłówki (decyzja wołającego).
 */
export function parseCsv(input: string, sep?: ";" | ","): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const separator = sep ?? detectCsvSeparator((text.split(/\r?\n/, 1)[0] ?? "") as string);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAny = false; // czy w bieżącym wierszu było cokolwiek (pole/separator)
  const n = text.length;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    sawAny = false;
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawAny = true;
      i++;
      continue;
    }
    if (c === separator) {
      sawAny = true;
      endField();
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (sawAny || field !== "") endRow();
      i++;
      continue;
    }
    sawAny = true;
    field += c;
    i++;
  }
  if (sawAny || field !== "") endRow();
  return rows;
}
