/**
 * [#383] Profil pojazdu do routingu na telefonie kierowcy.
 *
 * DLACZEGO TO ISTNIEJE: `map.tsx` wysyłał do routingu stałą `{ kind: "truck",
 * weightKg: 24000 }` — bez wysokości, szerokości i długości. Warunki w
 * `buildTomTomRouteUrl` (`if (pr.heightCm)`) po prostu nie wchodziły, więc
 * `vehicleHeight` NIGDY nie trafiało do zapytania. Trasa wyglądała jak trasa TIR,
 * a była trasą pojazdu bez wymiarów: żaden wiadukt, tunel ani ograniczenie
 * szerokości nie były brane pod uwagę. Web od dawna ma formularz gabarytów,
 * telefon nie miał ich wcale — a to telefon jedzie w kabinie.
 *
 * Zasada: nic nie zgadujemy. Pusta kolumna w kartotece zostaje pusta i ma być
 * WIDOCZNA na ekranie — parametr wysłany „na oko" jest gorszy niż jego brak,
 * bo wygląda tak samo jak parametr prawdziwy.
 */
import type { VehicleKind, VehicleProfile } from "@e-logistic/maps";
import type { FleetVehicle } from "./useFleet";

/**
 * Masa, którą dostawcy routingu przyjmują SAMI, gdy `weightKg` nie zostanie podane
 * (TomTom: `vehicleWeight=24000`, HERE: `truck[grossWeight]=24000`). Trzymamy ją tutaj,
 * żeby komunikat dla kierowcy mówił dokładnie to, co poleciało do API.
 */
export const ASSUMED_WEIGHT_KG = 24000;

/** Gabaryt, którego brakuje w kartotece — klucz do komunikatu (bez tekstu, tekst jest w i18n). */
export type MissingDimension = "height" | "width" | "length" | "weight";

/**
 * Typ z kartoteki → tryb routingu. `other` celowo idzie jako `truck`: routing TIR
 * jest OSTRZEJSZY (wiadukty, zakazy, masa), więc pomyłka w tę stronę co najwyżej
 * wydłuża trasę, a pomyłka w drugą stronę wysyła zestaw pod niski wiadukt.
 */
export function routingKindOf(type: FleetVehicle["vehicleType"]): VehicleKind {
  return type === "van" ? "van" : type === "other" ? "truck" : type;
}

/** Czy dla tego trybu dostawca w ogóle patrzy na gabaryty (dla `van` liczy trasę osobową). */
export function usesDimensions(kind: VehicleKind): boolean {
  return kind === "truck" || kind === "tractor" || kind === "trailer";
}

/**
 * Buduje profil do `RouteRequest`. Pola nieznane są POMIJANE, a nie zerowane —
 * `heightCm: 0` przeszłoby przez `if (pr.heightCm)` jako fałsz i wyglądało
 * identycznie jak brak, ale w innych adapterach mogłoby polecieć jako realne 0 cm.
 *
 * Masa: DMC = masa własna + ładowność. Liczymy ją tylko gdy ZNANE SĄ OBIE — sama
 * masa własna zaniża wynik dla załadowanego zestawu, a zaniżona masa to przejazd
 * przez most z ograniczeniem tonażu.
 */
export function vehicleRouteProfile(v: FleetVehicle | null): VehicleProfile {
  if (!v) return { kind: "truck" };
  const kind = routingKindOf(v.vehicleType);
  const weightKg =
    v.curbWeightKg != null && v.maxPayloadKg != null ? v.curbWeightKg + v.maxPayloadKg : null;
  return {
    kind,
    ...(v.heightCm != null ? { heightCm: v.heightCm } : {}),
    ...(v.widthCm != null ? { widthCm: v.widthCm } : {}),
    ...(v.lengthCm != null ? { lengthCm: v.lengthCm } : {}),
    ...(weightKg != null ? { weightKg } : {}),
    // Liczby osi nie ma w tabeli `vehicles` — nie wysyłamy jej wcale zamiast wpisywać
    // wymyślone „5". Dostawcy mają własną wartość domyślną i to ona jest uczciwsza
    // niż nasza zmyślona.
  };
}

/**
 * Czego zabrakło w kartotece — do komunikatu „trasa liczona BEZ …".
 * Dla `van` pusta lista: trasa osobowa i tak nie używa gabarytów, więc straszenie
 * kierowcy brakiem wysokości byłoby nieprawdą o tym, co robi kod.
 */
export function missingDimensions(v: FleetVehicle | null): MissingDimension[] {
  const profile = vehicleRouteProfile(v);
  if (!usesDimensions(profile.kind ?? "truck")) return [];
  const out: MissingDimension[] = [];
  if (profile.heightCm == null) out.push("height");
  if (profile.widthCm == null) out.push("width");
  if (profile.lengthCm == null) out.push("length");
  if (profile.weightKg == null) out.push("weight");
  return out;
}

function meters(cm: number | undefined): string {
  return cm == null ? "?" : (cm / 100).toFixed(2).replace(".", ",");
}

/**
 * Podsumowanie gabarytów do paska trasy: „4,00 × 2,55 × 16,50 m · 40,0 t".
 * Brakujące wartości pokazujemy jako `?` — kierowca ma z jednego rzutu oka widzieć,
 * czego routing NIE uwzględnił. Pusty napis dla trybów bez gabarytów (van).
 */
export function formatProfileDims(profile: VehicleProfile): string {
  if (!usesDimensions(profile.kind ?? "truck")) return "";
  const size = `${meters(profile.heightCm)} × ${meters(profile.widthCm)} × ${meters(profile.lengthCm)} m`;
  const mass =
    profile.weightKg == null
      ? "? t"
      : `${(profile.weightKg / 1000).toFixed(1).replace(".", ",")} t`;
  return `${size} · ${mass}`;
}
