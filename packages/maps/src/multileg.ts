import { round2 } from "@e-logistic/core";
import type {
  LatLng,
  RouteNotice,
  RouteRequest,
  RouteResult,
  RouteSegment,
  RoutingProvider,
  TollSection,
} from "./types";

/**
 * Liczy trasę przez wiele punktów (start + przystanki + cel) jako sumę odcinków.
 * Każdy odcinek to osobne zapytanie do dostawcy — dzięki temu mamy myto i dystans
 * z podziałem na odcinki (wymóg ze specyfikacji), niezależnie od dostawcy.
 */
export async function routeMultiLeg(
  provider: RoutingProvider,
  req: RouteRequest,
): Promise<RouteResult> {
  const wps = req.waypoints;
  if (wps.length < 2) throw new RangeError("Trasa wymaga co najmniej 2 punktów.");

  const segments: RouteSegment[] = [];
  const geometry: LatLng[] = [];
  const tollSections: TollSection[] = [];
  let distanceKm = 0;
  let durationMin = 0;
  let tollCost = 0;
  const notices: RouteNotice[] = [];
  const noticeCodes = new Set<string>();
  // #383: „znamy przebieg dróg płatnych" tylko wtedy, gdy KAŻDY leg go zwrócił —
  // jeden leg bez danych oznacza, że sklejona trasa ma białą plamę, a nie że jest
  // tam darmowo. Startujemy od `true`, bo trasa bez legów to i tak RangeError wyżej.
  let tollSectionsKnown = true;
  // Pierwszy leg oddaje geometrię w całości, każdy kolejny bez punktu startowego —
  // on jest już w tablicy jako koniec poprzedniego legu. Flaga zamiast `i === 1`,
  // bo `continue` niżej może zjeść pierwszą iterację i przesunąć całą sklejkę.
  let firstLeg = true;

  for (let i = 1; i < wps.length; i++) {
    const from = wps[i - 1];
    const to = wps[i];
    if (!from || !to) continue;

    const leg = await provider.route({ ...req, waypoints: [from, to] });
    segments.push({
      from,
      to,
      distanceKm: leg.distanceKm,
      tollCost: leg.tollCost,
      durationMin: leg.durationMin,
    });

    // #383: PRZESUNIĘCIE INDEKSÓW. Odcinki płatne przychodzą z dostawcy zaindeksowane
    // wobec geometrii POJEDYNCZEGO legu, a tutaj powstaje jedna wspólna tablica —
    // bez tej korekty warstwa myta podświetlałaby coraz odleglejsze kawałki trasy
    // im dalej od startu. Dla kolejnych legów przesunięcie jest o 1 mniejsze, bo
    // punkt 0 legu = ostatni już wstawiony punkt (zdublowany punkt styku).
    const offset = firstLeg ? geometry.length : geometry.length - 1;
    for (const p of firstLeg ? leg.geometry : leg.geometry.slice(1)) geometry.push(p);
    const lastIndex = geometry.length - 1;
    for (const s of leg.tollSections.sections) {
      const startIndex = Math.max(0, s.startIndex + offset);
      const endIndex = Math.min(lastIndex, s.endIndex + offset);
      // Odcinek krótszy niż dwa punkty nie jest linią — nie ma czego rysować.
      if (endIndex > startIndex) tollSections.push({ startIndex, endIndex });
    }
    if (!leg.tollSections.known) tollSectionsKnown = false;

    firstLeg = false;
    distanceKm += leg.distanceKm;
    durationMin += leg.durationMin;
    tollCost += leg.tollCost;
    // [#384] Uwagi z każdego odcinka trafiają do wyniku całości — ostrzeżenie
    // o zignorowanym gabarycie dotyczy trasy, nawet jeśli padło przy trzecim
    // odcinku z pięciu. Duplikaty odsiewamy po kodzie.
    for (const n of leg.notices) {
      if (!noticeCodes.has(n.code)) {
        noticeCodes.add(n.code);
        notices.push(n);
      }
    }
  }

  return {
    notices,
    distanceKm: round2(distanceKm),
    durationMin: round2(durationMin),
    tollCost: round2(tollCost),
    currency: req.currency ?? "EUR",
    segments,
    geometry,
    tollSections: { known: tollSectionsKnown, sections: tollSections },
    provider: provider.name,
  };
}
