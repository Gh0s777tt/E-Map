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

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
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
  if (memHits.size > 5000) memHits.clear(); // strażnik pamięci (proces współdzielony)
  return hits.length <= limit;
}

/**
 * Sprawdza limit dla danej akcji. Zwraca `{ ok }`. Gdy Upstash nieustawiony → zawsze `ok:true`.
 * Użycie w route: `if (!(await rateLimit(request, "route")).ok) return new Response(..., { status: 429 });`
 */
export async function rateLimit(req: Request, action: string): Promise<{ ok: boolean }> {
  const limiter = getLimiter();
  const key = `${action}:${clientIp(req)}`;
  if (!limiter) return { ok: true };
  try {
    const { success } = await limiter.limit(key);
    return { ok: success };
  } catch {
    // Upstash niedostępny — zamiast fail-open dajemy fallback in-memory (proces-lokalny).
    return { ok: memLimit(key) };
  }
}
