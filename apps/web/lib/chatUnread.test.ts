// @vitest-environment jsdom
/**
 * #369: magazyn liczników nieprzeczytanych — dwa regresy zgłoszone przy weryfikacji #368:
 *  1. nieudany start (offline przy pierwszym renderze) zostawiał MARTWY magazyn,
 *  2. otwarty kanał zapisywał znacznik przeczytania na KAŻDĄ wiadomość realtime.
 */
import type { ChatUnread } from "@e-logistic/api";
import { act, cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getCachedMembership = vi.fn();
const chatUnreadCounts = vi.fn();
const markChatRead = vi.fn();
const subscribeMessages = vi.fn();

vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ auth: { getUser } }) }));
vi.mock("@/lib/membership", () => ({ getCachedMembership }));
vi.mock("@e-logistic/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@e-logistic/api")>()),
  chatUnreadCounts,
  markChatRead,
  subscribeMessages,
}));

const { chatChannelKey } = await import("@e-logistic/api");
/** Klucz kanału ogólnego (null) w mapie liczników. */
const GEN = chatChannelKey(null);

/** Świeży magazyn na każdy test — stan jest modułowy (jeden na kartę przeglądarki). */
async function mountStore() {
  vi.resetModules();
  const store = await import("@/lib/chatUnread");
  let latest: ChatUnread = { byChannel: {}, total: 0 };
  function Probe() {
    latest = store.useChatUnread();
    return null;
  }
  await act(async () => {
    render(h(Probe));
  });
  return { store, snapshot: () => latest };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "me" } } });
  getCachedMembership.mockResolvedValue({ companyId: "c1", role: "driver" });
  chatUnreadCounts.mockResolvedValue({ byChannel: {}, total: 0 });
  markChatRead.mockResolvedValue(undefined);
  subscribeMessages.mockReturnValue(() => {});
});
afterEach(cleanup);

describe("chatUnread — start odporny na brak sieci (#369)", () => {
  it("nieudany start NIE zabija magazynu — powrót na kartę startuje ponownie", async () => {
    getUser.mockRejectedValueOnce(new Error("offline"));
    const { snapshot } = await mountStore();
    expect(subscribeMessages).not.toHaveBeenCalled();
    expect(snapshot().total).toBe(0);

    chatUnreadCounts.mockResolvedValue({ byChannel: { [GEN]: 2 }, total: 2 });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(subscribeMessages).toHaveBeenCalledTimes(1);
    expect(snapshot().total).toBe(2);
  });

  it("udany start nie powtarza subskrypcji przy kolejnym powrocie na kartę", async () => {
    await mountStore();
    expect(subscribeMessages).toHaveBeenCalledTimes(1);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(subscribeMessages).toHaveBeenCalledTimes(1);
  });
});

describe("chatUnread — zdławiony zapis znacznika przeczytania (#369)", () => {
  it("strumień wiadomości = jeden zapis, reszta dopisana przy zamknięciu kanału", async () => {
    const { store } = await mountStore();
    store.markChannelReadThrottled(null, "c1");
    store.markChannelReadThrottled(null, "c1");
    store.markChannelReadThrottled(null, "c1");
    expect(markChatRead).toHaveBeenCalledTimes(1); // pozostałe czekają
    store.setOpenChatChannel(null, false); // wyjście z ekranu domyka zaległość
    expect(markChatRead).toHaveBeenCalledTimes(2);
    // Bez zaległości zamknięcie kanału niczego nie dopisuje.
    store.setOpenChatChannel(null, false);
    expect(markChatRead).toHaveBeenCalledTimes(2);
  });

  it("kanał otwarty na ekranie nie zapala badge'a, choćby baza go liczyła", async () => {
    const { store, snapshot } = await mountStore();
    store.setOpenChatChannel("t1", true);
    chatUnreadCounts.mockResolvedValue({ byChannel: { t1: 4, [GEN]: 1 }, total: 5 });
    await act(async () => {
      await store.refreshChatUnread();
    });
    expect(snapshot().byChannel.t1).toBeUndefined();
    expect(snapshot().total).toBe(1);
  });
});
