"use client";

import { createInvite } from "@e-logistic/api";
import { createTranslator } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { DriverRoster } from "@/components/DriverRoster";
import * as f from "@/components/formStyles";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

const t = createTranslator("pl");

export default function DriversPage() {
  const { vehicles } = useFleet();
  const [canInvite, setCanInvite] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await getCachedMembership(getBrowserSupabase());
        setCanInvite(m?.role === "owner" || m?.role === "dispatcher");
      } catch {
        setCanInvite(false);
      }
    })();
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    setLink(null);
    setQr(null);
    try {
      const token = await createInvite(getBrowserSupabase(), {
        role: "driver",
        vehicleId: vehicleId || undefined,
      });
      const url = `${window.location.origin}/join?token=${token}`;
      setLink(url);
      const QR = (await import("qrcode")).default;
      setQr(await QR.toDataURL(url, { width: 220, margin: 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć zaproszenia.");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (link) navigator.clipboard?.writeText(link);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader
        title={t("nav.drivers")}
        subtitle="Zaproś kierowcę linkiem lub kodem QR — dołączy do firmy po zalogowaniu."
      />

      {!canInvite ? (
        <p style={{ color: palette.smoke, marginTop: 16 }}>
          Tylko właściciel lub spedytor może generować zaproszenia.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 20,
            maxWidth: 360,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: palette.smoke }}>
              Przypisz pojazd (opcjonalnie)
            </span>
            <select
              style={f.input}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">— bez pojazdu —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={generate} disabled={busy}>
            {busy ? "Generuję…" : "Generuj zaproszenie"}
          </Button>
          {error && <p style={{ color: palette.red, fontSize: 13 }}>{error}</p>}
        </div>
      )}

      {link && (
        <div style={{ ...f.card, marginTop: 24, padding: 16, maxWidth: 360 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Zaproszenie gotowe (ważne 7 dni)</div>
          {qr && (
            // biome-ignore lint/performance/noImgElement: data-URL QR, nie wymaga next/image
            <img
              src={qr}
              alt="Kod QR zaproszenia"
              width={220}
              height={220}
              style={{ borderRadius: 8, background: palette.white, padding: 8 }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <input style={{ ...f.input, flex: 1 }} readOnly value={link} />
            <Button variant="ghost" onClick={copy}>
              Kopiuj
            </Button>
          </div>
        </div>
      )}

      <DriverRoster />
    </div>
  );
}
