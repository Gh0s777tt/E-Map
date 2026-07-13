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

/** Pobiera bieżącą pozycję i odczytuje z niej kraj/miasto/kod pocztowy. */
export async function fillFromLocation(): Promise<PlaceFill | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const req = perm.granted ? perm : await Location.requestForegroundPermissionsAsync();
    if (!req.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [place] = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
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
