/**
 * #285: dolna nawigacja aplikacji kierowcy — Pulpit / Zlecenia / Mapa / Więcej.
 * #294: ikony SVG (wspólny zestaw @e-logistic/ui) + globalny pasek outboxu.
 */
import { type IconName, palette } from "@e-logistic/ui";
import { Tabs } from "expo-router";
import { type ColorValue, View } from "react-native";
import { Icon } from "../../components/Icon";
import { OfflineBar } from "../../components/OfflineBar";

function icon(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} size={23} color={color} />;
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: palette.black }}>
      <OfflineBar />
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
        <Tabs.Screen name="index" options={{ title: "Pulpit", tabBarIcon: icon("home") }} />
        <Tabs.Screen name="orders" options={{ title: "Zlecenia", tabBarIcon: icon("package") }} />
        <Tabs.Screen name="map" options={{ title: "Mapa", tabBarIcon: icon("map") }} />
        <Tabs.Screen name="more" options={{ title: "Więcej", tabBarIcon: icon("menu") }} />
      </Tabs>
    </View>
  );
}
