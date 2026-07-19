"use client";

import { palette } from "@e-logistic/ui";
import { useT } from "@/components/LocaleProvider";

export type DiagramZone = "front" | "left" | "right" | "rear" | "wheels";

/** Które strefy podświetlić na podstawie układu + strony usterki. */
export function zonesFor(part: string, side?: string): Set<DiagramZone> {
  const z = new Set<DiagramZone>();
  const p = part.toLowerCase();
  if (p.includes("opon") || p.includes("koł") || p.includes("hamul")) z.add("wheels");
  if (p.includes("świat")) {
    z.add("front");
    z.add("rear");
  }
  if (p.includes("silnik") || p.includes("skrzyni") || p.includes("kabin")) z.add("front");
  if (p.includes("naczep") || p.includes("zabudow") || p.includes("adblue") || p.includes("wydech"))
    z.add("rear");
  if (p.includes("lusterk") || p.includes("szyb")) {
    z.add("left");
    z.add("right");
  }
  switch (side) {
    case "lewa":
      z.add("left");
      break;
    case "prawa":
      z.add("right");
      break;
    case "przód":
    case "oś przednia":
      z.add("front");
      break;
    case "tył":
    case "oś tylna":
      z.add("rear");
      break;
  }
  return z;
}

/** Schemat ciężarówki (widok z góry) z klikalnymi/podświetlanymi strefami. */
export function VehicleDiagram({
  part,
  side,
  onZone,
}: {
  part: string;
  side?: string;
  onZone?: (zone: DiagramZone) => void;
}) {
  const t = useT();
  const active = zonesFor(part, side);
  const fill = (z: DiagramZone) => (active.has(z) ? `${palette.red}cc` : "transparent");
  const stroke = palette.graphite;
  const body = palette.coal;

  const zoneProps = (z: DiagramZone) => ({
    onClick: () => onZone?.(z),
    style: { cursor: onZone ? "pointer" : "default" } as React.CSSProperties,
    fill: fill(z),
    stroke: active.has(z) ? palette.red : "transparent",
    strokeWidth: 1.5,
  });

  return (
    <svg viewBox="0 0 200 360" width="170" height="306" role="img" aria-label="Schemat pojazdu">
      <title>Schemat pojazdu — kliknij strefę</title>
      {/* nadwozie */}
      <rect x="45" y="8" width="110" height="80" rx="14" fill={body} stroke={stroke} />
      <rect x="40" y="92" width="120" height="250" rx="10" fill={body} stroke={stroke} />
      {/* koła */}
      <rect x="26" y="60" width="16" height="34" rx="4" fill="#222" stroke={stroke} />
      <rect x="158" y="60" width="16" height="34" rx="4" fill="#222" stroke={stroke} />
      <rect x="26" y="250" width="16" height="34" rx="4" fill="#222" stroke={stroke} />
      <rect x="158" y="250" width="16" height="34" rx="4" fill="#222" stroke={stroke} />
      <rect x="26" y="290" width="16" height="34" rx="4" fill="#222" stroke={stroke} />
      <rect x="158" y="290" width="16" height="34" rx="4" fill="#222" stroke={stroke} />

      {/* strefy klikalne / podświetlane */}
      <rect x="45" y="8" width="110" height="46" rx="12" {...zoneProps("front")} />
      <rect x="40" y="92" width="36" height="250" rx="8" {...zoneProps("left")} />
      <rect x="124" y="92" width="36" height="250" rx="8" {...zoneProps("right")} />
      <rect x="40" y="300" width="120" height="42" rx="8" {...zoneProps("rear")} />
      <rect x="20" y="55" width="160" height="6" {...zoneProps("wheels")} />
      <rect x="20" y="285" width="160" height="6" {...zoneProps("wheels")} />

      <text x="100" y="34" textAnchor="middle" fontSize="11" fill={palette.offWhite}>
        {t("reports.side.front")}
      </text>
      <text x="100" y="328" textAnchor="middle" fontSize="11" fill={palette.offWhite}>
        {t("reports.side.rear")}
      </text>
    </svg>
  );
}
