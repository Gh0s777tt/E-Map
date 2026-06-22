"use client";

import { palette } from "@e-logistic/ui";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Pole podpisu odbiorcy (e-CMR / POD). Rysowanie pisakiem/myszą/dotykiem na
 * canvasie (białe „tło papieru", czarny tusz), eksport do PNG. Obsługuje
 * High-DPI i Pointer Events (mysz + dotyk + rysik).
 *
 * Uwaga: sama interakcja rysowania wymaga testu na urządzeniu dotykowym;
 * logika i eksport są deterministyczne.
 */
export function SignaturePad({
  onSave,
  onCancel,
  busy = false,
}: {
  onSave: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
  }, []);

  function at(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = at(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = at(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }

  return (
    <div style={styles.wrap}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div style={styles.row}>
        <Button variant="ghost" onClick={clear} disabled={busy}>
          🧹 Wyczyść
        </Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Anuluj
        </Button>
        <Button onClick={save} disabled={busy || !hasInk}>
          {busy ? "Zapisuję…" : "✔️ Zapisz podpis"}
        </Button>
      </div>
      {!hasInk && (
        <p style={{ color: palette.smoke, fontSize: 12, margin: "2px 0 0" }}>
          Złóż podpis w polu powyżej.
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 8 },
  canvas: {
    width: "100%",
    height: 180,
    background: "#ffffff",
    borderRadius: 8,
    border: `1px solid ${palette.graphite}`,
    touchAction: "none",
    cursor: "crosshair",
    display: "block",
  },
  row: { display: "flex", alignItems: "center", gap: 8 },
};
