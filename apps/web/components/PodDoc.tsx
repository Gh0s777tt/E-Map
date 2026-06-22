"use client";

import type { Company, Order } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { Button } from "@/components/ui";
import { usePodSignature } from "@/lib/usePodSignature";

const DELIVERED = new Set(["delivered", "invoiced"]);

/**
 * Samodzielny, lekki „Dowód dostawy" (Proof of Delivery) ze zlecenia —
 * krótszy niż pełny list CMR, do szybkiej wysyłki klientowi. Zawiera trasę,
 * ładunek, strony i podpis odbiorcy (jeśli złożony). Druk/PDF przez przeglądarkę.
 */
export function PodDoc({
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
  const pod = usePodSignature(order.id);
  const carrier = [
    company?.name,
    company?.address,
    company?.tax_id ? `NIP ${company.tax_id}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const delivered = DELIVERED.has(order.status);

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="no-print">
        <Button variant="ghost" onClick={onBack}>
          ← Wstecz
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={() => window.print()}>🖨️ Drukuj / PDF</Button>
      </div>

      <div style={pd.doc}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>DOWÓD DOSTAWY</div>
            <div style={pd.muted}>Proof of Delivery (POD)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: palette.red }}>E-Logistic</div>
            {order.reference_no && <div style={pd.muted}>Zlecenie: {order.reference_no}</div>}
            {delivered && <div style={pd.stamp}>DOSTARCZONO</div>}
          </div>
        </div>

        <div style={pd.grid}>
          <Field title="Nadawca">
            <strong>{order.shipper || "—"}</strong>
          </Field>
          <Field title="Odbiorca">
            <strong>{order.consignee || "—"}</strong>
          </Field>
        </div>

        <div style={pd.grid}>
          <Field title="Miejsce załadunku">
            {order.origin || "—"}
            {order.load_date && <div style={pd.muted}>Data: {order.load_date}</div>}
          </Field>
          <Field title="Miejsce rozładunku">
            {order.destination || "—"}
            {order.unload_date && <div style={pd.muted}>Data: {order.unload_date}</div>}
          </Field>
        </div>

        <div style={pd.grid}>
          <Field title="Towar">
            {order.cargo || "—"}
            {order.weight_kg != null && <div style={pd.muted}>Waga: {order.weight_kg} kg</div>}
          </Field>
          <Field title="Przewoźnik / pojazd">
            {carrier || "—"}
            <div style={pd.muted}>Pojazd: {vehicleReg}</div>
          </Field>
        </div>

        <div style={pd.sigBox}>
          <div style={pd.boxHead}>Potwierdzenie odbioru — podpis odbiorcy</div>
          {pod ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: e-podpis z podpisanego URL Storage (bucket prywatny, nie next/image) */}
              <img src={pod.url} alt="Podpis odbiorcy" style={pd.sigImg} />
              <div style={pd.muted}>
                {pod.recipient ? `Odbiorca: ${pod.recipient}` : "Odbiorca: —"}
                {pod.when ? ` · ${pod.when}` : ""}
              </div>
            </>
          ) : (
            <>
              <div style={pd.sigLine} />
              <div style={pd.muted}>
                Podpis i data — brak e-podpisu w systemie (podpis odręczny).
              </div>
            </>
          )}
        </div>

        <p style={pd.muted}>
          Dokument wygenerowany w E-Logistic na podstawie zlecenia. Potwierdza dostarczenie ładunku
          do odbiorcy.
        </p>
      </div>

      <style>{`@media print { .no-print { display: none !important; } .app-sidebar { display: none !important; } }`}</style>
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={pd.box}>
      <div style={pd.boxHead}>{title}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

const pd: Record<string, React.CSSProperties> = {
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
  stamp: {
    marginTop: 6,
    display: "inline-block",
    border: `2px solid ${palette.red}`,
    color: palette.red,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 1,
    padding: "2px 8px",
    borderRadius: 4,
    transform: "rotate(-3deg)",
  },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  box: { flex: 1, minWidth: 240, border: "1px solid #bbb", borderRadius: 6, padding: "8px 10px" },
  boxHead: { fontSize: 11, textTransform: "uppercase", color: "#888", marginBottom: 4 },
  sigBox: { border: "1px solid #bbb", borderRadius: 6, padding: "10px 12px" },
  sigImg: {
    height: 80,
    maxWidth: "100%",
    objectFit: "contain",
    background: "#fff",
    display: "block",
  },
  sigLine: { borderBottom: "1px solid #999", height: 56 },
};
