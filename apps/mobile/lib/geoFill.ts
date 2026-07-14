/**
 * #343: autouzupełnianie miejsca z lokalizacji (GPS + reverse-geocode) do
 * formularzy Trip/Paliwo/AdBlue — kraj (ISO), miejscowość i kod pocztowy.
 * Fail-safe: brak zgody/uprawnień → zwraca null, formularz działa ręcznie.
 */
import * as Location from "expo-location";

export interface PlaceFill {
  country: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
}

/** Kraje, dla których pokazujemy pole kodu pocztowego (Anglia/UK i okolice). */
export function requiresPostcode(country: string): boolean {
  const c = country.trim().toUpperCase();
  return [
    "UK",
    "GB",
    "GBR",
    "EN",
    "ENG",
    "ENGLAND",
    "ANGLIA",
    "WALES",
    "SCOTLAND",
    "IE",
    "NL",
  ].includes(c);
}

/** #354: twardy timeout — GPS/reverse-geocode potrafią wisieć, a wtedy przycisk
 * „Uzupełnij z lokalizacji" zostawał w stanie busy. Race gwarantuje rozstrzygnięcie. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("location timeout")), ms)),
  ]);
}

/** Pobiera bieżącą pozycję i odczytuje z niej kraj/miasto/kod pocztowy. */
export async function fillFromLocation(): Promise<PlaceFill | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const req = perm.granted ? perm : await Location.requestForegroundPermissionsAsync();
    if (!req.granted) return null;
    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      12_000,
    );
    const [place] = await withTimeout(
      Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      12_000,
    );
    return {
      country: (place?.isoCountryCode ?? place?.country ?? "").toUpperCase(),
      city: place?.city ?? place?.subregion ?? "",
      postcode: place?.postalCode ?? "",
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}
