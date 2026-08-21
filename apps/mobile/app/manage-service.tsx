/**
 * Parytet zarządzania (fala 6, #350): serwis / harmonogram z telefonu — właściciel/
 * dyspozytor tworzy, edytuje, „odhacza" i usuwa zadania serwisowe pojazdów
 * (interwał km / miesiące, ostatni serwis). Bieżący przebieg z tankowań; status
 * wg przebiegu z rdzeniowej `serviceStatus`. Odpowiednik panelu web „Serwis".
 */
import {
  deleteServiceTask,
  getActiveMembership,
  latestOdometers,
  listServiceTasksAll,
  listVehicles,
  markServiceDone,
  type ServiceTask,
  saveServiceTask,
} from "@e-logistic/api";
import {
  type ExpiryLevel,
  expiryStatus,
  LEVEL_RANK,
  serviceDueDate,
  serviceStatus,
  serviceUrgency,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Parsuje opcjonalną liczbę całkowitą nieujemną. `null` = puste, `"bad"` = błąd. */
function optInt(v: string): number | null | "bad" {
  const sfx = v.trim();
  if (!sfx) return null;
  // Wyłącznie czyste cyfry — inaczej „150,000" (Number → 150) po cichu gubi dane.
  if (!/^\d+$/.test(sfx)) return "bad";
  return Number(sfx);
}

const levelColor = (l: ExpiryLevel) =>
  l === "expired" ? "#ef4444" : l === "soon" ? "#f59e0b" : palette.smoke;

/**
 * Ile kart montujemy naraz i o ile dokłada „Pokaż kolejne".
 *
 * Pobranie stronami zdjęło sufit tysiąca wierszy, więc lista, która wcześniej NIE MOGŁA
 * urosnąć ponad ten tysiąc, potrafi teraz mieć ich kilkanaście tysięcy. Na telefonie
 * `ScrollView` montuje wszystkie dzieci naraz (to nie `FlatList`) — bez tej porcji
 * naprawa cichego gubienia zadań kończyłaby się zamrożonym ekranem, czyli zamianą
 * jednej cichej awarii na drugą, głośniejszą. Setka kart to kilkanaście ekranów
 * przewijania, znacznie więcej, niż ktokolwiek przegląda, zanim sięgnie po pojazd.
 */
const KROK_RENDEROWANIA = 100;

const empty = {
  id: null as string | null,
  vehicleId: null as string | null,
  name: "",
  intervalKm: "",
  intervalMonths: "",
  lastDoneKm: "",
  lastDoneDate: "",
  notes: "",
};

export default function ManageServiceScreen() {
  const t = useT();
  const [rows, setRows] = useState<ServiceTask[]>([]);
  /*
   * Dwa osobne znaczniki, a nie jedna flaga „coś jest niepełne" — bo to dwa różne
   * kłamstwa i wnioski z nich są PRZECIWNE. Urwany PLAN gubi całe wiersze: zadania nie
   * ma na liście, więc szukaj go w bazie. Urwane PRZEBIEGI zostawiają wiersz na miejscu,
   * tylko liczą go z nieznanego licznika, więc zadanie JEST na liście i wygląda na
   * mieszczące się w interwale. Zlane w jeden komunikat kazałyby zgadywać, której z tych
   * dwóch rzeczy nie ufać — dokładnie ten sam podział co na web `/service`.
   */
  const [tasksIncomplete, setTasksIncomplete] = useState(false);
  const [odoIncomplete, setOdoIncomplete] = useState(false);
  /** Ile kart jest ZAMONTOWANYCH; licznik w nagłówku liczy się dalej z kompletu. */
  const [limit, setLimit] = useState(KROK_RENDEROWANIA);
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [odo, setOdo] = useState<Record<string, number>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /**
   * Potwierdzenie udanego zapisu — na telefonie jedynym sygnałem była wibracja.
   *
   * Haptyka nie zostaje na ekranie i nie działa przy wyłączonych wibracjach, więc
   * użytkownik, który nie znalazł swojej pozycji wzrokiem, miał wszelkie powody sądzić,
   * że zapis padł — i dodać zadanie drugi raz. Tekst zostaje, dopóki nie zacznie się
   * kolejna edycja.
   */
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      const [tasks, veh, odos] = await Promise.all([
        // STRONAMI i bez zawężenia: to ekran, na którym plan się EDYTUJE, więc musi
        // pokazać też pozycje czysto kalendarzowe („przegląd co 12 miesięcy") i te
        // bez ostatniego serwisu. Wariant jednorazowy prosił o 5000 wierszy, a serwer
        // oddawał 1000 — reszty planu nie dało się ani zobaczyć, ani poprawić.
        listServiceTasksAll(sb, m.companyId),
        listVehicles(sb, m.companyId),
        latestOdometers(sb, m.companyId).catch(() => ({ byVehicle: {}, complete: false })),
      ]);
      setMsg(null);
      setRows(tasks.rows);
      /*
       * Okno renderowania NIE zwija się po pobraniu.
       *
       * Stało tu `setLimit(KROK_RENDEROWANIA)` „żeby lista nie montowała się od razu
       * w rozmiarze rozwiniętym na innym zbiorze". Tyle że `load()` woła się po KAŻDEJ
       * mutacji — zapisie, odhaczeniu, usunięciu — czyli okno zwijało się dokładnie
       * w chwili, w której użytkownik pracował na pozycji z ogona listy: rozwinął widok
       * do 150 kart, odhaczył „wykonano" i karta znikała mu z ekranu bez słowa. Zbiór
       * jest przy tym ten sam co przed mutacją (jedno zadanie więcej albo mniej), więc
       * broniło to przed problemem, którego tu nie ma. Rozmiar okna należy do
       * przewijania użytkownika, nie do pobrania; przy wejściu na ekran i tak startuje
       * od jednej porcji, bo komponent montuje się od nowa.
       */
      setTasksIncomplete(!tasks.complete);
      setOdoIncomplete(!odos.complete);
      setVehicles(
        (veh as { id: string; registration: string }[]).map((v) => ({
          id: v.id,
          registration: v.registration,
        })),
      );
      setOdo(odos.byVehicle);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.msvc.loadError"));
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<typeof empty>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const regOf = (id: string) => vehicles.find((v) => v.id === id)?.registration ?? "—";

  const dzis = localToday();
  /*
   * Kolejność WG PILNOŚCI, wyznaczona przed oknem renderowania — inaczej okno tnie
   * listę od niewłaściwego końca.
   *
   * `listServiceTasksAll` oddaje plan w kolejności dopisywania (najstarsze pierwsze),
   * a montuje się pierwsza setka. Przy 8 pojazdach × 15 pozycji zadanie przekroczone
   * o kilka tysięcy kilometrów potrafiło mieć indeks 110 i nie istnieć w drzewie
   * widoków — na ekranie, którego całym zadaniem jest pokazać, co wymaga serwisu.
   *
   * W obrębie tego samego poziomu NAJNOWSZE pierwsze, bo pułapka ma drugi koniec:
   * świeżo dopisana pozycja nie ma jeszcze ostatniego serwisu, więc jej poziom to „ok",
   * a przy kolejności dopisywania rosnąco lądowałaby na samym końcu planu — czyli
   * dokładnie w scenariuszu „zapis się udał, pozycji nie widać, dodaję drugi raz",
   * przed którym broni komentarz w `packages/api/src/data/service.ts`.
   */
  const uporzadkowane = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const pa = LEVEL_RANK[serviceUrgency(a, odo[a.vehicle_id] ?? null, dzis)];
        const pb = LEVEL_RANK[serviceUrgency(b, odo[b.vehicle_id] ?? null, dzis)];
        return pb - pa || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
      }),
    [rows, odo, dzis],
  );

  const openNew = () => {
    if (vehicles.length === 0) {
      warn();
      setMsg(t("m.msvc.noVehicles"));
      return;
    }
    setMsg(null);
    setNote(null);
    setForm({ ...empty });
  };
  const openEdit = (r: ServiceTask) => {
    setMsg(null);
    setNote(null);
    setForm({
      id: r.id,
      vehicleId: r.vehicle_id,
      name: r.name,
      intervalKm: r.interval_km != null ? String(r.interval_km) : "",
      intervalMonths: r.interval_months != null ? String(r.interval_months) : "",
      lastDoneKm: r.last_done_km != null ? String(r.last_done_km) : "",
      lastDoneDate: r.last_done_date ?? "",
      notes: r.notes ?? "",
    });
  };
  const closeForm = () => {
    setMsg(null);
    setForm(null);
  };

  async function save() {
    if (!form || busy) return;
    if (!companyId) {
      warn();
      setMsg(t("m.msvc.loadError"));
      return;
    }
    if (!form.vehicleId || !form.name.trim()) {
      warn();
      setMsg(t("m.msvc.needVehicleName"));
      return;
    }
    const ikm = optInt(form.intervalKm);
    const imo = optInt(form.intervalMonths);
    const ldk = optInt(form.lastDoneKm);
    if (ikm === "bad" || imo === "bad" || ldk === "bad") {
      warn();
      setMsg(t("m.msvc.badNumber"));
      return;
    }
    setBusy(true);
    try {
      await saveServiceTask(
        getSupabase(),
        companyId,
        {
          vehicleId: form.vehicleId,
          name: form.name.trim(),
          intervalKm: ikm,
          intervalMonths: imo,
          lastDoneKm: ldk,
          lastDoneDate: form.lastDoneDate.trim() || null,
          notes: form.notes.trim() || null,
        },
        form.id ?? undefined,
      );
      success();
      closeForm();
      setNote(t("m.msvc.saved"));
      await load();
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.manage.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmMarkDone(r: ServiceTask) {
    const km = odo[r.vehicle_id] ?? null;
    Alert.alert(
      t("m.msvc.markDone"),
      `${r.name} · ${regOf(r.vehicle_id)}${km != null ? ` · ${km} km` : ""}`,
      [
        { text: t("m.manage.cancel"), style: "cancel" },
        {
          text: t("m.msvc.markDone"),
          onPress: async () => {
            try {
              await markServiceDone(getSupabase(), r.id, km, localToday());
              success();
              await load();
            } catch (e) {
              warn();
              Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
            }
          },
        },
      ],
    );
  }

  function confirmDelete(r: ServiceTask) {
    Alert.alert(t("m.manage.deleteTitle"), `${r.name} — ${t("m.manage.delete")}?`, [
      { text: t("m.manage.cancel"), style: "cancel" },
      {
        text: t("m.manage.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceTask(getSupabase(), r.id);
            success();
            await load();
          } catch (e) {
            warn();
            Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  // ── Formularz ─────────────────────────────────────────────────────────────
  if (form) {
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 10 }}>
          <SectionTitle>{form.id ? t("m.msvc.edit") : t("m.msvc.new")}</SectionTitle>

          <Text style={s.lbl}>{t("m.msvc.vehicle")}</Text>
          <View style={s.chips}>
            {vehicles.map((v) => (
              <Pressable
                key={v.id}
                style={[s.chip, form.vehicleId === v.id && s.chipOn]}
                onPress={() => set({ vehicleId: v.id })}
              >
                <Text style={[s.chipText, form.vehicleId === v.id && { color: palette.white }]}>
                  {v.registration}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.lbl}>{t("m.msvc.name")}</Text>
          <TextInput
            style={s.input}
            value={form.name}
            onChangeText={(v) => set({ name: v })}
            placeholder={t("m.msvc.namePh")}
            placeholderTextColor={palette.smoke}
          />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.msvc.intervalKm")}</Text>
              <TextInput
                style={s.input}
                value={form.intervalKm}
                onChangeText={(v) => set({ intervalKm: v })}
                placeholder="30000"
                placeholderTextColor={palette.smoke}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.msvc.intervalMonths")}</Text>
              <TextInput
                style={s.input}
                value={form.intervalMonths}
                onChangeText={(v) => set({ intervalMonths: v })}
                placeholder="12"
                placeholderTextColor={palette.smoke}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.msvc.lastDoneKm")}</Text>
              <TextInput
                style={s.input}
                value={form.lastDoneKm}
                onChangeText={(v) => set({ lastDoneKm: v })}
                placeholder="120000"
                placeholderTextColor={palette.smoke}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>{t("m.msvc.lastDoneDate")}</Text>
              <TextInput
                style={s.input}
                value={form.lastDoneDate}
                onChangeText={(v) => set({ lastDoneDate: v })}
                placeholder="2026-01-15"
                placeholderTextColor={palette.smoke}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={s.lbl}>{t("m.msvc.notes")}</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={form.notes}
            onChangeText={(v) => set({ notes: v })}
            placeholder="—"
            placeholderTextColor={palette.smoke}
            multiline
          />

          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.manage.save")} onPress={save} />
          <Pressable onPress={closeForm}>
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  // ── Lista ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={s.addBtn} onPress={openNew}>
        <Text style={s.addText}>➕ {t("m.msvc.new")}</Text>
      </Pressable>

      {msg && <Text style={s.err}>{msg}</Text>}
      {note && <Text style={s.ok}>{note}</Text>}

      <SectionTitle>
        {t("m.msvc.tasks")} ({rows.length})
      </SectionTitle>
      {/* Nad listą, bo mówią o zadaniach, których na niej NIE MA (albo o liczniku,
          z którego policzono te widoczne) — i nad „Brak zadań serwisowych", który bez
          tego czytałby się jak potwierdzenie pustego planu. */}
      {tasksIncomplete && <Text style={s.warn}>{t("m.msvc.incompleteTasks")}</Text>}
      {odoIncomplete && <Text style={s.warn}>{t("m.msvc.incompleteOdo")}</Text>}
      {rows.length === 0 && <Text style={s.dim}>{t("m.msvc.empty")}</Text>}
      {uporzadkowane.slice(0, limit).map((r) => {
        const kmSt = serviceStatus(odo[r.vehicle_id] ?? null, r.last_done_km, r.interval_km);
        const dueDate = serviceDueDate(r.last_done_date, r.interval_months);
        const timeSt = dueDate ? expiryStatus(dueDate, dzis) : null;
        // Najpilniejszy z dwóch wymiarów (km / miesiące) wyznacza kolor — ta sama
        // reguła, wg której lista jest posortowana.
        const stColor = levelColor(serviceUrgency(r, odo[r.vehicle_id] ?? null, dzis));
        return (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={s.rowTop}>
              <Text style={s.name}>
                🔧 {r.name} · {regOf(r.vehicle_id)}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => confirmMarkDone(r)} hitSlop={8}>
                  <Text style={s.doneLink}>✅</Text>
                </Pressable>
                <Pressable onPress={() => openEdit(r)} hitSlop={8}>
                  <Text style={s.editLink}>✏️</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(r)} hitSlop={8}>
                  <Text style={s.delLink}>🗑</Text>
                </Pressable>
              </View>
            </View>
            <Text style={s.dim}>
              {[
                r.interval_km != null && `${t("m.msvc.everyKm", { v: r.interval_km })}`,
                r.interval_months != null && `${t("m.msvc.everyMonths", { v: r.interval_months })}`,
                r.last_done_date && `${t("m.msvc.lastDoneDate")}: ${r.last_done_date}`,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
            {kmSt.kmLeft != null && (
              <Text style={[s.status, { color: stColor }]}>
                {kmSt.kmLeft < 0
                  ? t("m.msvc.overdue", { v: `${-kmSt.kmLeft} km` })
                  : t("m.msvc.remaining", { v: `${kmSt.kmLeft} km` })}
              </Text>
            )}
            {timeSt && (
              <Text style={[s.status, { color: stColor }]}>
                {timeSt.daysLeft < 0
                  ? t("m.msvc.overdue", { v: t("m.msvc.days", { v: -timeSt.daysLeft }) })
                  : t("m.msvc.remaining", { v: t("m.msvc.days", { v: timeSt.daysLeft }) })}
              </Text>
            )}
          </Card>
        );
      })}
      {uporzadkowane.length > limit && (
        <Pressable onPress={() => setLimit((l) => l + KROK_RENDEROWANIA)}>
          <Text style={s.more}>{t("m.msvc.showMore", { v: uporzadkowane.length - limit })}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  addBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  addText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  lbl: { color: palette.smoke, fontSize: 12.5, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.offWhite,
    fontSize: 15,
    backgroundColor: palette.nearBlack,
  },
  row2: { flexDirection: "row", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: palette.red, borderColor: palette.red },
  chipText: { color: palette.smoke, fontSize: 12.5, fontWeight: "600" },
  err: { color: palette.red, fontSize: 13 },
  ok: { color: palette.success, fontSize: 13 },
  // Ostrzeżenie, nie błąd: dane są, tylko niepełne — kolor jak na `fleet-status`.
  warn: { color: palette.warning, fontSize: 12, lineHeight: 17 },
  more: { color: palette.red, fontWeight: "700", textAlign: "center", paddingVertical: 12 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  doneLink: { fontSize: 16 },
  editLink: { fontSize: 16 },
  delLink: { fontSize: 16 },
  dim: { color: palette.smoke, fontSize: 12.5 },
  status: { fontSize: 12.5, fontWeight: "700" },
});
