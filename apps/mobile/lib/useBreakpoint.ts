/** #322: progi responsywne — telefon / tablet (iPad, macOS) / szeroki. */
import { useWindowDimensions } from "react-native";

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, isTablet: width >= 768, isWide: width >= 1024 };
}
