/**
 * Ekran mapy nie miał ŻADNYCH testów, a liczy gabaryty zestawu, myto i koszt paliwa —
 * czyli dokładnie te rzeczy, których błąd nie jest widoczny na ekranie. Trasa policzona
 * dla samego ciągnika wygląda tak samo jak trasa dla zestawu; różnica ujawnia się pod
 * wiaduktem. Te testy pilnują reguł, których nie wolno „uprościć" przy kolejnej fali.
 */
import type { DriverPosition, Trailer } from "@e-logistic/api";
import type { MessageKey } from "@e-logistic/i18n";
import type { FuelStationPrice, LatLng, Poi, VehicleProfile } from "@e-logistic/maps";
import { describe, expect, it } from "vitest";
import {
  bestDieselPrices,
  buildSharedRoute,
  buildTruckProfile,
  clampBbox,
  countPoiKinds,
  DEFAULT_DIMS,
  describeDelta,
  filterPoisByCards,
  geometryBbox,
  grossWeightKg,
  isProfileOverridden,
  parseSharedRoute,
  positiveInt,
  positiveNumber,
  routeCostTotals,
  sampleGeometryForSearch,
  toRouteVehicle,
  truckPositionFeatures,
  vehicleToFields,
} from "./mapFeatures";
import type { DimsFields, RouteVehicle, Stop, VehicleRow } from "./mapTypes";

/** Tłumacz-atrapa: zwraca sam klucz, więc test sprawdza STRUKTURĘ komunikatu, nie treść. */
const t = (key: MessageKey) => key;

const vehicleRow = (over: Partial<VehicleRow> = {}): VehicleRow =>
  ({
    id: "v1",
    registration: "WX 12345",
    height_cm: 380,
    width_cm: 255,
    length_cm: 700,
    curb_weight_kg: 8000,
    max_payload_kg: 4000,
    axle_count: 2,
    adr_tunnel_code: null,
    emission_class: null,
    trailer_id: null,
    ...over,
  }) as VehicleRow;

const trailer = (over: Partial<Trailer> = {}): Trailer =>
  ({
    id: "n1",
    registration: "WX 99999",
    height_cm: 400,
    width_cm: 255,
    length_cm: 1360,
    curb_weight_kg: 7000,
    max_payload_kg: 25_000,
    axle_count: 3,
    ...over,
  }) as Trailer;

const routeVehicle = (over: Partial<RouteVehicle> = {}): RouteVehicle => ({
  id: "v1",
  registration: "WX 12345",
  heightCm: 400,
  widthCm: 255,
  lengthCm: 1650,
  curbWeightKg: 24_000,
  maxPayloadKg: 0,
  axleCount: 5,
  adrTunnelCode: null,
  emissionClass: null,
  ...over,
});

describe("toRouteVehicle — profil ZESTAWU, nie samego ciągnika", () => {
  it("wysokość bierze z wyższej strony zestawu", () => {
    // Ciągnik 3,80 m + chłodnia 4,00 m to pojazd 4,00 m. Wysokość ciągnika
    // wpuściłaby zestaw pod wiadukt, którego nie przejedzie.
    const v = toRouteVehicle(vehicleRow(), trailer());
    expect(v.heightCm).toBe(400);
  });

  it("osie sumuje, a masy dodaje dopiero gdy znane są OBIE", () => {
    const v = toRouteVehicle(vehicleRow(), trailer());
    expect(v.axleCount).toBe(5);
    expect(grossWeightKg(v)).toBe(12_000 + 32_000);
  });

  it("brak masy naczepy nie może dać masy samego ciągnika", () => {
    // Zaniżona masa to przejazd przez most z ograniczeniem tonażu — lepiej brak parametru.
    const v = toRouteVehicle(vehicleRow(), trailer({ curb_weight_kg: null }));
    expect(grossWeightKg(v)).toBeNull();
  });

  it("z podpiętą naczepą długość zostaje NIEZNANA (spedytor podaje ręcznie)", () => {
    const v = toRouteVehicle(vehicleRow(), trailer());
    expect(v.lengthCm).toBeNull();
    expect(v.rigLengthUnknown).toBe(true);
  });

  it("bez naczepy długość ciągnika jest prawdziwa", () => {
    const v = toRouteVehicle(vehicleRow(), null);
    expect(v.lengthCm).toBe(700);
    expect(v.rigLengthUnknown).toBe(false);
  });

  it("kod ADR i klasa emisji spoza enumu lądują jako brak, nie jako śmieć", () => {
    const v = toRouteVehicle(vehicleRow({ adr_tunnel_code: "Z", emission_class: "euro_9" }), null);
    expect(v.adrTunnelCode).toBeNull();
    expect(v.emissionClass).toBeNull();
  });
});

