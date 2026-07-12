/**
 * #294: Haptyka — cienki wrapper na expo-haptics (best-effort, nigdy nie rzuca;
 * na web/symulatorze po prostu nic nie robi). Konwencja:
 *  - tap()     → lekkie kliknięcie (przyciski, kafle, wiersze)
 *  - success() → potwierdzenie (formularz wysłany, status zmieniony)
 *  - warn()    → ostrzeżenie (błąd walidacji, brak zasięgu)
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

export function tap(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warn(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
