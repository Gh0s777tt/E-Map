/** #285: dolna nawigacja aplikacji kierowcy — Pulpit / Zlecenia / Mapa / Więcej. */
import { palette } from "@e-logistic/ui";
import { Tabs } from "expo-router";
import { type ColorValue, Text } from "react-native";

function icon(glyph: string) {
  return ({ color }: { color: ColorValue }) => (
    <Text style={{ fontSize: 22, color }} accessibilityElementsHidden>
      {glyph}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.red,
        tabBarInactiveTintColor: palette.smoke,
        tabBarStyle: {
          backgroundColor: "#111111",
          borderTopColor: palette.graphite,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        sceneStyle: { backgroundColor: palette.black },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Pulpit", tabBarIcon: icon("▦") }} />
      <Tabs.Screen name="orders" options={{ title: "Zlecenia", tabBarIcon: icon("📦") }} />
      <Tabs.Screen name="map" options={{ title: "Mapa", tabBarIcon: icon("🗺") }} />
      <Tabs.Screen name="more" options={{ title: "Więcej", tabBarIcon: icon("☰") }} />
    </Tabs>
  );
}
