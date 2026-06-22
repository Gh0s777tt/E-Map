import { palette } from "@e-logistic/ui";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../components/AuthProvider";

/** Tap w powiadomienie push → przejście do ekranu wskazanego w `data.url`. */
function useNotificationTap() {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url as never);
      else router.push("/my-orders");
    });
    return () => sub.remove();
  }, [router]);
}

/** Bramka: bez sesji → /login; z sesją na /login → pulpit. */
function useProtectedRoute() {
  const { session, loading, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !configured) return;
    const onLogin = segments[0] === "login";
    if (!session && !onLogin) router.replace("/login");
    else if (session && onLogin) router.replace("/");
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
        contentStyle: { backgroundColor: palette.black },
      }}
    >
      <Stack.Screen name="index" options={{ title: "E-Logistic" }} />
      <Stack.Screen name="login" options={{ title: "Logowanie", headerShown: false }} />
      <Stack.Screen name="my-orders" options={{ title: "Moje zlecenia" }} />
      <Stack.Screen name="fuel" options={{ title: "Tankowanie" }} />
      <Stack.Screen name="adblue" options={{ title: "AdBlue" }} />
      <Stack.Screen name="trip" options={{ title: "Trasa" }} />
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
