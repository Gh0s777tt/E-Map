import { palette } from "@e-logistic/ui";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../components/AuthProvider";
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
      <Stack.Screen name="login" options={{ title: "Logowanie", headerShown: false }} />
      <Stack.Screen name="fuel" options={{ title: "Tankowanie" }} />
      <Stack.Screen name="adblue" options={{ title: "AdBlue" }} />
      <Stack.Screen name="trip" options={{ title: "Trasa" }} />
      <Stack.Screen name="checklists" options={{ title: "Checklisty" }} />
      <Stack.Screen name="documents" options={{ title: "Dokumenty" }} />
      <Stack.Screen name="chat" options={{ title: "Czat z dyspozytorem" }} />
      <Stack.Screen name="expenses" options={{ title: "Rejestr wydatków" }} />
      <Stack.Screen name="work-time" options={{ title: "Czas pracy" }} />
      <Stack.Screen name="settlement" options={{ title: "Moje rozliczenie" }} />
      <Stack.Screen name="vehicle" options={{ title: "Mój pojazd" }} />
      <Stack.Screen name="defects" options={{ title: "Usterki i szkody" }} />
      <Stack.Screen name="stats" options={{ title: "Statystyki" }} />
      <Stack.Screen name="settings" options={{ title: "Ustawienia" }} />
      <Stack.Screen name="my-orders" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNav />
    </AuthProvider>
  );
}