describe("positiveNumber / positiveInt — puste pole to BRAK, nie zero", () => {
  it("puste, zero i tekst dają brak parametru", () => {
    // Dotąd było `Number(weightT) || 24`: czyszcząc pole dostawało się w ciszy 24 tony.
    expect(positiveNumber("")).toBeUndefined();
    expect(positiveNumber("0")).toBeUndefined();
    expect(positiveNumber("-3")).toBeUndefined();
    expect(positiveNumber("abc")).toBeUndefined();
  });

  it("przecinek dziesiętny czytamy jak kropkę (klawiatura numeryczna PL)", () => {
    expect(positiveNumber("40,5")).toBe(40.5);
  });

  it("liczba całkowita zaokrągla, a nie ucina", () => {
    expect(positiveInt("4,6")).toBe(5);
  });
});

describe("buildTruckProfile — pominięty parametr zamiast zmyślonej wartości", () => {
  const fields = (over: Partial<DimsFields> = {}): DimsFields => ({ ...DEFAULT_DIMS, ...over });

  it("tony zamienia na kilogramy", () => {
    expect(buildTruckProfile(fields({ weightT: "40" })).weightKg).toBe(40_000);
  });

  it("puste pole NIE trafia do żądania (klucza po prostu nie ma)", () => {
    const p = buildTruckProfile(fields({ heightCm: "" }));
    expect("heightCm" in p).toBe(false);
  });

  it("pusty kod ADR to ładunek zwykły, więc też nie jedzie w żądaniu", () => {
    const p = buildTruckProfile(fields({ adrTunnelCode: "" }));
    expect("adrTunnelCode" in p).toBe(false);
  });

  it("kod ADR spoza enumu jest odrzucany, nie przekazywany dalej", () => {
    expect("adrTunnelCode" in buildTruckProfile(fields({ adrTunnelCode: "Z" }))).toBe(false);
    expect(buildTruckProfile(fields({ adrTunnelCode: "C" })).adrTunnelCode).toBe("C");
  });
});

describe("isProfileOverridden — nadpisanie ma być widoczne", () => {
  it("profil zgodny z kartoteką to brak nadpisania", () => {
    const v = routeVehicle();
    const profile = buildTruckProfile({ ...DEFAULT_DIMS, ...vehicleToFields(v).fields });
    expect(isProfileOverridden(v, profile)).toBe(false);
  });

  it("zmiana jednego pola już jest nadpisaniem", () => {
    const v = routeVehicle();
    const f = vehicleToFields(v).fields;
    expect(isProfileOverridden(v, buildTruckProfile({ ...f, heightCm: "420" }))).toBe(true);
  });

  it("bez wybranego pojazdu nie ma z czym porównywać", () => {
    expect(isProfileOverridden(null, buildTruckProfile(DEFAULT_DIMS))).toBe(false);
  });
});

describe("vehicleToFields — brak z kartoteki zostaje PUSTYM polem", () => {
  it("pusta kolumna nie dziedziczy wartości po poprzednim aucie", () => {
    const { fields, incomplete } = vehicleToFields(routeVehicle({ heightCm: null }));
    expect(fields.heightCm).toBe("");
    expect(incomplete).toBe(true);
  });

  it("komplet danych nie każe rozwijać panelu wymiarów", () => {
    expect(vehicleToFields(routeVehicle()).incomplete).toBe(false);
  });

  it("masę pokazujemy w tonach, bo takie jest pole formularza", () => {
    expect(
      vehicleToFields(routeVehicle({ curbWeightKg: 40_000, maxPayloadKg: 0 })).fields.weightT,
    ).toBe("40");
  });
});

describe("link do trasy — zapis i odczyt muszą się spinać", () => {
  const stops: Stop[] = [
    { key: "s-start", label: "Berlin, Niemcy", lat: 52.52, lng: 13.405 },
    { key: "s-end", label: "Warszawa", lat: 52.2297, lng: 21.0122 },
  ];

  it("etykieta z przecinkiem przeżywa podróż w obie strony", () => {
    // Separator pól to przecinek, więc „Berlin, Niemcy" jest tu przypadkiem granicznym.
    const parsed = parseSharedRoute(buildSharedRoute(stops));
    expect(parsed.map((p) => p.label)).toEqual(["Berlin, Niemcy", "Warszawa"]);
  });

  it("jeden punkt to nie trasa — nie podmieniamy celu", () => {
    expect(parseSharedRoute("52.52,13.405,Berlin")).toEqual([]);
  });

  it("brak parametru i śmieci dają pustą listę", () => {
    expect(parseSharedRoute(null)).toEqual([]);
    expect(parseSharedRoute("a,b,X|c,d,Y")).toEqual([]);
  });
});

