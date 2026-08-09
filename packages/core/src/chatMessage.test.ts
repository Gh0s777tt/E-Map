import { describe, expect, it } from "vitest";
import {
  type ChatViewer,
  canDeleteMessage,
  canEditMessage,
  canManageChannel,
  EDIT_WINDOW_MS,
  isDeleted,
  mapLink,
  quotePreview,
  readChatLocation,
  summarizeReactions,
} from "./chatMessage";

const NOW = Date.parse("2026-08-09T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const author: ChatViewer = { userId: "u-author", role: "driver" };
const otherDriver: ChatViewer = { userId: "u-other", role: "driver" };
const owner: ChatViewer = { userId: "u-owner", role: "owner" };

const msg = (
  over: Partial<{ sender_id: string; created_at: string; deleted_at: string | null }> = {},
) => ({
  sender_id: "u-author",
  created_at: ago(60_000),
  deleted_at: null,
  ...over,
});

describe("canEditMessage", () => {
  it("autor może poprawić świeżą wiadomość", () => {
    expect(canEditMessage(msg(), author, NOW)).toBe(true);
  });

  it("po oknie czasowym już nie — czat bywa dowodem, kto wydał polecenie", () => {
    expect(canEditMessage(msg({ created_at: ago(EDIT_WINDOW_MS + 1000) }), author, NOW)).toBe(
      false,
    );
  });

  it("dokładnie na granicy okna jeszcze wolno", () => {
    expect(canEditMessage(msg({ created_at: ago(EDIT_WINDOW_MS) }), author, NOW)).toBe(true);
  });

  it("nikt obcy nie edytuje cudzej wiadomości", () => {
    expect(canEditMessage(msg(), otherDriver, NOW)).toBe(false);
  });

  it("właściciel też NIE — moderacja to nie prawo do zmiany cudzych słów", () => {
    expect(canEditMessage(msg(), owner, NOW)).toBe(false);
  });

  it("usuniętej wiadomości nie da się edytować", () => {
    expect(canEditMessage(msg({ deleted_at: ago(0) }), author, NOW)).toBe(false);
  });
});

describe("canDeleteMessage", () => {
  it("autor może usunąć bez limitu czasu", () => {
    // Pomyłkowo wysłanego zdjęcia musi dać się cofnąć także po kwadransie.
    expect(canDeleteMessage(msg({ created_at: ago(30 * 86_400_000) }), author)).toBe(true);
  });

  it("zarząd może moderować cudze wiadomości", () => {
    expect(canDeleteMessage(msg(), owner)).toBe(true);
  });

  it("inny kierowca nie może", () => {
    expect(canDeleteMessage(msg(), otherDriver)).toBe(false);
  });

  it("już usuniętej nie usuwamy drugi raz", () => {
    expect(canDeleteMessage(msg({ deleted_at: ago(0) }), author)).toBe(false);
  });
});

describe("canManageChannel", () => {
  it("tylko zarząd ustawia znikanie kanału", () => {
    expect(canManageChannel(owner)).toBe(true);
    expect(canManageChannel({ userId: "d", role: "dispatcher" })).toBe(true);
    expect(canManageChannel(author)).toBe(false);
  });
});

describe("isDeleted", () => {
  it("rozpoznaje miękkie usunięcie", () => {
    expect(isDeleted(msg())).toBe(false);
    expect(isDeleted(msg({ deleted_at: ago(0) }))).toBe(true);
  });
});

describe("summarizeReactions", () => {
  const rows = [
    { message_id: "m1", user_id: "a", emoji: "👍" },
    { message_id: "m1", user_id: "b", emoji: "👍" },
    { message_id: "m1", user_id: "a", emoji: "❤️" },
    { message_id: "m2", user_id: "a", emoji: "😂" },
  ];

  it("zlicza reakcje tylko wskazanej wiadomości", () => {
    const out = summarizeReactions(rows, "m1", "a");
    expect(out.map((r) => r.emoji)).toEqual(["👍", "❤️"]);
    expect(out[0]).toEqual({ emoji: "👍", count: 2, mine: true });
  });

  it("oznacza cudze reakcje jako nie-moje", () => {
    const out = summarizeReactions(rows, "m1", "c");
    expect(out.every((r) => !r.mine)).toBe(true);
  });

  it("częstsza reakcja jest pierwsza", () => {
    const rows2 = [
      { message_id: "m", user_id: "a", emoji: "🙏" },
      { message_id: "m", user_id: "b", emoji: "😮" },
      { message_id: "m", user_id: "c", emoji: "😮" },
    ];
    expect(summarizeReactions(rows2, "m", "a")[0]).toMatchObject({ emoji: "😮", count: 2 });
  });

  it("przy remisie kolejność jest DETERMINISTYCZNA — pasek nie skacze", () => {
    // Nie zakładamy konkretnej kolejności emoji (zależy od locale), tylko tego,
    // że dwa wywołania na tych samych danych dają ten sam wynik — o to chodzi
    // użytkownikowi, któremu reakcje nie mają się przestawiać przy odświeżeniu.
    const tie = [
      { message_id: "m", user_id: "a", emoji: "😮" },
      { message_id: "m", user_id: "b", emoji: "🙏" },
    ];
    const first = summarizeReactions(tie, "m", "a").map((r) => r.emoji);
    const shuffled = [...tie].reverse();
    expect(summarizeReactions(shuffled, "m", "a").map((r) => r.emoji)).toEqual(first);
  });

  it("brak reakcji daje pustą listę", () => {
    expect(summarizeReactions([], "m1", "a")).toEqual([]);
  });
});

describe("quotePreview", () => {
  const labels = { photo: "Zdjęcie", location: "Lokalizacja" };

  it("skraca długi tekst i normalizuje białe znaki", () => {
    const out = quotePreview({ body: `A${" ".repeat(5)}B${"x".repeat(200)}` }, labels);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("  ");
  });

  it("zdjęcie i lokalizacja dostają etykietę — cytat nie może być pusty", () => {
    expect(quotePreview({ body: "", kind: "photo" }, labels)).toBe("Zdjęcie");
    expect(quotePreview({ body: "", kind: "location" }, labels)).toBe("Lokalizacja");
  });

  it("krótki tekst zostaje bez zmian", () => {
    expect(quotePreview({ body: "OK", kind: "text" }, labels)).toBe("OK");
  });
});

describe("readChatLocation", () => {
  it("odczytuje poprawne współrzędne", () => {
    expect(readChatLocation({ lat: 52.23, lng: 21.01, label: "Warszawa" })).toEqual({
      lat: 52.23,
      lng: 21.01,
      label: "Warszawa",
    });
  });

  it("zachowuje równik i południk zerowy — 0 to poprawna współrzędna", () => {
    expect(readChatLocation({ lat: 0, lng: 0 })).toEqual({ lat: 0, lng: 0, label: undefined });
  });

  it("odrzuca dane spoza Ziemi zamiast rysować pinezkę w próżni", () => {
    expect(readChatLocation({ lat: 91, lng: 0 })).toBeNull();
    expect(readChatLocation({ lat: 0, lng: 181 })).toBeNull();
  });

  it("nie wywala się na śmieciach — wadliwa wiadomość nie może zepsuć listy", () => {
    // `meta` to jsonb: może przyjść cokolwiek — stary wpis, uszkodzone dane,
    // zmodyfikowany klient. Zwracamy null, nie rzucamy.
    for (const junk of [null, undefined, "tekst", 42, [], {}, { lat: "52", lng: "21" }]) {
      expect(readChatLocation(junk)).toBeNull();
    }
  });

  it("pusta etykieta jest traktowana jak brak", () => {
    expect(readChatLocation({ lat: 1, lng: 2, label: "   " })?.label).toBeUndefined();
  });
});

describe("mapLink", () => {
  const loc = { lat: 52.2297, lng: 21.0122 };

  it("na telefonie daje geo: — otwiera natywną mapę", () => {
    expect(mapLink(loc, "native")).toBe("geo:52.229700,21.012200?q=52.229700,21.012200");
  });

  it("w przeglądarce daje adres HTTP — geo: nic by tam nie otworzyło", () => {
    const url = mapLink(loc, "web");
    expect(url.startsWith("https://")).toBe(true);
    expect(url).toContain("52.2297");
  });
});
