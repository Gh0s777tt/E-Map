import { palette } from "@e-logistic/ui";
import * as Sentry from "@sentry/react-native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import { LocaleProvider, useT } from "../lib/i18n";
import { guardRedirect, notificationTarget } from "../lib/navigation";

/** Tap w powiadomienie push → przejście do ekranu wskazanego w `data.url`. */
function useNotificationTap() {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      router.push(notificationTarget(url) as never);
    });
    return () => sub.remove();
  }, [router]);
}

/** Bramka: bez sesji → /login; z sesją na /login → pulpit. Decyzja w `guardRedirect`. */
function useProtectedRoute() {
  const { session, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const target = guardRedirect({ session, loading, configured, segments });
    if (target) router.replace(target);
  }, [session, loading, configured, segments, router]);
}

function RootNav() {
  useProtectedRoute();
  useNotificationTap();
  const t = useT(); // #300: tytuły ekranów w języku użytkownika
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.black },
        headerTintColor: palette.red,
        headerTitleStyle: { color: palette.offWhite },
        contentStyle: { backgroundColor: palette.black },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: t("m.screen.login"), headerShown: false }} />
      <Stack.Screen name="fuel" options={{ title: t("m.screen.fuel") }} />
      <Stack.Screen name="orders" options={{ title: t("m.tab.orders") }} />
      <Stack.Screen name="map" options={{ title: t("m.tab.map") }} />
      <Stack.Screen name="adblue" options={{ title: t("m.screen.adblue") }} />
      <Stack.Screen name="trip" options={{ title: t("m.screen.trip") }} />
      <Stack.Screen name="documents" options={{ title: t("m.screen.documents") }} />
      <Stack.Screen name="chat-thread" options={{ title: t("m.screen.chatThread") }} />
      <Stack.Screen name="expenses" options={{ title: t("m.screen.expenses") }} />
      <Stack.Screen name="work-time" options={{ title: t("m.screen.workTime") }} />
      <Stack.Screen name="settlement" options={{ title: t("m.screen.settlement") }} />
      <Stack.Screen name="per-diem" options={{ title: t("m.screen.perDiem") }} />
      <Stack.Screen name="payouts" options={{ title: t("m.screen.payouts") }} />
      <Stack.Screen name="fuel-prices" options={{ title: t("m.screen.fuelPrices") }} />
      <Stack.Screen name="vehicle" options={{ title: t("m.screen.vehicle") }} />
      <Stack.Screen name="defects" options={{ title: t("m.screen.defects") }} />
      <Stack.Screen name="stats" options={{ title: t("m.screen.stats") }} />
      <Stack.Screen name="settings" options={{ title: t("m.screen.settings") }} />
      <Stack.Screen name="profile" options={{ title: t("m.profile.title") }} />
      <Stack.Screen name="my-orders" options={{ headerShown: false }} />
    </Stack>
  );
}

// #306: Sentry — crash reporty z telefonów kierowców. Bez EXPO_PUBLIC_SENTRY_DSN: no-op.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
}

function RootLayout() {
  return (
    // #295: korzeń gestów — wymagany przez swipe na kartach zleceń (RNGH)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocaleProvider>
        <AuthProvider>
          <RootNav />
        </AuthProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
