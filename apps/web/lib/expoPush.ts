/**
 * Wysyłka powiadomień push do aplikacji mobilnej przez Expo Push API.
 * Nie wymaga sekretu (Expo akceptuje tokeny `ExponentPushToken[...]`); opcjonalny
 * `EXPO_ACCESS_TOKEN` zwiększa limity. Wywoływane po stronie serwera.
 */
const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface ExpoMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function isExpoToken(t: string): boolean {
  return t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[");
}

/** Wysyła jedno powiadomienie do wielu tokenów Expo. Zwraca liczbę zaadresowanych. */
export async function sendExpoPush(tokens: string[], msg: ExpoMessage): Promise<{ sent: number }> {
  const valid = tokens.filter(isExpoToken);
  if (valid.length === 0) return { sent: 0 };

  const messages = valid.map((to) => ({
    to,
    title: msg.title,
    body: msg.body,
    sound: "default" as const,
    data: msg.data ?? {},
  }));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  try {
    await fetch(EXPO_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });
    return { sent: valid.length };
  } catch {
    // Best-effort — powiadomienie w aplikacji i tak powstaje przez trigger.
    return { sent: 0 };
  }
}
