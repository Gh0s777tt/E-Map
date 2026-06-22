"use client";

import {
  type Company,
  getOrderPhotoUrl,
  listOrderPhotos,
  type Order,
  type OrderPhoto,
} from "@e-logistic/api";
import { isPodCaption, parsePodCaption } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Drukowalny międzynarodowy list przewozowy CMR (uproszczony) ze zlecenia. */
export function CmrDoc({
  order,
  company,
  vehicleReg,
  onBack,
}: {
  order: Order;
  company: Company | null;
  vehicleReg: string;
  onBack: () => void;
}) {
  const carrier = [
    company?.name,
    company?.address,
    company?.tax_id ? `NIP ${company.tax_id}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Wczytuje najnowszy podpis odbiorcy (POD) zlecenia, by wstawić go w poz. 24.
  const [pod, setPod] = useState<{ url: string; recipient: string | null; when: string | null }>();
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const photos = await listOrderPhotos(sb, order.id);
        const sig = photos.find((p: OrderPhoto) => isPodCaption(p.caption));
        if (!sig) return;
        const url = await getOrderPhotoUrl(sb, sig.path, 1800).catch(() => "");
        if (!url || !alive) return;
        const info = parsePodCaption(sig.caption);
        setPod({ url, recipient: info.recipient, when: info.when });
      } catch {
        // brak podpisu / brak dostępu — zostają puste linie podpisu
      }
    })();
    return () => {
      alive = false;
    };
  }, [order.id]);
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="no-print">
        <Button variant="ghost" onClick={onBack}>
          ← Wstecz
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={cmr.doc}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>LIST PRZEWOZOWY CMR</div>
            <div style={cmr.muted}>Międzynarodowy samochodowy list przewozowy (uproszczony)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: palette.red }}>E-Logistic</div>
            {order.reference_no && <div style={cmr.muted}>Zlecenie: {order.reference_no}</div>}
          </div>
        </div>

        <div style={cmr.grid}>
          <Box n={1} title="Nadawca">
            <strong>{order.shipper || "—"}</strong>
            {order.origin && <div style={cmr.muted}>{order.origin}</div>}
          </Box>
          <Box n={2} title="Odbiorca">
            <strong>{order.consignee || "—"}</strong>
            {order.destination && <div style={cmr.muted}>{order.destination}</div>}
          </Box>
          <Box n={3} title="Miejsce przeznaczenia (rozładunek)">
            {order.destination || "—"}
            {order.unload_date && <div style={cmr.muted}>Data: {order.unload_date}</div>}
          </Box>
          <Box n={4} title="Miejsce i data załadowania">
            {order.origin || "—"}
            {order.load_date && <div style={cmr.muted}>Data: {order.load_date}</div>}
          </Box>
        </div>

        <Box n="6–9" title="Rodzaj towaru / opakowanie / ilość">
          {order.cargo || "—"}
        </Box>

        <div style={cmr.grid}>
          <Box n={11} title="Waga brutto (kg)">
            {order.weight_kg != null ? `${order.weight_kg} kg` : "—"}
          </Box>
          <Box n={16} title="Przewoźnik">
            {carrier || "—"}
            {company?.country && <div style={cmr.muted}>{company.country}</div>}
          </Box>
          <Box n={25} title="Nr rejestracyjny pojazdu">
            {vehicleReg}
          </Box>
        </div>

        {order.notes && (
          <Box n={13} title="Zlecenia / uwagi nadawcy">
            {order.notes}
          </Box>
        )}

        <div style={cmr.signs}>
          {["22 · Podpis nadawcy", "23 · Podpis przewoźnika"].map((s) => (
            <div key={s} style={cmr.sign}>
              <div style={cmr.signLine} />
              <div style={cmr.muted}>{s}</div>
            </div>
          ))}
          <div style={cmr.sign}>
            {pod ? (
              <>
                {/* biome-ignore lint/performance/noImgElement: e-podpis z podpisanego URL Storage (bucket prywatny, nie next/image) */}
                <img src={pod.url} alt="Podpis odbiorcy" style={cmr.signImg} />
                <div style={cmr.muted}>
                  24 · Podpis odbiorcy
                  {pod.recipient ? ` — ${pod.recipient}` : ""}
                  {pod.when ? ` (${pod.when})` : ""}
                </div>
              </>
            ) : (
              <>
                <div style={cmr.signLine} />
                <div style={cmr.muted}>24 · Podpis odbiorcy</div>
              </>
            )}
          </div>
        </div>

        <p style={cmr.muted}>
          Dokument uproszczony wygenerowany w E-Logistic na podstawie zlecenia. Nie zastępuje
          urzędowego formularza CMR — pełną zgodność (konwencja CMR) potwierdza przewoźnik.
        </p>
      </div>

      <style>{`@media print { .no-print { display: none !important; } .app-sidebar { display: none !important; } }`}</style>
    </div>
  );
}

function Box({
  n,
  title,
  children,
}: {
  n: number | string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cmr.box}>
      <div style={cmr.boxHead}>
        <span style={cmr.boxNum}>{n}</span> {title}
      </div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

const cmr: Record<string, React.CSSProperties> = {
  doc: {
    marginTop: 16,
    background: palette.white,
    color: "#111",
    borderRadius: 12,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  muted: { color: "#555", fontSize: 12 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  box: {
    flex: 1,
    minWidth: 220,
    border: "1px solid #bbb",
    borderRadius: 6,
    padding: "8px 10px",
  },
  boxHead: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  boxNum: {
    display: "inline-block",
    minWidth: 18,
    fontWeight: 800,
    color: palette.red,
  },
  signs: { display: "flex", gap: 16, marginTop: 8 },
  sign: { flex: 1, textAlign: "center" },
  signLine: { borderBottom: "1px solid #999", height: 40 },
  signImg: {
    height: 40,
    maxWidth: "100%",
    objectFit: "contain",
    borderBottom: "1px solid #999",
    display: "block",
    margin: "0 auto",
  },
};
