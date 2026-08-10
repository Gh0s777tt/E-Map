"use client";

import {
  type CompanyLink,
  deleteCompanyLink,
  deleteMyAccount,
  getAccountDeletionPreview,
  getCompany,
  insertCompanyLink,
  listCompanyLinks,
  updateCompany,
  updateCompanyLink,
  wipeCompanyData,
} from "@e-logistic/api";
import { companyLinkSchema, firstZodError } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import * as f from "@/components/formStyles";
import { useT } from "@/components/LocaleProvider";
import { PushToggle } from "@/components/PushToggle";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { exportCompanyWorkbook } from "@/lib/exportAll";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type State = "loading" | "off" | "enrolling" | "on";
type Passkey = { id: string; name: string | null; created_at: string };

export default function SettingsPage() {
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [pkBusy, setPkBusy] = useState(false);
  const [pkMsg, setPkMsg] = useState<string | null>(null);

  // Dane firmy (sprzedawca na fakturach/CMR) — edycja tylko dla właściciela.
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  /**
   * [#404] Linki firmowe — skróty, które właściciel definiuje dla kierowców.
   *
   * Dziś przewoźnik wysyła adres portalu myta czy awizacji na czacie albo
   * dyktuje przez telefon, a kierowca przepisuje go z pamięci na parkingu.
   * Tu wpisuje się go raz.
   */
  const [links, setLinks] = useState<CompanyLink[]>([]);
  const [linkForm, setLinkForm] = useState<{
    id: string | null;
    label: string;
    url: string;
    icon: string;
    note: string;
    managementOnly: boolean;
  } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const reloadLinks = useCallback(async (id: string) => {
    setLinks(await listCompanyLinks(getBrowserSupabase(), id).catch(() => []));
  }, []);

  async function saveLink() {
    if (!companyId || !linkForm || linkBusy) return;
    const parsed = companyLinkSchema.safeParse({
      label: linkForm.label,
      url: linkForm.url,
      icon: linkForm.icon.trim() || undefined,
      note: linkForm.note.trim() || undefined,
      managementOnly: linkForm.managementOnly,
      // Nowy link ląduje na końcu listy; kolejność zmienia się strzałkami.
      sortOrder: linkForm.id
        ? (links.find((l) => l.id === linkForm.id)?.sort_order ?? 0)
        : links.length,
    });
    if (!parsed.success) {
      toast(firstZodError(parsed.error), "error");
      return;
    }
    setLinkBusy(true);
    try {
      const sb = getBrowserSupabase();
      if (linkForm.id) await updateCompanyLink(sb, linkForm.id, parsed.data);
      else await insertCompanyLink(sb, parsed.data, companyId);
      await reloadLinks(companyId);
      setLinkForm(null);
      toast(t("links.saved"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("links.saveError"), "error");
    } finally {
      setLinkBusy(false);
    }
  }

  async function removeLink(id: string) {
    if (!companyId) return;
    if (!(await confirm(t("links.deleteConfirm")))) return;
    try {
      await deleteCompanyLink(getBrowserSupabase(), id);
      await reloadLinks(companyId);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("links.saveError"), "error");
    }
  }

  /** Przesuwa link o jedno miejsce; zapisujemy OBA zamieniane wiersze. */
  async function moveLink(id: string, kierunek: -1 | 1) {
    if (!companyId) return;
    const i = links.findIndex((l) => l.id === id);
    const j = i + kierunek;
    const a = links[i];
    const b = links[j];
    if (!a || !b) return;
    try {
      const sb = getBrowserSupabase();
      const wspolne = (l: CompanyLink, order: number) => ({
        label: l.label,
        url: l.url,
        icon: l.icon ?? undefined,
        note: l.note ?? undefined,
        managementOnly: l.management_only,
        sortOrder: order,
      });
      await updateCompanyLink(sb, a.id, wspolne(a, b.sort_order));
      await updateCompanyLink(sb, b.id, wspolne(b, a.sort_order));
      await reloadLinks(companyId);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("links.saveError"), "error");
    }
  }
  const [exporting, setExporting] = useState(false);
  const [cName, setCName] = useState("");
  const [cTaxId, setCTaxId] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cCountry, setCCountry] = useState("");
  const [cVat, setCVat] = useState("23");
  const [cDueDays, setCDueDays] = useState("14");
  const [cNotifyDays, setCNotifyDays] = useState("30");
  const [cBank, setCBank] = useState("");
  const [cAccount, setCAccount] = useState("");
  const [cMsg, setCMsg] = useState<string | null>(null);
  const [cBusy, setCBusy] = useState(false);

  // Strefa niebezpieczna (#259): czyszczenie danych firmy — tylko owner, type-to-confirm.
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wipeBusy, setWipeBusy] = useState(false);
  // [#372] Usunięcie własnego konta — osobne od czyszczenia danych firmy.
  const [delConfirm, setDelConfirm] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const loadCompany = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setIsOwner(m.role === "owner");
      // [#404] Linki ładujemy razem z resztą ustawień — RLS sam zawęzi zbiór.
      void reloadLinks(m.companyId);
      setCompanyId(m.companyId);
      const c = await getCompany(sb, m.companyId);
      if (c) {
        setCName(c.name ?? "");
        setCTaxId(c.tax_id ?? "");
        setCAddress(c.address ?? "");
        setCCountry(c.country ?? "");
        setCVat(String(c.default_vat_rate ?? 23));
        setCDueDays(String(c.payment_due_days ?? 14));
        setCNotifyDays(String(c.notify_days_ahead ?? 30));
        setCBank(c.bank_name ?? "");
        setCAccount(c.bank_account ?? "");
      }
    } catch {
      // brak firmy / dostępu
    }
    // [#404] `reloadLinks` w zależnościach — jest stabilne (`useCallback` z pustą
    // listą), więc nie powoduje ponownych wywołań, ale bez wpisania go tutaj
    // reguła wyczerpujących zależności jest złamana, a to właśnie ona chroni
    // przed domknięciem trzymającym nieaktualny stan.
  }, [reloadLinks]);

  async function saveCompany() {
    if (!companyId) return;
    setCMsg(null);
    if (!cName.trim()) {
      setCMsg(t("settings.company.nameRequired"));
      return;
    }
    setCBusy(true);
    try {
      await updateCompany(getBrowserSupabase(), companyId, {
        name: cName.trim(),
        taxId: cTaxId.trim() || undefined,
        address: cAddress.trim() || undefined,
        country: cCountry.trim() || undefined,
        defaultVatRate: Number(cVat) || 0,
        paymentDueDays: Math.max(0, Math.round(Number(cDueDays) || 0)),
        notifyDaysAhead: Math.min(90, Math.max(1, Math.round(Number(cNotifyDays) || 30))),
        bankName: cBank.trim() || undefined,
        bankAccount: cAccount.trim() || undefined,
      });
      setCMsg(t("settings.company.saved"));
    } catch (e) {
      setCMsg(e instanceof Error ? e.message : t("settings.company.saveError"));
    } finally {
      setCBusy(false);
    }
  }

  /**
   * [#400] Kasuje PLIKI firmy przed czyszczeniem bazy.
   *
   * Musi iść pierwsze: po usunięciu `memberships` nie da się już potwierdzić,
   * że proszący jest właścicielem tej firmy, a wtedy pliki zostają nieusuwalne
   * dla kogokolwiek poza kluczem serwisowym.
   *
   * Rzuca przy niepowodzeniu — świadomie. Przejście dalej oznaczałoby
   * potwierdzenie usunięcia danych, które nadal leżą na dysku, więc lepiej
   * przerwać i pozwolić powtórzyć niż skłamać w komunikacie.
   */
  async function purgeCompanyStorage(id: string): Promise<void> {
    const res = await fetch("/api/company/purge-storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId: id }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? t("settings.danger.storageFail"));
    }
  }

  async function wipeCompany() {
    if (!companyId || wipeBusy) return;
    if (wipeConfirm.trim() !== cName.trim()) {
      toast(t("settings.danger.mismatch"), "error");
      return;
    }
    const ok = await confirm(t("settings.danger.desc"), {
      danger: true,
      confirmLabel: t("settings.danger.button"),
    });
    if (!ok) return;
    setWipeBusy(true);
    try {
      // [#400] Najpierw pliki, potem wiersze — patrz `purgeCompanyStorage`.
      await purgeCompanyStorage(companyId);
      const counts = await wipeCompanyData(getBrowserSupabase(), companyId, wipeConfirm.trim());
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      toast(t("settings.danger.success").replace("{count}", String(total)), "success");
      setWipeConfirm("");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settings.danger.mismatch"), "error");
    } finally {
      setWipeBusy(false);
    }
  }

  /**
   * [#372] Usunięcie własnego konta — wymóg App Store 5.1.1(v) i Google Play.
   *
   * Odrębne od „wyczyść dane firmy" wyżej: tamto kasuje dane FIRMY i zostawia
   * konta, to kasuje KONTO użytkownika. Właściciel firmy z pracownikami dostaje
   * drugie, osobne potwierdzenie — jego usunięcie kasuje też cudze dane.
   */
  async function deleteAccount() {
    if (delBusy) return;
    if (delConfirm.trim() !== t("settings.account.delete.confirmWord")) {
      toast(t("settings.account.delete.fail"), "error");
      return;
    }
    setDelBusy(true);
    try {
      const sb = getBrowserSupabase();
      const preview = await getAccountDeletionPreview(sb);

      const lines = [
        t("settings.account.delete.desc"),
        t("settings.account.delete.summary")
          .replace("{fuel}", String(preview.fuelLogs))
          .replace("{adblue}", String(preview.adblueLogs))
          .replace("{trip}", String(preview.tripEvents))
          .replace("{messages}", String(preview.messages)),
        ...preview.soloCompanies.map((c) =>
          t("settings.account.delete.solo").replace("{company}", c.name),
        ),
      ];
      const ok = await confirm(lines.join("\n\n"), {
        danger: true,
        confirmLabel: t("settings.account.delete.button"),
      });
      if (!ok) return;

      let deleteCompany = false;
      const blocking = preview.blockingCompanies[0];
      if (blocking) {
        const owned = await confirm(
          t("settings.account.delete.owner")
            .replace("{company}", blocking.name)
            .replace("{members}", String(blocking.activeMembers)),
          { danger: true, confirmLabel: t("settings.account.delete.button") },
        );
        if (!owned) return;
        deleteCompany = true;
      }

      /*
       * [#400] Przy usuwaniu konta RAZEM Z FIRMĄ pliki firmy też muszą zniknąć.
       * Bez tego skany dokumentów i zdjęcia ładunku zostają na dysku, a po
       * skasowaniu `memberships` nikt nie ma już do nich prawa — czyli stają się
       * nieusuwalne, co jest gorszym stanem niż przed żądaniem usunięcia.
       *
       * Gdy użytkownik NIE kasuje firmy (odchodzi z niej, firma żyje dalej),
       * plików nie ruszamy: należą do firmy, nie do niego.
       */
      if (deleteCompany && companyId) await purgeCompanyStorage(companyId);
      await deleteMyAccount(sb, { deleteCompany });
      // Konto w auth.users już nie istnieje — sesja jest martwa, więc wychodzimy
      // na stronę publiczną zamiast czekać, aż kolejne zapytanie zwróci 401.
      await sb.auth.signOut().catch(() => {});
      window.location.href = "/";
    } catch (e) {
      toast(e instanceof Error ? e.message : t("settings.account.delete.fail"), "error");
    } finally {
      setDelBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) {
        setState("off");
        return;
      }
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setState("on");
      } else {
        setState("off");
      }
    } catch {
      setState("off");
    }
  }, []);

  const loadPasskeys = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const { data } = await sb
        .from("passkeys")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      setPasskeys((data ?? []) as Passkey[]);
    } catch {
      setPasskeys([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    loadPasskeys();
    loadCompany();
  }, [refresh, loadPasskeys, loadCompany]);

  async function addPasskey() {
    setPkBusy(true);
    setPkMsg(null);
    try {
      const name = window.prompt(
        t("settings.passkey.namePrompt"),
        t("settings.passkey.defaultName"),
      );
      const optRes = await fetch("/api/passkey/register/options", { method: "POST" });
      if (!optRes.ok) {
        setPkMsg(t("settings.passkey.reauth"));
        return;
      }
      const options = await optRes.json();
      const attResp = await startRegistration({ optionsJSON: options });
      const verRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, name }),
      });
      const data = (await verRes.json()) as { verified?: boolean; error?: string };
      if (!data.verified) {
        setPkMsg(data.error ?? t("settings.passkey.addError"));
        return;
      }
      setPkMsg(t("settings.passkey.added"));
      await loadPasskeys();
    } catch (e) {
      setPkMsg(e instanceof Error ? e.message : t("settings.passkey.error"));
    } finally {
      setPkBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (!(await confirm(t("settings.passkey.removeConfirm")))) return;
    try {
      await getBrowserSupabase().from("passkeys").delete().eq("id", id);
      await loadPasskeys();
    } catch (e) {
      setPkMsg(e instanceof Error ? e.message : t("settings.passkey.removeError"));
    }
  }

  async function startEnroll() {
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      // Usuń ewentualny niezweryfikowany factor (np. po przerwanej próbie).
      const { data: existing } = await sb.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        toast(error?.message ?? t("settings.twofa.startError"), "error");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setState("enrolling");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!factorId) return;
    setBusy(true);
    try {
      const sb = getBrowserSupabase();
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId });
      if (chErr || !ch) {
        toast(chErr?.message ?? t("common.error"), "error");
        return;
      }
      const { error } = await sb.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) {
        toast(error.message, "error");
        return;
      }
      setCode("");
      setQr("");
      setSecret("");
      toast(t("settings.twofa.enabled"), "success");
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factorId) return;
    if (!(await confirm("Wyłączyć weryfikację dwuetapową?"))) return;
    setBusy(true);
    try {
      const { error } = await getBrowserSupabase().auth.mfa.unenroll({ factorId });
      if (error) {
        toast(error.message, "error");
        return;
      }
      setFactorId(null);
      toast(t("settings.twofa.disabledMsg"), "success");
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  const qrSrc = qr.startsWith("data:") ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;

  async function handleExportAll() {
    if (!companyId) return;
    setExporting(true);
    try {
      await exportCompanyWorkbook(getBrowserSupabase(), companyId);
      toast("Wyeksportowano dane firmy do Excela.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się wyeksportować danych.", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.settings")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>{t("settings.subtitle")}</p>

      {companyId && isOwner && (
        <div style={styles.card}>
          <strong style={{ fontSize: 16 }}>🔗 {t("links.title")}</strong>
          <p style={{ color: palette.smoke, fontSize: 13, margin: "6px 0 10px", lineHeight: 1.6 }}>
            {t("links.subtitle")}
          </p>

          {links.length === 0 && (
            <p style={{ color: palette.smoke, fontSize: 13 }}>{t("links.empty")}</p>
          )}

          {links.map((l, i) => (
            <div key={l.id} style={styles.linkRow}>
              <span style={{ fontSize: 18, width: 24 }}>{l.icon || "🔗"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{l.label}</strong>
                {l.management_only && (
                  <span style={styles.linkBadge}>{t("links.managementOnly")}</span>
                )}
                <div style={styles.linkUrl}>{l.url}</div>
                {l.note && <div style={{ color: palette.smoke, fontSize: 12 }}>{l.note}</div>}
              </div>
              {/* Strzałki zamiast przeciągania: lista ma kilkanaście pozycji,
                  a przeciąganie na telefonie w rękawicach nie działa. */}
              <button
                type="button"
                style={styles.linkMove}
                disabled={i === 0}
                onClick={() => moveLink(l.id, -1)}
                aria-label={t("links.moveUp")}
              >
                ↑
              </button>
              <button
                type="button"
                style={styles.linkMove}
                disabled={i === links.length - 1}
                onClick={() => moveLink(l.id, 1)}
                aria-label={t("links.moveDown")}
              >
                ↓
              </button>
              <Button
                variant="ghost"
                onClick={() =>
                  setLinkForm({
                    id: l.id,
                    label: l.label,
                    url: l.url,
                    icon: l.icon ?? "",
                    note: l.note ?? "",
                    managementOnly: l.management_only,
                  })
                }
              >
                {t("common.edit")}
              </Button>
              <Button variant="ghost" onClick={() => removeLink(l.id)}>
                {t("common.delete")}
              </Button>
            </div>
          ))}

          {linkForm ? (
            <div style={styles.linkForm}>
              <input
                style={styles.input}
                placeholder={t("links.labelPlaceholder")}
                value={linkForm.label}
                onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="https://…"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...styles.input, width: 70 }}
                  placeholder="🛣️"
                  maxLength={8}
                  value={linkForm.icon}
                  onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                />
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder={t("links.notePlaceholder")}
                  value={linkForm.note}
                  onChange={(e) => setLinkForm({ ...linkForm, note: e.target.value })}
                />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={linkForm.managementOnly}
                  onChange={(e) => setLinkForm({ ...linkForm, managementOnly: e.target.checked })}
                />
                {t("links.managementOnlyHint")}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={saveLink} disabled={linkBusy}>
                  {t("common.save")}
                </Button>
                <Button variant="ghost" onClick={() => setLinkForm(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() =>
                setLinkForm({
                  id: null,
                  label: "",
                  url: "",
                  icon: "",
                  note: "",
                  managementOnly: false,
                })
              }
            >
              ➕ {t("links.add")}
            </Button>
          )}
        </div>
      )}

      {companyId && isOwner && (
        <div style={styles.card}>
          <strong style={{ fontSize: 16 }}>Eksport danych firmy</strong>
          <p style={{ color: palette.smoke, fontSize: 13, margin: "6px 0 10px" }}>
            Jeden plik Excel (.xlsx) ze wszystkim: kontrahenci, pojazdy, kierowcy, zlecenia, koszty,
            paliwo, AdBlue, trasa + arkusz statystyk per pojazd. Import robisz osobno na każdej
            liście (per element).
          </p>
          <Button onClick={handleExportAll} disabled={exporting}>
            {exporting ? "Eksportuję…" : "⬇️ Eksportuj wszystko (Excel)"}
          </Button>
        </div>
      )}

      {companyId && (
        <div style={styles.card}>
          <strong style={{ fontSize: 16 }}>{t("settings.company.title")}</strong>
          {isOwner ? (
            <>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.name")}</span>
                <input
                  style={styles.cInput}
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.taxId")}</span>
                <input
                  style={styles.cInput}
                  value={cTaxId}
                  onChange={(e) => setCTaxId(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.address")}</span>
                <input
                  style={styles.cInput}
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.country")}</span>
                <input
                  style={{ ...styles.cInput, maxWidth: 120 }}
                  value={cCountry}
                  onChange={(e) => setCCountry(e.target.value)}
                  placeholder="PL"
                />
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label style={styles.field}>
                  <span style={f.label}>{t("settings.company.vat")}</span>
                  <input
                    style={{ ...styles.cInput, maxWidth: 120 }}
                    type="number"
                    step="1"
                    value={cVat}
                    onChange={(e) => setCVat(e.target.value)}
                  />
                </label>
                <label style={styles.field}>
                  <span style={f.label}>{t("settings.company.dueDays")}</span>
                  <input
                    style={{ ...styles.cInput, maxWidth: 140 }}
                    type="number"
                    step="1"
                    value={cDueDays}
                    onChange={(e) => setCDueDays(e.target.value)}
                  />
                </label>
                <label style={styles.field}>
                  <span style={f.label}>{t("settings.company.notifyDays")}</span>
                  <input
                    style={{ ...styles.cInput, maxWidth: 140 }}
                    type="number"
                    step="1"
                    min={1}
                    max={90}
                    value={cNotifyDays}
                    onChange={(e) => setCNotifyDays(e.target.value)}
                  />
                </label>
              </div>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.bank")}</span>
                <input
                  style={styles.cInput}
                  value={cBank}
                  onChange={(e) => setCBank(e.target.value)}
                  placeholder="np. mBank"
                />
              </label>
              <label style={styles.field}>
                <span style={f.label}>{t("settings.company.account")}</span>
                <input
                  style={styles.cInput}
                  value={cAccount}
                  onChange={(e) => setCAccount(e.target.value)}
                  placeholder="PL00 0000 0000 0000 0000 0000 0000"
                />
              </label>
              <div>
                <Button onClick={saveCompany} disabled={cBusy}>
                  {cBusy ? t("common.saving") : t("settings.company.save")}
                </Button>
              </div>
              {cMsg && <p style={{ color: palette.smoke, fontSize: 13 }}>{cMsg}</p>}
            </>
          ) : (
            <p style={{ color: palette.smoke, fontSize: 14 }}>
              {cName || "—"}
              {cTaxId ? ` · ${t("settings.company.taxId")} ${cTaxId}` : ""}
              {cAddress ? ` · ${cAddress}` : ""}
              <br />
              {t("settings.company.ownerOnly")}
            </p>
          )}
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 16 }}>{t("auth.twoFactor")}</strong>
          <span
            style={{
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 999,
              background: state === "on" ? "#16331c" : palette.coal,
              color: state === "on" ? "#22c55e" : palette.smoke,
              border: `1px solid ${state === "on" ? "#22c55e" : palette.graphite}`,
            }}
          >
            {state === "on" ? t("common.active") : t("common.disabled")}
          </span>
        </div>

        {state === "loading" && <p style={{ color: palette.smoke }}>{t("common.loading")}</p>}

        {state === "off" && (
          <Button onClick={startEnroll} disabled={busy}>
            {t("settings.twofa.enable")}
          </Button>
        )}

        {state === "enrolling" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: palette.smoke, fontSize: 14, margin: 0 }}>
              {t("settings.twofa.scan")}
            </p>
            <div
              style={{
                background: palette.white,
                padding: 12,
                borderRadius: 8,
                width: "fit-content",
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: QR jako data-URI/SVG, bez optymalizacji next/image */}
              <img src={qrSrc} alt={t("settings.twofa.qrAlt")} width={180} height={180} />
            </div>
            <div style={{ fontSize: 12, color: palette.smoke }}>
              {t("settings.twofa.manual")} <code style={{ color: palette.offWhite }}>{secret}</code>
            </div>
            <input
              style={f.input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              autoComplete="one-time-code"
            />
            <Button onClick={confirmEnroll} disabled={busy}>
              {t("auth.twoFactorVerify")}
            </Button>
          </div>
        )}

        {state === "on" && (
          <Button variant="danger" onClick={disable} disabled={busy}>
            {t("settings.twofa.disable")}
          </Button>
        )}
      </div>

      <div style={styles.card}>
        <strong style={{ fontSize: 16 }}>{t("auth.passkey")}</strong>
        <p style={{ color: palette.smoke, fontSize: 13, margin: 0 }}>
          {t("settings.passkey.desc")}
        </p>

        {passkeys.length === 0 ? (
          <p style={{ color: palette.smoke, fontSize: 14 }}>{t("auth.passkeyNone")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: palette.black,
                  border: `1px solid ${palette.graphite}`,
                }}
              >
                <span>🔑 {pk.name ?? t("settings.passkey.unnamed")}</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: palette.smoke, fontSize: 12 }}>
                  {pk.created_at?.slice(0, 10)}
                </span>
                <Button variant="danger" onClick={() => removePasskey(pk.id)}>
                  🗑️
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button onClick={addPasskey} disabled={pkBusy}>
          {t("auth.passkeyAdd")}
        </Button>
        {pkMsg && <p style={{ color: palette.smoke, fontSize: 14, marginTop: 4 }}>{pkMsg}</p>}
      </div>

      <PushToggle />

      {isOwner && companyId && (
        <div style={{ ...styles.card, borderColor: palette.red }}>
          <strong style={{ fontSize: 16, color: palette.red }}>{t("settings.danger.title")}</strong>
          <p style={{ color: palette.smoke, fontSize: 13, margin: 0 }}>
            {t("settings.danger.desc")}
          </p>
          <label style={styles.field}>
            <span style={{ fontSize: 12, color: palette.smoke }}>
              {t("settings.danger.confirmLabel")}{" "}
              <code style={{ color: palette.offWhite }}>{cName}</code>
            </span>
            <input
              style={styles.cInput}
              value={wipeConfirm}
              onChange={(e) => setWipeConfirm(e.target.value)}
              placeholder={cName}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            style={{
              ...styles.danger,
              opacity: wipeBusy || wipeConfirm.trim() !== cName.trim() ? 0.5 : 1,
            }}
            disabled={wipeBusy || wipeConfirm.trim() !== cName.trim()}
            onClick={wipeCompany}
          >
            {wipeBusy ? t("settings.danger.working") : `🗑️ ${t("settings.danger.button")}`}
          </button>
        </div>
      )}

      {/* [#372] Usunięcie konta musi być dostępne dla KAŻDEGO użytkownika
          (App Store 5.1.1(v)) — świadomie poza warunkiem `isOwner`. */}
      <div style={{ ...styles.card, borderColor: palette.red }}>
        <strong style={{ fontSize: 16, color: palette.red }}>
          {t("settings.account.delete.title")}
        </strong>
        <p style={{ color: palette.smoke, fontSize: 13, margin: 0 }}>
          {t("settings.account.delete.desc")}
        </p>
        <label style={styles.field}>
          <span style={{ fontSize: 12, color: palette.smoke }}>
            {t("settings.account.delete.confirmLabel")}
          </span>
          <input
            style={styles.cInput}
            value={delConfirm}
            onChange={(e) => setDelConfirm(e.target.value)}
            placeholder={t("settings.account.delete.confirmWord")}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          style={{
            ...styles.danger,
            opacity:
              delBusy || delConfirm.trim() !== t("settings.account.delete.confirmWord") ? 0.5 : 1,
          }}
          disabled={delBusy || delConfirm.trim() !== t("settings.account.delete.confirmWord")}
          onClick={deleteAccount}
        >
          {delBusy
            ? t("settings.account.delete.working")
            : `🗑️ ${t("settings.account.delete.button")}`}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // [#404] Linki firmowe.
  linkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 0",
    borderTop: `1px solid ${palette.graphite}`,
  },
  linkUrl: {
    color: palette.smoke,
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  linkBadge: {
    marginLeft: 8,
    fontSize: 11,
    color: palette.warning,
    border: `1px solid ${palette.warning}`,
    borderRadius: 6,
    padding: "1px 6px",
  },
  linkMove: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    width: 30,
    height: 30,
    cursor: "pointer",
  },
  linkForm: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${palette.graphite}`,
  },
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 420,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  cInput: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    width: "100%",
  },
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
};
