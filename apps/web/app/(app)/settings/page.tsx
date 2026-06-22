"use client";

import { getCompany, updateCompany } from "@e-logistic/api";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { PushToggle } from "@/components/PushToggle";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type State = "loading" | "off" | "enrolling" | "on";
type Passkey = { id: string; name: string | null; created_at: string };

export default function SettingsPage() {
  const confirm = useConfirm();
  const [state, setState] = useState<State>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [pkBusy, setPkBusy] = useState(false);
  const [pkMsg, setPkMsg] = useState<string | null>(null);

  // Dane firmy (sprzedawca na fakturach/CMR) — edycja tylko dla właściciela.
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [cName, setCName] = useState("");
  const [cTaxId, setCTaxId] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cCountry, setCCountry] = useState("");
  const [cVat, setCVat] = useState("23");
  const [cDueDays, setCDueDays] = useState("14");
  const [cMsg, setCMsg] = useState<string | null>(null);
  const [cBusy, setCBusy] = useState(false);

  const loadCompany = useCallback(async () => {
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setIsOwner(m.role === "owner");
      setCompanyId(m.companyId);
      const c = await getCompany(sb, m.companyId);
      if (c) {
        setCName(c.name ?? "");
        setCTaxId(c.tax_id ?? "");
        setCAddress(c.address ?? "");
        setCCountry(c.country ?? "");
        setCVat(String(c.default_vat_rate ?? 23));
        setCDueDays(String(c.payment_due_days ?? 14));
      }
    } catch {
      // brak firmy / dostępu
    }
  }, []);

  async function saveCompany() {
    if (!companyId) return;
    setCMsg(null);
    if (!cName.trim()) {
      setCMsg("Nazwa firmy jest wymagana.");
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
      });
      setCMsg("✅ Zapisano dane firmy.");
    } catch (e) {
      setCMsg(e instanceof Error ? e.message : "Błąd zapisu danych firmy.");
    } finally {
      setCBusy(false);
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
      const name = window.prompt("Nazwa klucza (np. iPhone Jana)", "Mój klucz");
      const optRes = await fetch("/api/passkey/register/options", { method: "POST" });
      if (!optRes.ok) {
        setPkMsg("Zaloguj się ponownie, aby dodać klucz.");
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
        setPkMsg(data.error ?? "Nie udało się dodać klucza.");
        return;
      }
      setPkMsg("✅ Klucz dodany.");
      await loadPasskeys();
    } catch (e) {
      setPkMsg(e instanceof Error ? e.message : "Błąd passkey.");
    } finally {
      setPkBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (!(await confirm("Usunąć ten klucz dostępu?"))) return;
    try {
      await getBrowserSupabase().from("passkeys").delete().eq("id", id);
      await loadPasskeys();
    } catch (e) {
      setPkMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  async function startEnroll() {
    setBusy(true);
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      // Usuń ewentualny niezweryfikowany factor (np. po przerwanej próbie).
      const { data: existing } = await sb.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        setMsg(error?.message ?? "Nie udało się rozpocząć konfiguracji.");
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
    setMsg(null);
    try {
      const sb = getBrowserSupabase();
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId });
      if (chErr || !ch) {
        setMsg(chErr?.message ?? "Błąd.");
        return;
      }
      const { error } = await sb.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setCode("");
      setQr("");
      setSecret("");
      setMsg("✅ 2FA włączone.");
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factorId) return;
    if (!(await confirm("Wyłączyć weryfikację dwuetapową?"))) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await getBrowserSupabase().auth.mfa.unenroll({ factorId });
      if (error) {
        setMsg(error.message);
        return;
      }
      setFactorId(null);
      setMsg("2FA wyłączone.");
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  const qrSrc = qr.startsWith("data:") ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.settings")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Bezpieczeństwo konta — weryfikacja dwuetapowa (2FA) kodem z aplikacji (Google Authenticator,
        Authy, 1Password…).
      </p>

      {companyId && (
        <div style={styles.card}>
          <strong style={{ fontSize: 16 }}>🏢 Dane firmy (sprzedawca na fakturach/CMR)</strong>
          {isOwner ? (
            <>
              <label style={styles.field}>
                <span style={styles.label}>Nazwa firmy</span>
                <input
                  style={styles.cInput}
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>NIP</span>
                <input
                  style={styles.cInput}
                  value={cTaxId}
                  onChange={(e) => setCTaxId(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Adres</span>
                <input
                  style={styles.cInput}
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Kraj</span>
                <input
                  style={{ ...styles.cInput, maxWidth: 120 }}
                  value={cCountry}
                  onChange={(e) => setCCountry(e.target.value)}
                  placeholder="PL"
                />
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label style={styles.field}>
                  <span style={styles.label}>Domyślny VAT (%)</span>
                  <input
                    style={{ ...styles.cInput, maxWidth: 120 }}
                    type="number"
                    step="1"
                    value={cVat}
                    onChange={(e) => setCVat(e.target.value)}
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Termin płatności (dni)</span>
                  <input
                    style={{ ...styles.cInput, maxWidth: 140 }}
                    type="number"
                    step="1"
                    value={cDueDays}
                    onChange={(e) => setCDueDays(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <Button onClick={saveCompany} disabled={cBusy}>
                  {cBusy ? "Zapisywanie…" : "Zapisz dane firmy"}
                </Button>
              </div>
              {cMsg && <p style={{ color: palette.smoke, fontSize: 13 }}>{cMsg}</p>}
            </>
          ) : (
            <p style={{ color: palette.smoke, fontSize: 14 }}>
              {cName || "—"}
              {cTaxId ? ` · NIP ${cTaxId}` : ""}
              {cAddress ? ` · ${cAddress}` : ""}
              <br />
              Dane firmy może edytować tylko właściciel.
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
            {state === "on" ? "Aktywne" : "Wyłączone"}
          </span>
        </div>

        {state === "loading" && <p style={{ color: palette.smoke }}>Ładowanie…</p>}

        {state === "off" && (
          <Button onClick={startEnroll} disabled={busy}>
            Włącz 2FA
          </Button>
        )}

        {state === "enrolling" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: palette.smoke, fontSize: 14, margin: 0 }}>
              Zeskanuj kod QR w aplikacji uwierzytelniającej, potem wpisz 6-cyfrowy kod.
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
              <img src={qrSrc} alt="Kod QR 2FA" width={180} height={180} />
            </div>
            <div style={{ fontSize: 12, color: palette.smoke }}>
              Ręcznie: <code style={{ color: palette.offWhite }}>{secret}</code>
            </div>
            <input
              style={styles.input}
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
            Wyłącz 2FA
          </Button>
        )}

        {msg && <p style={{ color: palette.smoke, fontSize: 14, marginTop: 4 }}>{msg}</p>}
      </div>

      <div style={styles.card}>
        <strong style={{ fontSize: 16 }}>{t("auth.passkey")}</strong>
        <p style={{ color: palette.smoke, fontSize: 13, margin: 0 }}>
          Logowanie bez hasła odciskiem palca, Face ID lub kluczem sprzętowym. Klucz jest związany z
          tym urządzeniem i tą domeną.
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
                <span>🔑 {pk.name ?? "Klucz"}</span>
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: palette.offWhite,
    maxWidth: 200,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: palette.smoke },
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
