import "server-only";

import type { StoredPushSubscription } from "@e-logistic/api";
import { createSupabaseAdminClient, deletePushSubscription } from "@e-logistic/api";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/** Czy push jest skonfigurowany na serwerze (klucze VAPID). */
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

/**
 * Wysyła powiadomienie do listy subskrypcji. Wymaga kluczy VAPID w env.
 * Subskrypcje wygasłe (404/410) są usuwane. Zwraca licznik wysłanych/usuniętych.
 */
export async function sendPushTo(
  subs: StoredPushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!pushConfigured() || subs.length === 0) return { sent: 0, removed: 0 };

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@e-logistic.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  const admin = createSupabaseAdminClient();

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await deletePushSubscription(admin, s.endpoint).catch(() => {});
          removed++;
        }
      }
    }),
  );

  return { sent, removed };
}
