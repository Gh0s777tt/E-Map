import { ICONS, type IconName } from "@e-logistic/ui";

/**
 * #294: Ikona SVG z wspólnego zestawu @e-logistic/ui (obrys, dziedziczy kolor
 * z `currentColor` — świeci na czerwono w aktywnych linkach bez dodatkowego CSS).
 */
export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  style,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
