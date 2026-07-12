/**
 * #294: Ikona SVG z wspólnego zestawu @e-logistic/ui — ten sam wygląd co web
 * (obrys 2px, zaokrąglone końce), renderowana przez react-native-svg.
 */
import { ICONS, type IconName, palette } from "@e-logistic/ui";
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

export function Icon({
  name,
  size = 22,
  color = palette.offWhite,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