describe("routeCostTotals", () => {
  it("bez trasy nie ma kosztu — ani zera z rabatem", () => {
    expect(
      routeCostTotals(null, { consumption: "30", fuelPrice: "1.65", fuelDiscount: "0" }),
    ).toEqual({ fuelTotal: 0, grandTotal: 0 });
  });

  it("suma to myto + paliwo, zaokrąglone do groszy", () => {
    const r = routeCostTotals(
      { distanceKm: 100, tollCost: 10 },
      { consumption: "30", fuelPrice: "2", fuelDiscount: "0" },
    );
    expect(r.fuelTotal).toBe(60);
    expect(r.grandTotal).toBe(70);
  });

  it("nieliczbowe spalanie liczy się jako zero, a nie jako NaN na ekranie", () => {
    const r = routeCostTotals(
      { distanceKm: 100, tollCost: 10 },
      { consumption: "", fuelPrice: "2", fuelDiscount: "0" },
    );
    expect(r.fuelTotal).toBe(0);
    expect(r.grandTotal).toBe(10);
  });
});

describe("geometria trasy: bbox i próbkowanie", () => {
  const geo: LatLng[] = [
    { lat: 52.5, lng: 13.4 },
    { lat: 51.0, lng: 17.0 },
    { lat: 52.2, lng: 21.0 },
  ];

  it("bbox obejmuje skrajne punkty trasy", () => {
    expect(geometryBbox(geo)).toEqual({ south: 51, west: 13.4, north: 52.5, east: 21 });
  });

  it("próbkowanie mieści się w limicie TomTom i zachowuje pierwszy oraz ostatni punkt", () => {
    const long: LatLng[] = Array.from({ length: 5000 }, (_, i) => ({
      lat: 50 + i / 1000,
      lng: 15,
    }));
    const sampled = sampleGeometryForSearch(long);
    expect(sampled.length).toBeLessThanOrEqual(100);
    expect(sampled[0]).toEqual(long[0]);
    expect(sampled[sampled.length - 1]).toEqual(long[long.length - 1]);
  });

  it("krótka trasa przechodzi bez zmian", () => {
    expect(sampleGeometryForSearch(geo)).toEqual(geo);
  });
});

describe("clampBbox — zbyt duży prostokąt dostawca odrzuca", () => {
  it("przycina do zadanej szerokości WOKÓŁ ŚRODKA, nie od krawędzi", () => {
    const b = clampBbox({ west: 10, south: 40, east: 20, north: 50 }, 2);
    expect(b).toEqual({ west: 14, south: 44, east: 16, north: 46 });
  });

  it("mały prostokąt zostaje nietknięty", () => {
    const small = { west: 14, south: 52, east: 15, north: 53 };
    expect(clampBbox(small, 2)).toEqual(small);
  });
});

describe("POI: filtr kart flotowych i legenda", () => {
  const poi = (over: Partial<Poi>): Poi => ({
    id: "p1",
    type: "fuel_station",
    name: "Stacja",
    lat: 52,
    lng: 21,
    tags: {},
    ...over,
  });
  const pois: Poi[] = [
    poi({ id: "shell", name: "Shell Autohof" }),
    poi({ id: "orlen", name: "Orlen" }),
    poi({ id: "park", type: "parking", name: "Parking A2" }),
  ];

  it("parking zostaje ZAWSZE — kartą flotową się nie parkuje", () => {
    const out = filterPoisByCards(pois, ["shell"], true);
    expect(out.map((p) => p.id)).toEqual(["shell", "park"]);
  });

  it("wyłączony filtr i pusty zestaw marek nie odsiewają niczego", () => {
    expect(filterPoisByCards(pois, ["shell"], false)).toHaveLength(3);
    expect(filterPoisByCards(pois, [], true)).toHaveLength(3);
  });

  it("legenda liczy to, co naprawdę leży na mapie", () => {
    expect(countPoiKinds(pois)).toEqual({ fuel: 2, parking: 1 });
  });
});

describe("bestDieselPrices", () => {
  const station = (id: string, diesel: number | null): FuelStationPrice =>
    ({ id, name: id, brand: id, lat: 52, lng: 13, diesel, isOpen: true }) as FuelStationPrice;

  it("stacja bez ceny diesla nie ma czego pokazać", () => {
    expect(bestDieselPrices([station("a", null), station("b", 1.7)]).map((s) => s.id)).toEqual([
      "b",
    ]);
  });

  it("sortuje od najtańszej i ucina do ośmiu pozycji", () => {
    const many = Array.from({ length: 12 }, (_, i) => station(`s${i}`, 2 - i / 100));
    const out = bestDieselPrices(many);
    expect(out).toHaveLength(8);
    expect(out[0]?.id).toBe("s11");
  });
});

