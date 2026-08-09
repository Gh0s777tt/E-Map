/**
 * [#374] Reguły prezentacji i uprawnień wiadomości czatu.
 *
 * Wydzielone do `core`, bo web i mobile renderują dymek osobno i bez wspólnego
 * źródła prawdy rozjadą się w tym, kto może edytować, a kto usunąć. Rozjazd
 * byłby cichy: interfejs pokazałby akcję, a baza odrzuciłaby ją dopiero po
 * kliknięciu — i wtedy trzeba by tłumaczyć użytkownikowi błąd, który sami
 * wygenerowaliśmy.
 *
 * Reguły MUSZĄ odpowiadać politykom RLS z migracji 0094:
 *   messages_update: sender_id = auth.uid() OR has_role(company, owner|dispatcher)
 *   messages_delete: has_role(company, owner|dispatcher)   ← twarde, tu nieużywane
 * Usuwanie z interfejsu jest miękkie (UPDATE deleted_at), więc podlega
 * `messages_update`, nie `messages_delete`.
 */

/** Minimum, jakiego potrzebują reguły — nie cała `ChatMessage` z warstwy danych. */
export interface ChatMessageLike {
  sender_id: string;
  created_at: string;
  deleted_at?: string | null;
}

/** Kto pyta: identyfikator i rola w firmie wątku. */
export interface ChatViewer {
  userId: string;
  role: "owner" | "dispatcher" | "driver" | "developer";
}

/**
 * Okno edycji własnej wiadomości.
 *
 * Ograniczenie czasowe jest świadome: czat w firmie transportowej bywa dowodem,
 * kto wydał polecenie kierowcy. Możliwość poprawienia treści sprzed tygodnia,
 * już po zdarzeniu drogowym, podważałaby wartość całej historii. Kwadrans
 * wystarcza na literówkę i nie wystarcza na przepisywanie faktów.
 */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

const MANAGERS = new Set(["owner", "dispatcher"]);

/** Czy wiadomość jest już usunięta (miękko) — wtedy żadna akcja nie ma sensu. */
export function isDeleted(m: ChatMessageLike): boolean {
  return m.deleted_at != null;
}

/**
 * Czy `viewer` może edytować wiadomość. Wyłącznie autor i wyłącznie w oknie
 * czasowym — zarząd celowo NIE może zmieniać cudzych słów, choć może je usunąć.
 * Prawo do poprawienia cudzej wypowiedzi to co innego niż prawo do moderacji.
 */
export function canEditMessage(m: ChatMessageLike, viewer: ChatViewer, nowMs: number): boolean {
  if (isDeleted(m)) return false;
  if (m.sender_id !== viewer.userId) return false;
  return nowMs - Date.parse(m.created_at) <= EDIT_WINDOW_MS;
}

/**
 * Czy `viewer` może usunąć wiadomość: autor zawsze (bez limitu czasu — inaczej
 * pomyłkowo wysłanego zdjęcia nie dałoby się cofnąć) albo zarząd (moderacja).
 */
export function canDeleteMessage(m: ChatMessageLike, viewer: ChatViewer): boolean {
  if (isDeleted(m)) return false;
  return m.sender_id === viewer.userId || MANAGERS.has(viewer.role);
}

/** Czy `viewer` może ustawiać znikanie dla całego kanału. */
export function canManageChannel(viewer: ChatViewer): boolean {
  return MANAGERS.has(viewer.role);
}

/** Reakcje jednej wiadomości, zwinięte do listy „emoji × ile × czy moja". */
export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

/**
 * Zwija surowe wiersze reakcji do postaci gotowej do renderu.
 * Kolejność: najczęstsze pierwsze, przy remisie alfabetycznie — żeby pasek
 * reakcji nie skakał przy każdym odświeżeniu.
 */
export function summarizeReactions(
  rows: readonly { message_id: string; user_id: string; emoji: string }[],
  messageId: string,
  myUserId: string,
): ReactionSummary[] {
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const r of rows) {
    if (r.message_id !== messageId) continue;
    const cur = counts.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.user_id === myUserId) cur.mine = true;
    counts.set(r.emoji, cur);
  }
  return [...counts.entries()]
    .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

/** Najczęściej używane reakcje — pasek szybkiego wyboru nad pełnym pickerem. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

/**
 * Skrót treści do cytatu. Zdjęcia i lokalizacje nie mają tekstu, więc dostają
 * etykietę zastępczą — inaczej cytat byłby pustym prostokątem.
 */
export function quotePreview(
  m: { body: string; kind?: string | null },
  labels: { photo: string; location: string },
  maxLen = 80,
): string {
  if (m.kind === "photo") return labels.photo;
  if (m.kind === "location") return labels.location;
  const body = m.body.trim().replace(/\s+/g, " ");
  return body.length > maxLen ? `${body.slice(0, maxLen - 1)}…` : body;
}

/** Opcje znikania kanału, w sekundach. `null` = wyłączone. */
export const TTL_OPTIONS: { seconds: number | null; labelKey: string }[] = [
  { seconds: null, labelKey: "chat.ttl.off" },
  { seconds: 5, labelKey: "chat.ttl.5s" },
  { seconds: 60, labelKey: "chat.ttl.1m" },
  { seconds: 3600, labelKey: "chat.ttl.1h" },
  { seconds: 86_400, labelKey: "chat.ttl.1d" },
  { seconds: 604_800, labelKey: "chat.ttl.7d" },
];
