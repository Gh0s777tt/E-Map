/**
 * Testy wspólnego rdzenia kolejki offline-first.
 *
 * Outbox trzyma dane, których nie da się odtworzyć: tankowanie wpisane w terenie
 * bez zasięgu istnieje wyłącznie w telefonie kierowcy, dopóki nie dotrze do bazy.
 * Dlatego każdy scenariusz poniżej pyta o jedno: czy w tej sytuacji wpis może
 * zniknąć albo polecieć do bazy dwa razy. Regresje mają numery updatów — to te
 * błędy, które już raz kosztowały dane.
 */
import { describe, expect, it, vi } from "vitest";
import {
  type AsyncOutboxStorage,
  countPendingOutbox,
  createAsyncOutboxQueue,
  createOutboxSync,
  createSyncOutboxQueue,
  dropFromOutbox,
  filterOutboxByKind,
  insertIntoOutbox,
  isOutboxItemForeign,
  newOutboxItem,
  type OutboxItem,
  type OutboxSendResult,
  outboxErrorMessage,
  parseOutbox,
  patchOutbox,
  pendingOutboxItems,
  pruneOutbox,
  type SyncOutboxStorage,
  serializeOutbox,
  withOccurredAt,
} from "./outbox";

type Kind = "fuel" | "chat";
type Item = OutboxItem<Kind, { note: string }>;

const T0 = "2026-08-01T10:00:00.000Z";

const item = (over: Partial<Item> = {}): Item => ({
  id: "a",
  kind: "fuel",
  input: { note: "tankowanie" },
  status: "queued",
  createdAt: T0,
  ...over,
});

/** Namiastka `localStorage`: synchroniczna, wspólna dla wszystkich odczytów. */
function syncStore(raw: string | null = null) {
  let value = raw;
  let writes = 0;
  const storage: SyncOutboxStorage = {
    read: () => value,
    write: (v) => {
      value = v;
      writes += 1;
    },
  };
  return {
    storage,
    /** Podmiana „z zewnątrz" — tak wygląda zapis z drugiej karty przeglądarki. */
    put: (v: string | null) => {
      value = v;
    },
    raw: () => value,
    items: () => parseOutbox<Item>(value),
    writes: () => writes,
  };
}

/**
 * Odsunięcie o kilka mikrozadań. Świadomie BEZ `setTimeout`: `packages/core`
 * kompiluje się bez DOM i bez typów Node (to jest ta niezależność od platformy,
 * której pilnujemy), a mikrozadania i tak wystarczą — wyścig, o który tu chodzi,
 * rozgrywa się między `await` odczytu a `await` zapisu.
 */
async function tick(razy = 1): Promise<void> {
  for (let i = 0; i < razy; i++) await Promise.resolve();
}

/** Namiastka `AsyncStorage`: każdy odczyt i zapis to osobne zadanie pętli zdarzeń. */
function asyncStore(opoznienie = 1) {
  let value: string | null = null;
  let writes = 0;
  const storage: AsyncOutboxStorage = {
    read: async () => {
      await tick(opoznienie);
      return value;
    },
    write: async (v) => {
      await tick(opoznienie);
      value = v;
      writes += 1;
    },
  };
  return { storage, items: () => parseOutbox<Item>(value), writes: () => writes };
}

