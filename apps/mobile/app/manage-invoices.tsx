/**
 * Parytet zarządzania (fala 9, #353): faktury z telefonu — właściciel/dyspozytor
 * wystawia pustą fakturę (nabywca + numeracja bez luk przez RPC), dodaje/usuwa
 * pozycje (opis, ilość, cena, VAT — sumy liczy trigger), oznacza opłaconą, anuluje,
 * duplikuje i usuwa. Dotąd mobile miało tylko podgląd. Odpowiednik panelu web „Faktury".
 */
import {
  addInvoiceItem,
  createBlankInvoice,
  deleteInvoice,
  deleteInvoiceItem,
  duplicateInvoice,
  getActiveMembership,
  type Invoice,
  type InvoiceItem,
  listInvoiceItems,
  listInvoices,
  setInvoicePaid,
  setInvoiceStatus,
} from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, SectionTitle, wide } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

/** Liczba dodatnia: `null` = puste/błąd. Akceptuje przecinek dziesiętny (decimal-pad PL/DE). */
function num(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 ? n : null;
}

const emptyBuyer = { buyerName: "", buyerTaxId: "", buyerAddress: "", currency: "EUR" };
const emptyItem = { description: "", quantity: "1", unitPrice: "", vatRate: "23" };

export default function ManageInvoicesScreen() {
  const t = useT();
  const statusLabel = (s: string) =>
    s === "cancelled" ? t("m.minv.status.cancelled") : t("m.minv.status.issued");
  const [rows, setRows] = useState<Invoice[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sel, setSel] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newForm, setNewForm] = useState<typeof emptyBuyer | null>(null);
  const [itemForm, setItemForm] = useState<typeof emptyItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const sb = getSupabase();
      const m = await getActiveMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setMsg(null);
      setRows(await listInvoices(sb, m.companyId, { limit: 200 }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("m.minv.loadError"));
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (inv: Invoice) => {
    setMsg(null);
    setSel(inv);
    setItemForm(null);
    try {
      setItems(await listInvoiceItems(getSupabase(), inv.id));
    } catch {
      setItems([]);
    }
  };
  const closeDetail = () => {
    setMsg(null);
    setSel(null);
    setItems([]);
    setItemForm(null);
  };

  // Odświeża wybraną fakturę z listy (po zmianie statusu/płatności/pozycji).
  const reloadSel = async (id: string) => {
    await load();
    try {
      const fresh = await listInvoices(getSupabase(), companyId ?? "", { limit: 200 });
      const found = fresh.find((x) => x.id === id) ?? null;
      setSel(found);
      if (found) setItems(await listInvoiceItems(getSupabase(), id));
    } catch {
      // zostaw bieżący stan
    }
  };

  async function createNew() {
    if (!newForm || !companyId || busy) return;
    if (!newForm.buyerName.trim()) {
      warn();
      setMsg(t("m.minv.needBuyer"));
      return;
    }
    setBusy(true);
    try {
      const { id } = await createBlankInvoice(getSupabase(), companyId, {
        buyerName: newForm.buyerName.trim(),
        buyerTaxId: newForm.buyerTaxId.trim() || undefined,
        buyerAddress: newForm.buyerAddress.trim() || undefined,
        currency: newForm.currency.trim().toUpperCase() || "EUR",
      });
      success();
      setNewForm(null);
      await load();
      const inv = (await listInvoices(getSupabase(), companyId, { limit: 200 })).find(
        (x) => x.id === id,
      );
      if (inv) await openDetail(inv);
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.minv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    if (!itemForm || !sel || busy) return;
    const quantity = num(itemForm.quantity);
    const unitPrice = num(itemForm.unitPrice);
    const vatRate = num(itemForm.vatRate);
    // Ilość i cena muszą być > 0; VAT może być 0 (stawka 0%).
    if (
      !itemForm.description.trim() ||
      quantity == null ||
      quantity <= 0 ||
      unitPrice == null ||
      unitPrice <= 0 ||
      vatRate == null
    ) {
      warn();
      setMsg(t("m.minv.badItem"));
      return;
    }
    setBusy(true);
    try {
      // Kolejna pozycja = max(istniejące)+1, nie length+1 — inaczej po usunięciu
      // środkowej pozycji nowa dostałaby kolidujący numer (indeks nie jest unikalny).
      const nextPos = items.reduce((mx, it) => Math.max(mx, it.position), 0) + 1;
      await addInvoiceItem(getSupabase(), sel.id, {
        description: itemForm.description.trim(),
        quantity,
        unitPrice,
        vatRate,
        position: nextPos,
      });
      success();
      setItemForm(null);
      setMsg(null);
      await reloadSel(sel.id);
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.minv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteItem(it: InvoiceItem) {
    if (!sel) return;
    Alert.alert(t("m.manage.deleteTitle"), `${it.description} — ${t("m.manage.delete")}?`, [
      { text: t("m.manage.cancel"), style: "cancel" },
      {
        text: t("m.manage.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteInvoiceItem(getSupabase(), it.id);
            success();
            await reloadSel(sel.id);
          } catch (e) {
            warn();
            Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  async function togglePaid(inv: Invoice) {
    // Anulowana faktura nie może być „opłacona" (jak web + core: status płatności
    // wymuszony na „unpaid" dla cancelled).
    if (inv.status === "cancelled") return;
    try {
      await setInvoicePaid(getSupabase(), inv.id, !inv.paid_at);
      success();
      await reloadSel(inv.id);
    } catch (e) {
      warn();
      Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
    }
  }

  async function toggleCancel(inv: Invoice) {
    try {
      await setInvoiceStatus(
        getSupabase(),
        inv.id,
        inv.status === "cancelled" ? "issued" : "cancelled",
      );
      success();
      await reloadSel(inv.id);
    } catch (e) {
      warn();
      Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
    }
  }

  async function doDuplicate(inv: Invoice) {
    if (busy) return;
    setBusy(true);
    try {
      const { number } = await duplicateInvoice(getSupabase(), inv.id);
      success();
      Alert.alert(t("m.minv.duplicated"), number);
      closeDetail();
      await load();
    } catch (e) {
      warn();
      Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteInvoice(inv: Invoice) {
    Alert.alert(t("m.manage.deleteTitle"), `${inv.number} — ${t("m.manage.delete")}?`, [
      { text: t("m.manage.cancel"), style: "cancel" },
      {
        text: t("m.manage.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteInvoice(getSupabase(), inv.id);
            success();
            closeDetail();
            await load();
          } catch (e) {
            warn();
            Alert.alert(t("m.manage.saveError"), e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  const money = (n: number, cur: string) => `${n.toFixed(2)} ${cur}`;

  // ── Nowa faktura (nabywca) ────────────────────────────────────────────────
  if (newForm) {
    const f = newForm;
    const setF = (p: Partial<typeof emptyBuyer>) => setNewForm((x) => (x ? { ...x, ...p } : x));
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 10 }}>
          <SectionTitle>{t("m.minv.new")}</SectionTitle>
          <Text style={s.lbl}>{t("m.minv.buyerName")}</Text>
          <TextInput
            style={s.input}
            value={f.buyerName}
            onChangeText={(v) => setF({ buyerName: v })}
            placeholder="Firma Sp. z o.o."
            placeholderTextColor={palette.smoke}
          />
          <Text style={s.lbl}>{t("m.minv.buyerTaxId")}</Text>
          <TextInput
            style={s.input}
            value={f.buyerTaxId}
            onChangeText={(v) => setF({ buyerTaxId: v })}
            placeholder="PL0000000000"
            placeholderTextColor={palette.smoke}
            autoCapitalize="characters"
          />
          <Text style={s.lbl}>{t("m.minv.buyerAddress")}</Text>
          <TextInput
            style={[s.input, { minHeight: 52 }]}
            value={f.buyerAddress}
            onChangeText={(v) => setF({ buyerAddress: v })}
            placeholder="ul. …, 00-000 …"
            placeholderTextColor={palette.smoke}
            multiline
          />
          <Text style={s.lbl}>{t("m.minv.currency")}</Text>
          <TextInput
            style={s.input}
            value={f.currency}
            onChangeText={(v) => setF({ currency: v.toUpperCase() })}
            placeholder="EUR"
            placeholderTextColor={palette.smoke}
            autoCapitalize="characters"
            maxLength={3}
          />
          {msg && <Text style={s.err}>{msg}</Text>}
          <PrimaryButton label={busy ? "…" : t("m.minv.create")} onPress={createNew} />
          <Pressable
            onPress={() => {
              setNewForm(null);
              setMsg(null);
            }}
          >
            <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  // ── Szczegóły faktury (pozycje + akcje) ───────────────────────────────────
  if (sel) {
    const cancelled = sel.status === "cancelled";
    return (
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, wide]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 8 }}>
          <View style={s.rowTop}>
            <Text style={s.name}>🧾 {sel.number}</Text>
            <View style={s.badges}>
              <Text style={[s.badge, { color: cancelled ? "#ef4444" : palette.offWhite }]}>
                {statusLabel(sel.status)}
              </Text>
              <Text style={[s.badge, { color: sel.paid_at ? "#22c55e" : palette.smoke }]}>
                {sel.paid_at ? `✓ ${t("m.minv.paid")}` : t("m.minv.unpaid")}
              </Text>
            </View>
          </View>
          <Text style={s.dim}>{sel.buyer_name || "—"}</Text>
          <Text style={s.total}>
            {t("m.minv.gross")}: {money(sel.gross, sel.currency)} · {t("m.minv.net")}:{" "}
            {money(sel.net, sel.currency)}
          </Text>
        </Card>

        {/* Pozycje */}
        <SectionTitle>
          {t("m.minv.items")} ({items.length})
        </SectionTitle>
        {items.map((it) => (
          <Card key={it.id} style={{ gap: 4 }}>
            <View style={s.rowTop}>
              <Text style={s.itemName}>{it.description}</Text>
              <Pressable onPress={() => confirmDeleteItem(it)} hitSlop={8}>
                <Text style={s.delLink}>🗑</Text>
              </Pressable>
            </View>
            <Text style={s.dim}>
              {it.quantity} × {money(it.unit_price, sel.currency)} · VAT {it.vat_rate}% ·{" "}
              {money(it.gross, sel.currency)}
            </Text>
          </Card>
        ))}

        {/* Dodaj pozycję */}
        {itemForm ? (
          <Card style={{ gap: 8 }}>
            <Text style={s.lbl}>{t("m.minv.itemDesc")}</Text>
            <TextInput
              style={s.input}
              value={itemForm.description}
              onChangeText={(v) => setItemForm((x) => (x ? { ...x, description: v } : x))}
              placeholder={t("m.minv.itemDesc")}
              placeholderTextColor={palette.smoke}
            />
            <View style={s.row3}>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>{t("m.minv.qty")}</Text>
                <TextInput
                  style={s.input}
                  value={itemForm.quantity}
                  onChangeText={(v) => setItemForm((x) => (x ? { ...x, quantity: v } : x))}
                  keyboardType="decimal-pad"
                  placeholderTextColor={palette.smoke}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>{t("m.minv.unitPrice")}</Text>
                <TextInput
                  style={s.input}
                  value={itemForm.unitPrice}
                  onChangeText={(v) => setItemForm((x) => (x ? { ...x, unitPrice: v } : x))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.smoke}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>{t("m.minv.vat")}</Text>
                <TextInput
                  style={s.input}
                  value={itemForm.vatRate}
                  onChangeText={(v) => setItemForm((x) => (x ? { ...x, vatRate: v } : x))}
                  keyboardType="decimal-pad"
                  placeholderTextColor={palette.smoke}
                />
              </View>
            </View>
            {msg && <Text style={s.err}>{msg}</Text>}
            <PrimaryButton label={busy ? "…" : t("m.minv.addItem")} onPress={addItem} />
            <Pressable
              onPress={() => {
                setItemForm(null);
                setMsg(null);
              }}
            >
              <Text style={s.cancel}>{t("m.manage.cancel")}</Text>
            </Pressable>
          </Card>
        ) : (
          <Pressable
            style={s.addBtn}
            onPress={() => {
              setMsg(null);
              setItemForm({ ...emptyItem });
            }}
          >
            <Text style={s.addText}>➕ {t("m.minv.addItem")}</Text>
          </Pressable>
        )}

        {msg && !itemForm && <Text style={s.err}>{msg}</Text>}

        {/* Akcje faktury */}
        <View style={s.actions}>
          {!cancelled && (
            <Pressable style={s.actBtn} disabled={busy} onPress={() => togglePaid(sel)}>
              <Text style={s.actText}>
                {sel.paid_at ? `↩ ${t("m.minv.markUnpaid")}` : `✓ ${t("m.minv.markPaid")}`}
              </Text>
            </Pressable>
          )}
          <Pressable style={s.actBtn} disabled={busy} onPress={() => toggleCancel(sel)}>
            <Text style={s.actText}>
              {cancelled ? `↩ ${t("m.minv.reissue")}` : `✕ ${t("m.minv.cancelInv")}`}
            </Text>
          </Pressable>
          <Pressable style={s.actBtn} disabled={busy} onPress={() => doDuplicate(sel)}>
            <Text style={s.actText}>⧉ {t("m.minv.duplicate")}</Text>
          </Pressable>
          <Pressable style={[s.actBtn, s.actDanger]} onPress={() => confirmDeleteInvoice(sel)}>
            <Text style={[s.actText, { color: "#ef4444" }]}>🗑 {t("m.manage.delete")}</Text>
          </Pressable>
        </View>

        <Pressable onPress={closeDetail}>
          <Text style={s.cancel}>← {t("m.minv.backToList")}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Lista faktur ──────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        style={s.addBtn}
        onPress={() => {
          setMsg(null);
          setNewForm({ ...emptyBuyer });
        }}
      >
        <Text style={s.addText}>➕ {t("m.minv.new")}</Text>
      </Pressable>

      {msg && <Text style={s.err}>{msg}</Text>}

      <SectionTitle>
        {t("m.minv.invoices")} ({rows.length})
      </SectionTitle>
      {rows.length === 0 && <Text style={s.dim}>{t("m.minv.empty")}</Text>}
      {rows.map((inv) => (
        <Pressable key={inv.id} onPress={() => openDetail(inv)}>
          <Card style={{ gap: 6 }}>
            <View style={s.rowTop}>
              <Text style={s.name}>🧾 {inv.number}</Text>
              <View style={s.badges}>
                <Text
                  style={[
                    s.badge,
                    { color: inv.status === "cancelled" ? "#ef4444" : palette.smoke },
                  ]}
                >
                  {statusLabel(inv.status)}
                </Text>
                <Text style={[s.badge, { color: inv.paid_at ? "#22c55e" : palette.smoke }]}>
                  {inv.paid_at ? `✓ ${t("m.minv.paid")}` : t("m.minv.unpaid")}
                </Text>
              </View>
            </View>
            <Text style={s.dim}>
              {[inv.buyer_name, money(inv.gross, inv.currency)].filter(Boolean).join(" · ")}
            </Text>
          </Card>
        </Pressable>
      ))}
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
  row3: { flexDirection: "row", gap: 8 },
  err: { color: palette.red, fontSize: 13 },
  cancel: { color: palette.smoke, textAlign: "center", paddingVertical: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: palette.offWhite, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  badges: { flexDirection: "row", gap: 10, alignItems: "center" },
  badge: { fontSize: 12, fontWeight: "800" },
  dim: { color: palette.smoke, fontSize: 12.5 },
  total: { color: palette.offWhite, fontSize: 13, fontWeight: "700" },
  itemName: { color: palette.offWhite, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  delLink: { fontSize: 16 },
  actions: { gap: 8, marginTop: 4 },
  actBtn: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  actDanger: { borderColor: "#ef4444" },
  actText: { color: palette.offWhite, fontWeight: "700", fontSize: 14 },
});
