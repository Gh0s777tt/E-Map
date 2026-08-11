/**
 * [#406] Profil ZESTAWU — ciągnik plus naczepa — do routingu.
 *
 * Do tej pory mapa wysyłała do routingu gabaryty samego ciągnika, bo naczepa była
 * polem tekstowym i nie miała wymiarów ([#405] to zmieniło). Skutek był tym
 * groźniejszy, że niewidoczny: parametry wyglądały na kompletne, tylko opisywały
 * połowę pojazdu.
 *
 * Każdy wymiar łączy się INACZEJ i każdy z tych sposobów jest tu decyzją:
 *
 * WYSOKOŚĆ — MAKSIMUM z dwóch, nie ciągnik. Niski ciągnik z czterometrową
 *   chłodnią to zestaw czterometrowy. To najgroźniejszy z parametrów, bo błąd
 *   kończy się na wiadukcie, a nie na mandacie.
 *
 * SZEROKOŚĆ — maksimum, z tego samego powodu.
 *
 * OSIE — SUMA. Systemy poboru myta liczą osie całego zestawu i po nich ustalają
 *   stawkę; trzyosiowy ciągnik z trzyosiową naczepą to sześć osi, a nie trzy.
 *
 * MASA — suma mas własnych plus suma ładowności, czyli DMC zestawu. Liczona
 *   tylko wtedy, gdy znane są OBIE składowe każdego pojazdu — sama masa własna
 *   zaniża wynik dla załadowanego zestawu, a zaniżona masa to przejazd przez
 *   most z ograniczeniem tonażu.
 *
 * DŁUGOŚĆ — **nie liczymy jej wcale** i to wymaga wyjaśnienia, bo wygląda na
 *   uchylanie się od roboty.
 *
 *   Suma jest zawyżona: naczepa zachodzi na ciągnik przez siodło, więc 6 m + 13,6 m
 *   to nie 19,6 m, tylko około 16,5 m. Maksimum jest zaniżone: 13,6 m to sama
 *   naczepa, bez wystającego przodu ciągnika. Policzyć dokładnie da się tylko
 *   znając położenie sworznia, a tej danej nie mamy i nie zamierzamy jej zgadywać.
 *
 *   Kluczowe jest jednak co innego: **stan dzisiejszy jest gorszy niż brak danych**.
 *   Wysyłamy teraz długość samego ciągnika — jakieś 6 m dla zestawu, który ma 16,5 m.
 *   Dziesięć metrów zaniżenia oznacza trasę poprowadzoną przez łuk, w który zestaw
 *   nie wejdzie. Router, który długości nie dostanie, użyje własnej wartości
 *   domyślnej dla profilu ciężarowego — i ta będzie bliższa prawdzie niż nasze 6 m.
 *
 *   Dlatego przy podpiętej naczepie długość idzie jako `null` **razem z uwagą**,
 *   a spedytor może podać długość zestawu ręcznie w polu nadpisania. Brak liczby,
 *   o którym wiadomo, jest uczciwszy niż liczba, która kłamie o dziesięć metrów.
 */

/** Wymiary jednego pojazdu — ciągnika albo naczepy. */
export interface RigPart {
  heightCm?: number | null;
  widthCm?: number | null;
  lengthCm?: number | null;
  curbWeightKg?: number | null;
  maxPayloadKg?: number | null;
  axleCount?: number | null;
}

export interface RigProfile {
  heightCm: number | null;
  widthCm: number | null;
  /** Zawsze `null`, gdy naczepa jest podpięta — patrz nagłówek modułu. */
  lengthCm: number | null;
  /** DMC zestawu: suma mas własnych + suma ładowności. */
  grossWeightKg: number | null;
  axleCount: number | null;
  /**
   * Czego zabrakło, żeby profil był kompletny. Puste = wszystko policzone.
   * Kody są stabilne, bo ekran mapuje je na komunikaty.
   */
  braki: RigGap[];
}

export type RigGap =
  | "wysokosc"
  | "szerokosc"
  | "masa"
  | "osie"
  /** Naczepa podpięta — długości zestawu nie da się wyliczyć z posiadanych danych. */
  | "dlugosc-zestawu";

/** Większa z dwóch wartości; `null`, gdy obie nieznane. */
function wiekszy(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return Math.max(a ?? 0, b ?? 0);
}

/** Suma; `null`, gdy obie nieznane. Znana + nieznana daje znaną (lepiej niż nic). */
function suma(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** DMC pojedynczego pojazdu — tylko gdy znane OBIE składowe. */
function dmc(p: RigPart): number | null {
  return p.curbWeightKg != null && p.maxPayloadKg != null ? p.curbWeightKg + p.maxPayloadKg : null;
}

/**
 * Składa profil zestawu.
 *
 * @param ciagnik pojazd silnikowy z kartoteki
 * @param naczepa podpięta naczepa albo `null`, gdy zestaw rozpięty
 */
export function combineRigProfile(ciagnik: RigPart, naczepa: RigPart | null): RigProfile {
  const braki: RigGap[] = [];

  const heightCm = wiekszy(ciagnik.heightCm, naczepa?.heightCm);
  const widthCm = wiekszy(ciagnik.widthCm, naczepa?.widthCm);
  const axleCount = naczepa
    ? suma(ciagnik.axleCount, naczepa.axleCount)
    : (ciagnik.axleCount ?? null);

  const dmcCiagnika = dmc(ciagnik);
  const dmcNaczepy = naczepa ? dmc(naczepa) : null;
  const grossWeightKg = naczepa
    ? // Zestaw ma sensowną masę tylko wtedy, gdy znamy OBIE — inaczej wyszłaby
      // masa samego ciągnika podana jako masa zestawu, czyli zaniżenie o kilkanaście ton.
      dmcCiagnika != null && dmcNaczepy != null
      ? dmcCiagnika + dmcNaczepy
      : null
    : dmcCiagnika;

  // Długość: patrz nagłówek modułu. Bez naczepy długość ciągnika jest prawdziwa.
  const lengthCm = naczepa ? null : (ciagnik.lengthCm ?? null);

  if (heightCm == null) braki.push("wysokosc");
  if (widthCm == null) braki.push("szerokosc");
  if (grossWeightKg == null) braki.push("masa");
  if (axleCount == null) braki.push("osie");
  if (naczepa) braki.push("dlugosc-zestawu");

  return { heightCm, widthCm, lengthCm, grossWeightKg, axleCount, braki };
}
