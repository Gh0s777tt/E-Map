import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate-limiting endpointów (P2 z audytu). Aktywny tylko, gdy ustawione są zmienne
 * Upstash (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) — inaczej no-op
 * (build/lokalnie/bez klucza działa bez limitów). Sliding window per IP+akcja.
 */
let cached: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    prefix: "elog:rl",
    analytics: false,
  });
  return cached;
}

/**
 * Klucz per-klient dla limitu. NIE ufamy skrajnie-lewej wartości `x-forwarded-for` — jest
 * sterowana przez klienta i pozwala rotować klucz, omijając limit (audyt N18). Preferujemy
 * nagłówki nadpisywane przez proxy platformy (Vercel: `x-vercel-forwarded-for` / `x-real-ip`);
 * jako ostateczność bierzemy skrajnie PRAWY wpis XFF (dodany przez infrastrukturę, nie klienta).
 */
function clientIp(req: Request): string {
  const trusted = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (trusted?.trim()) return trusted.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",");
    const rightmost = parts[parts.length - 1]?.trim();
    if (rightmost) return rightmost;
  }
  return "anon";
}

/**
 * Fallback in-memory (proces-lokalny, zgrubny) — używany TYLKO gdy Upstash padnie.
 * Zamiast czystego fail-open daje choć podstawową ochronę w obrębie instancji.
 * Sliding window: maks. `limit` trafień w `windowMs`.
 */
const memHits = new Map<string, number[]>();
function memLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (memHits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memHits.set(key, hits);
  // #368: strażnik pamięci NIE może czyścić całej mapy — `clear()` kasował liczniki
  // WSZYSTKICH klientów i akcji, więc ruch z 5000 różnych kluczy (botnet albo rotacja
  // nagłówka IP) zerował ochronę, m.in. anty-brute-force passkey. Eksmitujemy najstarsze
  // wpisy (Map zachowuje kolejność wstawiania), zostawiając liczniki bieżących klientów.
  while (memHits.size > 5000) {
    const oldest = memHits.keys().next();
    if (oldest.done) break;
    memHits.delete(oldest.value);
  }
  return hits.length <= limit;
}

/** Komunikaty degradacji — stałe, bo służą też za klucz „raz na proces" i za kryterium odbioru. */
export const RATE_LIMIT_DEGRADACJA = {
  brakKonfiguracji:
    "Rate-limit: brak konfiguracji Upstash na produkcji — działa wyłącznie fallback in-memory.",
  bladUpstash:
    "Rate-limit: wywołanie Upstash zakończone błędem — działa fallback in-memory (zły token/URL albo awaria usługi).",
} as const;

/**
 * Sygnał degradacji rate-limitu — wysyłany RAZ NA PROCES dla każdej przyczyny osobno
 * (inaczej zalałby Sentry przy każdym żądaniu). Repo nie loguje do konsoli, więc jedynym
 * kanałem jest obserwowalność wpięta w #306.
 *
 * Raportujemy OBIE przyczyny, nie tylko brak zmiennych. Fallback in-memory ma dokładnie ten
 * sam próg co Upstash (30/60 s), więc z zewnątrz degradacja jest NIEWIDOCZNA: żądanie 31.
 * dostaje 429 tak samo przy działającym limiterze, jak przy zepsutym tokenie. Dopóki gałąź
 * `catch` milczała, literówka w tokenie przy rotacji nie zostawiała ŻADNEGO śladu, a runbook
 * uczył operatora, że brak alertu = sukces — przy N instancjach Vercela realny limit robił się
 * N×30/60 s, w tym na anty-brute-force logowania passkey. Celowo bez treści błędu: to jedyne
 * miejsce, w którym mogłaby wyciec wartość poświadczenia.
 */
const zgloszoneDegradacje = new Set<string>();
function reportDegradation(message: string): void {
  if (zgloszoneDegradacje.has(message)) return;
  zgloszoneDegradacje.add(message);
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureMessage(message, "warning"))
    .catch(() => {
      // brak Sentry (np. bez DSN) — degradacja i tak zadziałała, nie przerywamy żądania
    });
}

/**
 * Sprawdza limit dla danej akcji. Zwraca `{ ok }`. Bez Upstash: na produkcji fallback
 * in-memory (proces-lokalny), poza produkcją bez limitów.
 * Użycie w route: `if (!(await rateLimit(request, "route")).ok) return new Response(..., { status: 429 });`
 */
export async function rateLimit(req: Request, action: string): Promise<{ ok: boolean }> {
  const limiter = getLimiter();
  const key = `${action}:${clientIp(req)}`;
  if (!limiter) {
    // #368: brak zmiennych Upstash NIE może po cichu wyłączać ochrony na produkcji —
    // to fail-open na warstwie chroniącej logowanie passkey (brute-force) i płatne API
    // (HERE/TomTom). Błąd deployu albo rotacja sekretu wystarczały, by limity zniknęły
    // bez żadnego sygnału. Na produkcji degradujemy do fallbacku in-memory (jak przy
    // awarii Upstash) i raportujemy to raz do Sentry; lokalnie/dev zostaje bez limitów.
    if (process.env.NODE_ENV === "production") {
      reportDegradation(RATE_LIMIT_DEGRADACJA.brakKonfiguracji);
      return { ok: memLimit(key) };
    }
    return { ok: true };
  }
  try {
    const { success } = await limiter.limit(key);
    return { ok: success };
  } catch {
    // Upstash niedostępny albo odrzucił poświadczenia — zamiast fail-open dajemy fallback
    // in-memory (proces-lokalny) i MÓWIMY o tym, bo po samych odpowiedziach HTTP tej
    // degradacji nie da się odróżnić od działającego limitera (ten sam próg 30/60 s).
    reportDegradation(RATE_LIMIT_DEGRADACJA.bladUpstash);
    return { ok: memLimit(key) };
  }
}