describe("truckPositionFeatures — filtr świeżości pozycji", () => {
  const now = Date.UTC(2026, 7, 20, 12, 0, 0);
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const row = (over: Partial<DriverPosition>): DriverPosition => ({
    user_id: "u1",
    company_id: "c1",
    lat: 52,
    lng: 21,
    speed_kmh: null,
    heading: null,
    updated_at: minutesAgo(1),
    ...over,
  });

  it("stara pozycja znika z mapy, ale jest POLICZONA", () => {
    // „Nie wiemy, gdzie jest" to informacja — dyspozytor nie może planować objazdu
    // wg auta, którego tam dawno nie ma.
    const view = truckPositionFeatures(
      [row({ user_id: "swiezy" }), row({ user_id: "stary", updated_at: minutesAgo(120) })],
      { now, staleAfterMin: 30, freshOnly: true },
      t,
    );
    expect(view.data.features).toHaveLength(1);
    expect(view.total).toBe(2);
    expect(view.hidden).toBe(1);
  });

  it("wyłączony filtr pokazuje wszystko i nic nie ukrywa", () => {
    const view = truckPositionFeatures(
      [row({}), row({ updated_at: minutesAgo(600) })],
      { now, staleAfterMin: 30, freshOnly: false },
      t,
    );
    expect(view.data.features).toHaveLength(2);
    expect(view.hidden).toBe(0);
  });

  it("kolor kropki idzie za wiekiem pozycji", () => {
    const colors = [1, 20, 200].map(
      (m) =>
        truckPositionFeatures(
          [row({ updated_at: minutesAgo(m) })],
          {
            now,
            staleAfterMin: 30,
            freshOnly: false,
          },
          t,
        ).data.features[0]?.properties.color,
    );
    expect(colors).toEqual(["#22c55e", "#f59e0b", "#6b7280"]);
  });

  it("brak kursu NIE dokłada klucza `heading` (filtr warstwy to `has`)", () => {
    const view = truckPositionFeatures(
      [row({ heading: null })],
      {
        now,
        staleAfterMin: 30,
        freshOnly: false,
      },
      t,
    );
    expect("heading" in (view.data.features[0]?.properties ?? {})).toBe(false);
  });

  it("kurs ujemny i powyżej 360° sprowadzamy do 0–359°", () => {
    const head = (heading: number) =>
      truckPositionFeatures([row({ heading })], { now, staleAfterMin: 30, freshOnly: false }, t)
        .data.features[0]?.properties.heading;
    expect(head(-90)).toBe(270);
    expect(head(450)).toBe(90);
  });
});

describe("describeDelta — różnica trasy po dodaniu miejsca", () => {
  it("pomijalna różnica mówi wprost, że nic się nie zmieniło", () => {
    const msg = describeDelta(
      "Baza",
      { distanceKm: 0, durationMin: 0, tollEur: 0, longer: false, negligible: true },
      t,
    );
    expect(msg).toContain("mapPage.deltaNoChange");
  });

  it("dłuższa i droższa trasa niesie komplet trzech informacji", () => {
    const msg = describeDelta(
      "Serwis",
      { distanceKm: 12, durationMin: 15, tollEur: 3.5, longer: true, negligible: false },
      t,
    );
    expect(msg).toContain("mapPage.deltaLonger");
    expect(msg).toContain("mapPage.deltaSlower");
    expect(msg).toContain("mapPage.deltaPricier");
  });

  it("skrócenie trasy nie może zostać opisane jako wydłużenie", () => {
    const msg = describeDelta(
      "Skrót",
      { distanceKm: -8, durationMin: -10, tollEur: -2, longer: false, negligible: false },
      t,
    );
    expect(msg).toContain("mapPage.deltaShorter");
    expect(msg).toContain("mapPage.deltaFaster");
    expect(msg).toContain("mapPage.deltaCheaper");
    // Dystans pokazujemy jako wartość bezwzględną — znak niesie już słowo „krótsza".
    expect(msg).toContain("8 km");
  });
});

describe("DEFAULT_DIMS", () => {
  it("wartości startowe dają kompletny profil, bez znaków zapytania", () => {
    const p: VehicleProfile = buildTruckProfile(DEFAULT_DIMS);
    expect(p.weightKg).toBe(24_000);
    expect(p.heightCm).toBe(400);
    expect(p.widthCm).toBe(255);
    expect(p.lengthCm).toBe(1650);
    expect(p.axleCount).toBe(5);
  });
});