describe("parseOutbox — odczyt ze storage'u, który bywa uszkodzony", () => {
  it("brak wartości → pusta kolejka", () => {
    expect(parseOutbox(null)).toEqual([]);
    expect(parseOutbox(undefined)).toEqual([]);
    expect(parseOutbox("")).toEqual([]);
  });

  it("uszkodzony JSON → pusta kolejka zamiast wyjątku (przerwany zapis, [#221])", () => {
    expect(parseOutbox('[{"id":"a","kind":"fuel"')).toEqual([]);
    expect(parseOutbox("{to nie jest json")).toEqual([]);
  });

  it("poprawny JSON, ale nie tablica → pusta kolejka", () => {
    // Regresja realna: `JSON.parse("{}")` NIE rzuca, więc stary kod oddawał obiekt,
    // a pierwszy `.filter` na ekranie historii wywracał cały widok.
    expect(parseOutbox("{}")).toEqual([]);
    expect(parseOutbox("5")).toEqual([]);
    expect(parseOutbox('"tekst"')).toEqual([]);
    expect(parseOutbox("null")).toEqual([]);
  });

  it("odrzuca wpisy nie do uratowania, resztę ZOSTAWIA", () => {
    const raw = JSON.stringify([
      null,
      "tekst",
      { kind: "fuel" }, // bez id — nie da się ani zsynchronizować, ani usunąć
      { id: "", kind: "fuel" },
      { id: "b" }, // bez kind — nie wiadomo, do której tabeli
      item({ id: "c" }),
    ]);
    expect(parseOutbox<Item>(raw).map((i) => i.id)).toEqual(["c"]);
  });

  it("nieznany status → `queued`, NIGDY `synced`", () => {
    // Fałszywe „wysłane" to wpis, którego już nikt nie ponowi — czyli utrata danych.
    const raw = JSON.stringify([
      { ...item(), status: "wysłane" },
      { ...item({ id: "b" }), status: undefined },
    ]);
    expect(parseOutbox<Item>(raw).map((i) => i.status)).toEqual(["queued", "queued"]);
  });

  it("zachowuje ładunek, datę, błąd i właściciela wpisu", () => {
    const raw = serializeOutbox([
      item({ status: "error", error: "DB padło", userId: "u1", input: { note: "AdBlue" } }),
    ]);
    expect(parseOutbox<Item>(raw)[0]).toEqual({
      id: "a",
      kind: "fuel",
      input: { note: "AdBlue" },
      status: "error",
      createdAt: T0,
      error: "DB padło",
      userId: "u1",
    });
  });

  it("nie-tekstowy błąd i brakująca data nie kasują wpisu", () => {
    const raw = JSON.stringify([{ id: "a", kind: "fuel", input: {}, status: "error", error: 500 }]);
    const parsed = parseOutbox<Item>(raw)[0];
    expect(parsed?.error).toBeUndefined();
    expect(parsed?.createdAt).toBe("");
  });

  it("duplikat po id → zostaje pierwszy (kolejka jest od najnowszych)", () => {
    const raw = serializeOutbox([
      item({ input: { note: "nowszy" } }),
      item({ input: { note: "starszy" } }),
    ]);
    const parsed = parseOutbox<Item>(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.input.note).toBe("nowszy");
  });

  it("KRYTYCZNE: gdy którykolwiek duplikat jest `synced`, wygrywa `synced`", () => {
    // Wyścig read-modify-write potrafił zapisać ten sam wpis dwa razy w różnych
    // statusach. Zostawienie kopii `queued` = ponowna wysyłka czegoś, co backend
    // już potwierdził — dokładnie ten duplikat, którego szukało QA [#221].
    const raw = serializeOutbox([item({ status: "queued" }), item({ status: "synced" })]);
    const parsed = parseOutbox<Item>(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.status).toBe("synced");
    expect(parsed[0]?.error).toBeUndefined();
  });

  it("`synced` przed duplikatem `error` nie cofa się do błędu", () => {
    const raw = serializeOutbox([
      item({ status: "synced" }),
      item({ status: "error", error: "x" }),
    ]);
    expect(parseOutbox<Item>(raw)[0]?.status).toBe("synced");
  });

  it("round-trip serialize → parse zachowuje kolejność", () => {
    const items = [item({ id: "c" }), item({ id: "b" }), item({ id: "a" })];
    expect(parseOutbox<Item>(serializeOutbox(items)).map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});

describe("newOutboxItem", () => {
  it("nowy wpis startuje jako `queued` z własnym id", () => {
    const a = newOutboxItem("fuel", { note: "x" }, T0);
    const b = newOutboxItem("fuel", { note: "x" }, T0);
    expect(a.status).toBe("queued");
    expect(a.createdAt).toBe(T0);
    expect(a.id).not.toBe(b.id);
  });

  it("bez podanego właściciela pole `userId` w ogóle nie powstaje", () => {
    // Web nie zna sesji w momencie zapisu i świadomie nie stempluje wpisów —
    // pusty klucz zamiast `null` zostawia rozróżnienie „nie dotyczy" vs „niczyj".
    expect("userId" in newOutboxItem("fuel", {}, T0)).toBe(false);
  });

  it("`null` (głęboki offline) zapisuje się jawnie jako wpis niczyj", () => {
    expect(newOutboxItem("fuel", {}, T0, null).userId).toBeNull();
    expect(newOutboxItem("fuel", {}, T0, "u1").userId).toBe("u1");
  });
});

describe("kolejność i deduplikacja kolejki", () => {
  it("nowy wpis ląduje na początku (ekrany pokazują od najnowszych)", () => {
    const q = insertIntoOutbox([item({ id: "a" })], item({ id: "b" }));
    expect(q.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("wpis o istniejącym id nie tworzy drugiej kopii", () => {
    const q = insertIntoOutbox([item({ id: "a", status: "error" })], item({ id: "a" }));
    expect(q).toHaveLength(1);
    expect(q[0]?.status).toBe("queued");
  });

  it("nie mutuje wejściowej tablicy", () => {
    const source = [item({ id: "a" })];
    insertIntoOutbox(source, item({ id: "b" }));
    expect(source).toHaveLength(1);
  });

  it("filtr po rodzaju zachowuje kolejność, brak filtru oddaje kopię", () => {
    const items = [
      item({ id: "a", kind: "chat" }),
      item({ id: "b" }),
      item({ id: "c", kind: "chat" }),
    ];
    expect(filterOutboxByKind(items, "chat").map((i) => i.id)).toEqual(["a", "c"]);
    const all = filterOutboxByKind(items);
    expect(all).toEqual(items);
    expect(all).not.toBe(items);
  });
});

describe("patchOutbox — podmiana statusu jednego wpisu", () => {
  it("rusza wyłącznie wskazany wpis", () => {
    const items = [item({ id: "a" }), item({ id: "b" })];
    const next = patchOutbox(items, "b", { status: "synced" });
    expect(next?.map((i) => i.status)).toEqual(["queued", "synced"]);
  });

  it("KRYTYCZNE: wpisu usuniętego w międzyczasie NIE wskrzesza ([#390])", () => {
    // `null` mówi wołającemu: nie zapisuj niczego. Usunięcie jest świadomą decyzją
    // użytkownika i musi wygrać z synchronizacją, która wystartowała wcześniej —
    // inaczej użytkownik widzi „skasowałem, a wrócił".
    expect(patchOutbox([item({ id: "a" })], "b", { status: "synced" })).toBeNull();
    expect(patchOutbox([], "a", { status: "synced" })).toBeNull();
  });

  it("udany zapis czyści stary komunikat błędu", () => {
    const next = patchOutbox([item({ status: "error", error: "brak sieci" })], "a", {
      status: "synced",
    });
    expect(next?.[0]?.error).toBeUndefined();
  });

  it("nie mutuje wejścia (snapshot wołającego zostaje nietknięty)", () => {
    const items = [item()];
    patchOutbox(items, "a", { status: "synced", error: "x" });
    expect(items[0]?.status).toBe("queued");
  });

  it("usunięcie zostawia resztę kolejki nietkniętą", () => {
    const items = [item({ id: "a" }), item({ id: "b" })];
    expect(dropFromOutbox(items, "a").map((i) => i.id)).toEqual(["b"]);
    expect(dropFromOutbox(items, "nieznane")).toHaveLength(2);
  });
});

describe("polityka ponowień", () => {
  const items = [
    item({ id: "a", status: "queued" }),
    item({ id: "b", status: "synced" }),
    item({ id: "c", status: "error" }),
  ];

  it("ponawiamy queued I error — błąd bywa chwilowy (wygasła sesja, brak firmy)", () => {
    expect(pendingOutboxItems(items).map((i) => i.id)).toEqual(["a", "c"]);
    expect(countPendingOutbox(items)).toBe(2);
  });

  it("`synced` nigdy nie wraca do ponowienia (brak duplikatu w bazie)", () => {
    expect(pendingOutboxItems(items).some((i) => i.id === "b")).toBe(false);
  });

  it("kolejność ponowień = kolejność kolejki (start i stop trasy niosą sens)", () => {
    expect(pendingOutboxItems([...items].reverse()).map((i) => i.id)).toEqual(["c", "a"]);
  });
});

describe("pruneOutbox — przycinanie kolejki", () => {
  const now = Date.parse("2026-08-01T12:00:00.000Z");
  const stary = new Date(now - 10 * 60_000).toISOString();
  const swiezy = new Date(now - 60_000).toISOString();
  const opts = { kinds: ["chat"], keepMs: 5 * 60_000, now };

  it("kasuje potwierdzoną wiadomość czatu starszą niż okno", () => {
    const kept = pruneOutbox(
      [item({ id: "a", kind: "chat", status: "synced", createdAt: stary })],
      opts,
    );
    expect(kept).toHaveLength(0);
  });

  it("świeżej nie rusza — dymek „wysyłanie…” nie może mrugnąć przed realtime", () => {
    const kept = pruneOutbox(
      [item({ id: "a", kind: "chat", status: "synced", createdAt: swiezy })],
      opts,
    );
    expect(kept).toHaveLength(1);
  });

  it("KRYTYCZNE: niewysłanego wpisu nie kasuje, choćby leżał tygodniami", () => {
    const items = [
      item({ id: "a", kind: "chat", status: "queued", createdAt: stary }),
      item({ id: "b", kind: "chat", status: "error", createdAt: stary }),
    ];
    expect(pruneOutbox(items, opts)).toHaveLength(2);
  });

  it("formularzy nie tyka — to historia aktywności kierowcy, nie śmieć", () => {
    const items = [item({ id: "a", kind: "fuel", status: "synced", createdAt: stary })];
    expect(pruneOutbox(items, opts)).toHaveLength(1);
  });

  it("wpis z niepoprawną datą zostaje — nie kasujemy z powodu wątpliwości", () => {
    const items = [item({ id: "a", kind: "chat", status: "synced", createdAt: "" })];
    expect(pruneOutbox(items, opts)).toHaveLength(1);
  });

  it("bez podanego `now` bierze zegar systemowy", () => {
    const items = [
      item({ id: "a", kind: "chat", status: "synced", createdAt: "2020-01-01T00:00:00.000Z" }),
    ];
    expect(pruneOutbox(items, { kinds: ["chat"], keepMs: 5 * 60_000 })).toHaveLength(0);
  });
});

describe("withOccurredAt — data zdarzenia, nie synchronizacji [#373]", () => {
  it("dopina moment zakolejkowania, gdy formularz daty nie podał", () => {
    const input: { liters: number; occurredAt?: string } = { liters: 500 };
    expect(withOccurredAt(input, T0)).toEqual({ liters: 500, occurredAt: T0 });
  });

  it("jawna data z formularza ma pierwszeństwo (tankowanie sprzed tygodnia)", () => {
    const input = { occurredAt: "2026-07-20" };
    expect(withOccurredAt(input, T0)).toBe(input);
  });

  it("pusta data traktowana jak brak — inaczej wpis wpadłby do złego miesiąca", () => {
    expect(withOccurredAt({ occurredAt: "" }, T0).occurredAt).toBe(T0);
  });

  it("nie mutuje wejścia", () => {
    const input: { occurredAt?: string } = {};
    withOccurredAt(input, T0);
    expect(input.occurredAt).toBeUndefined();
  });
});

describe("isOutboxItemForeign — współdzielony telefon", () => {
  it("wpis bez właściciela przechodzi (claimuje pierwszy zalogowany)", () => {
    expect(isOutboxItemForeign(item(), "u1")).toBe(false);
    expect(isOutboxItemForeign(item({ userId: null }), "u1")).toBe(false);
  });

  it("własny wpis przechodzi, cudzy nie", () => {
    expect(isOutboxItemForeign(item({ userId: "u1" }), "u1")).toBe(false);
    expect(isOutboxItemForeign(item({ userId: "u2" }), "u1")).toBe(true);
  });
});

describe("outboxErrorMessage", () => {
  it("z `Error` bierze treść", () => {
    expect(outboxErrorMessage(new Error("DB padło"))).toBe("DB padło");
  });

  it("PostgREST zwraca obiekt, nie Error — kolejność message → details → hint → code", () => {
    expect(outboxErrorMessage({ message: "m", details: "d" })).toBe("m");
    expect(outboxErrorMessage({ details: "d", hint: "h", code: "23505" })).toBe("d");
    expect(outboxErrorMessage({ hint: "h", code: "23505" })).toBe("h");
    expect(outboxErrorMessage({ code: "23505" })).toBe("23505");
  });

  it("nieczytelny błąd nie zostawia użytkownika z pustym komunikatem", () => {
    expect(outboxErrorMessage({})).toBe("Błąd synchronizacji");
    expect(outboxErrorMessage(null)).toBe("Błąd synchronizacji");
    expect(outboxErrorMessage("cokolwiek")).toBe("Błąd synchronizacji");
  });
});

describe("createSyncOutboxQueue (localStorage)", () => {
  it("dodaje, listuje po rodzaju i usuwa", () => {
    const s = syncStore();
    const q = createSyncOutboxQueue<Item>(s.storage);
    q.add(item({ id: "a" }));
    q.add(item({ id: "b", kind: "chat" }));
    expect(q.list().map((i) => i.id)).toEqual(["b", "a"]);
    expect(q.list("chat").map((i) => i.id)).toEqual(["b"]);
    q.remove("b");
    expect(q.list()).toHaveLength(1);
  });

  it("KRYTYCZNE: zapis kończy się w tym samym zadaniu pętli zdarzeń", () => {
    // Atomowość web-owej kolejki bierze się WYŁĄCZNIE z synchroniczności
    // `localStorage`. Gdyby operacja rozpadła się na mikrozadania, między
    // odczytem a zapisem wcisnąłby się inny zapis — i wróciłby błąd [#390].
    const s = syncStore();
    const q = createSyncOutboxQueue<Item>(s.storage);
    q.add(item({ id: "a" }));
    expect(s.items().map((i) => i.id)).toEqual(["a"]);
  });

  it("patch czyta świeży stan, nie snapshot sprzed wysyłki", () => {
    const s = syncStore();
    const q = createSyncOutboxQueue<Item>(s.storage);
    q.add(item({ id: "a" }));
    // Druga karta tej samej domeny dopisuje wpis w trakcie synchronizacji pierwszej.
    s.put(serializeOutbox([item({ id: "b" }), item({ id: "a" })]));
    q.patch("a", { status: "synced" });
    expect(s.items().map((i) => [i.id, i.status])).toEqual([
      ["b", "queued"],
      ["a", "synced"],
    ]);
  });

  it("patch nieistniejącego wpisu nie zapisuje NICZEGO", () => {
    const s = syncStore();
    const q = createSyncOutboxQueue<Item>(s.storage);
    q.add(item({ id: "a" }));
    const before = s.writes();
    q.patch("nieznane", { status: "synced" });
    expect(s.writes()).toBe(before);
  });

  it("prune zapisuje tylko wtedy, gdy coś faktycznie ubyło", () => {
    const s = syncStore();
    const q = createSyncOutboxQueue<Item>(s.storage);
    q.add(item({ id: "a", kind: "chat", status: "synced", createdAt: "2020-01-01T00:00:00.000Z" }));
    const before = s.writes();
    q.prune({ kinds: ["fuel"], keepMs: 0 });
    expect(s.writes()).toBe(before);
    q.prune({ kinds: ["chat"], keepMs: 0 });
    expect(s.writes()).toBe(before + 1);
    expect(q.list()).toHaveLength(0);
  });

  it("liczy wpisy czekające na wysyłkę", () => {
    const s = syncStore(serializeOutbox([item({ id: "a" }), item({ id: "b", status: "synced" })]));
    expect(createSyncOutboxQueue<Item>(s.storage).pending()).toBe(1);
  });

  it("uszkodzony storage nie wywraca listy, a nowy wpis i tak wchodzi", () => {
    const s = syncStore("{to nie jest json");
    const q = createSyncOutboxQueue<Item>(s.storage);
    expect(q.list()).toEqual([]);
    q.add(item({ id: "a" }));
    expect(q.list().map((i) => i.id)).toEqual(["a"]);
  });

  it("storage, który RZUCA przy odczycie, daje pustą kolejkę zamiast wyjątku", () => {
    // `localStorage` potrafi rzucić (storage zablokowany polityką przeglądarki),
    // a to jest inny przypadek niż uszkodzony JSON: wyjątek leci spoza `parseOutbox`.
    const storage: SyncOutboxStorage = {
      read: () => {
        throw new Error("SecurityError: storage niedostępny");
      },
      write: () => {},
    };
    const q = createSyncOutboxQueue<Item>(storage);
    expect(q.list()).toEqual([]);
    expect(q.pending()).toBe(0);
  });

  it("powiadamia o każdej zmianie (pasek „czeka na wysyłkę”)", () => {
    const s = syncStore();
    const onChange = vi.fn();
    const q = createSyncOutboxQueue<Item>(s.storage, onChange);
    q.add(item({ id: "a" }));
    q.patch("a", { status: "synced" });
    q.remove("a");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});

describe("createAsyncOutboxQueue (AsyncStorage)", () => {
  it("dodaje, listuje po rodzaju i usuwa", async () => {
    const s = asyncStore();
    const q = createAsyncOutboxQueue<Item>(s.storage);
    await q.add(item({ id: "a" }));
    await q.add(item({ id: "b", kind: "chat" }));
    expect((await q.list()).map((i) => i.id)).toEqual(["b", "a"]);
    expect((await q.list("chat")).map((i) => i.id)).toEqual(["b"]);
    await q.remove("a");
    expect(await q.pending()).toBe(1);
  });

  it("KRYTYCZNE: równoległe zapisy nie gubią wpisów (#audyt Ś4)", async () => {
    // Bez mutexa oba `add` czytają tę samą pustą kolejkę i drugi zapis kasuje
    // pierwszy wpis — kierowca dostaje „Zapisano lokalnie", a danych nie ma.
    const s = asyncStore();
    const q = createAsyncOutboxQueue<Item>(s.storage);
    await Promise.all([
      q.add(item({ id: "a" })),
      q.add(item({ id: "b" })),
      q.add(item({ id: "c" })),
    ]);
    expect((await q.list()).map((i) => i.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("KRYTYCZNE: patch równoległy z dopisaniem nie cofa ani nie kasuje", async () => {
    const s = asyncStore();
    const q = createAsyncOutboxQueue<Item>(s.storage);
    await q.add(item({ id: "a" }));
    await Promise.all([q.patch("a", { status: "synced" }), q.add(item({ id: "b" }))]);
    const items = await q.list();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === "a")?.status).toBe("synced");
  });

  it("usunięcie w trakcie innego zapisu nie wskrzesza wpisu", async () => {
    const s = asyncStore();
    const q = createAsyncOutboxQueue<Item>(s.storage);
    await q.add(item({ id: "a" }));
    await Promise.all([q.remove("a"), q.patch("a", { status: "synced" })]);
    expect(await q.list()).toHaveLength(0);
  });

  it("błąd storage'u nie zrywa łańcucha — kolejna operacja przechodzi", async () => {
    // Ogniwo, które odrzuci, nie może zablokować całej kolejki: kolejne zapisy
    // kierowcy muszą mieć gdzie trafić także po jednym nieudanym.
    let failNext = true;
    const s = asyncStore();
    const storage: AsyncOutboxStorage = {
      read: s.storage.read,
      write: async (v) => {
        if (failNext) {
          failNext = false;
          throw new Error("storage pełny");
        }
        await s.storage.write(v);
      },
    };
    const q = createAsyncOutboxQueue<Item>(storage);
    await expect(q.add(item({ id: "a" }))).rejects.toThrow("storage pełny");
    await q.add(item({ id: "b" }));
    expect((await q.list()).map((i) => i.id)).toEqual(["b"]);
  });

  it("KRYTYCZNE: odrzucony odczyt AsyncStorage nie propaguje się do ekranów", async () => {
    /*
     * Realne tryby awarii AsyncStorage: „database or disk is full", uszkodzony plik
     * SQLite/RocksDB, a na Androidzie „Row too big to fit into CursorWindow" przy dużej
     * kolejce. Ekrany wołają `listOutbox()` i `pendingCount()` bez `catch`, a
     * `flushQueued().then(refresh)` nie ma gałęzi błędu — odrzucenie stąd oznaczałoby
     * nieodświeżoną kolejkę i pasek „czeka na wysyłkę", który przestaje pokazywać zaległości.
     */
    const storage: AsyncOutboxStorage = {
      read: () => Promise.reject(new Error("SQLITE_FULL: database or disk is full")),
      write: async () => {},
    };
    const q = createAsyncOutboxQueue<Item>(storage);
    expect(await q.list()).toEqual([]);
    expect(await q.pending()).toBe(0);
    // Kontroler synchronizacji czyta kolejkę tą samą drogą — `flush()` musi się domknąć.
    const sync = createOutboxSync<Item>({ queue: q, send: async () => "synced" });
    await expect(sync.flush()).resolves.toBeUndefined();
  });

  it("prune zapisuje tylko przy realnej zmianie i powiadamia nasłuchujących", async () => {
    const s = asyncStore();
    const onChange = vi.fn();
    const q = createAsyncOutboxQueue<Item>(s.storage, onChange);
    await q.add(
      item({ id: "a", kind: "chat", status: "synced", createdAt: "2020-01-01T00:00:00.000Z" }),
    );
    onChange.mockClear();
    await q.prune({ kinds: ["fuel"], keepMs: 0 });
    expect(onChange).not.toHaveBeenCalled();
    await q.prune({ kinds: ["chat"], keepMs: 0 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(await q.list()).toHaveLength(0);
  });
});

describe("createOutboxSync — synchronizacja", () => {
  /** Kolejka + kontroler na wspólnym storage'u; `send` sterowany w teście. */
  function harness(initial: readonly Item[], send: (i: Item) => Promise<OutboxSendResult>) {
    const s = syncStore(serializeOutbox(initial));
    const queue = createSyncOutboxQueue<Item>(s.storage);
    return { store: s, queue, ...createOutboxSync<Item>({ queue, send }) };
  }

  it("udana wysyłka → `synced` bez śladu po starym błędzie", async () => {
    const h = harness([item({ status: "error", error: "brak sieci" })], async () => "synced");
    await h.sync("a");
    expect(h.queue.list()[0]).toMatchObject({ status: "synced" });
    expect(h.queue.list()[0]?.error).toBeUndefined();
  });

  it("wyjątek → `error` z czytelnym komunikatem, wpis ZOSTAJE w kolejce", async () => {
    const h = harness([item()], async () => {
      throw new Error("Brak sesji — wpis czeka w kolejce.");
    });
    await h.sync("a");
    const wpis = h.queue.list()[0];
    expect(wpis?.status).toBe("error");
    expect(wpis?.error ?? "").toMatch(/sesji/);
  });

  it("obiekt błędu z PostgREST też trafia do komunikatu", async () => {
    // Supabase odrzuca obietnicę zwykłym obiektem, nie instancją `Error`.
    const h = harness([item()], () => Promise.reject({ code: "23505", details: "duplicate key" }));
    await h.sync("a");
    expect(h.queue.list()[0]?.error).toBe("duplicate key");
  });

  it("`skipped` zostawia wpis nietknięty — to nie jest błąd do pokazania", async () => {
    // Wpis cudzego kierowcy na współdzielonym telefonie: ma poczekać na
    // właściciela, a nie straszyć obecnego użytkownika czerwonym statusem.
    const h = harness([item({ userId: "u2" })], async () => "skipped");
    const before = h.store.writes();
    await h.sync("a");
    expect(h.queue.list()[0]?.status).toBe("queued");
    expect(h.store.writes()).toBe(before);
  });

  it("KRYTYCZNE: wpis `synced` nie leci do bazy po raz drugi ([#221]/[#222])", async () => {
    const send = vi.fn(async (): Promise<OutboxSendResult> => "synced");
    const h = harness([item({ status: "synced" })], send);
    await h.sync("a");
    await h.flush();
    await h.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it("KRYTYCZNE: duplikat w storage'u wysyłany tylko raz", async () => {
    // Ślad po przerwanym zapisie: ta sama kolejka trzyma wpis dwa razy.
    const send = vi.fn(async (): Promise<OutboxSendResult> => "synced");
    const s = syncStore(serializeOutbox([item(), item()]));
    const queue = createSyncOutboxQueue<Item>(s.storage);
    const { flush } = createOutboxSync<Item>({ queue, send });
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.list()).toHaveLength(1);
  });

  it("wpis usunięty przed startem wysyłki nie jest wysyłany", async () => {
    const send = vi.fn(async (): Promise<OutboxSendResult> => "synced");
    const h = harness([], send);
    await h.sync("a");
    expect(send).not.toHaveBeenCalled();
  });

  it("KRYTYCZNE: usunięcie w trakcie wysyłki nie wskrzesza wpisu ([#390])", async () => {
    let zwolnij: () => void = () => {};
    const brama = new Promise<void>((r) => {
      zwolnij = r;
    });
    const h = harness([item()], async () => {
      await brama;
      return "synced";
    });
    const trwa = h.sync("a");
    h.queue.remove("a");
    zwolnij();
    await trwa;
    expect(h.queue.list()).toHaveLength(0);
  });

  it("KRYTYCZNE: wpis dodany w trakcie wysyłki innego nie znika ([#390])", async () => {
    let zwolnij: () => void = () => {};
    const brama = new Promise<void>((r) => {
      zwolnij = r;
    });
    const h = harness([item({ id: "a" })], async () => {
      await brama;
      return "synced";
    });
    const trwa = h.sync("a");
    h.queue.add(item({ id: "b" }));
    zwolnij();
    await trwa;
    expect(
      h.queue
        .list()
        .map((i) => i.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("KRYTYCZNE: równoległe `sync` tego samego id to JEDNA wysyłka", async () => {
    // Ekran historii ma przycisk „ponów", a powrót sieci odpala flush — bez dedupu
    // ten sam wpis leciał dwoma żądaniami naraz.
    const send = vi.fn(async (): Promise<OutboxSendResult> => {
      await tick(2);
      return "synced";
    });
    const h = harness([item()], send);
    const [a, b] = [h.sync("a"), h.sync("a")];
    expect(a).toBe(b);
    await Promise.all([a, b]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("po zakończeniu wysyłki id wraca do puli (ponowienie po błędzie działa)", async () => {
    let padnij = true;
    const send = vi.fn(async (): Promise<OutboxSendResult> => {
      if (padnij) {
        padnij = false;
        throw new Error("brak sieci");
      }
      return "synced";
    });
    const h = harness([item()], send);
    await h.sync("a");
    expect(h.queue.list()[0]?.status).toBe("error");
    await h.sync("a");
    expect(h.queue.list()[0]?.status).toBe("synced");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("flush ponawia queued i error, pomija synced, po kolei", async () => {
    const kolejnosc: string[] = [];
    const h = harness(
      [
        item({ id: "a", status: "queued" }),
        item({ id: "b", status: "synced" }),
        item({ id: "c", status: "error" }),
      ],
      async (i) => {
        kolejnosc.push(i.id);
        await tick(2);
        return "synced";
      },
    );
    await h.flush();
    expect(kolejnosc).toEqual(["a", "c"]);
    expect(h.queue.list().every((i) => i.status === "synced")).toBe(true);
  });

  it("jeden błędny wpis nie zatrzymuje reszty kolejki", async () => {
    const h = harness([item({ id: "a" }), item({ id: "b" })], async (i) => {
      if (i.id === "a") throw new Error("ten jeden padł");
      return "synced";
    });
    await h.flush();
    const byId = new Map(h.queue.list().map((i) => [i.id, i.status]));
    expect(byId.get("a")).toBe("error");
    expect(byId.get("b")).toBe("synced");
  });

  it("działa tak samo nad kolejką asynchroniczną (mobile)", async () => {
    const s = asyncStore();
    const queue = createAsyncOutboxQueue<Item>(s.storage);
    const send = vi.fn(async (): Promise<OutboxSendResult> => "synced");
    const { sync, flush } = createOutboxSync<Item>({ queue, send });
    await queue.add(item({ id: "a" }));
    await queue.add(item({ id: "b" }));
    await Promise.all([flush(), flush(), sync("a")]);
    expect(send).toHaveBeenCalledTimes(2);
    expect((await queue.list()).every((i) => i.status === "synced")).toBe(true);
  });
});
