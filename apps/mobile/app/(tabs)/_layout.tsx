/**
 * #285→#314: dolna nawigacja w układzie N1 (wybór właściciela):
 * Start / Formularze / Karty / Czat / Checklisty — najczęstsze akcje kierowcy
 * zawsze pod kciukiem; reszta zakładek w szufladzie „3 kreski" (SideMenu).
 */
import { type IconName, palette } from "@e-logistic/ui";
import { Tabs } from "expo-router";
import { type ColorValue, View } from "react-native";
import { Icon } from "../../components/Icon";
import { OfflineBar } from "../../components/OfflineBar";
import { SideMenu } from "../../components/SideMenu";
import { DrawerProvider } from "../../lib/drawer";
import { useT } from "../../lib/i18n";
import { usePositionReporter } from "../../lib/positionShare";

function icon(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} size={23} color={color} />;
}

export default function TabsLayout() {
  const t = useT();
  usePositionReporter(); // #324: raport pozycji (tylko gdy kierowca włączył w Ustawieniach)
  return (
    <DrawerProvider>
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
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
            sceneStyle: { backgroundColor: palette.black },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ title: t("m.nav.start"), tabBarIcon: icon("home") }}
          />
          <Tabs.Screen
            name="forms"
            options={{ title: t("m.nav.forms"), tabBarIcon: icon("fuel") }}
          />
          <Tabs.Screen
            name="cards"
            options={{ title: t("m.nav.cards"), tabBarIcon: icon("creditCard") }}
          />
          <Tabs.Screen
            name="chat"
            options={{ title: t("m.screen.chat"), tabBarIcon: icon("chat") }}
          />
          <Tabs.Screen
            name="checklists"
            options={{ title: t("m.screen.checklists"), tabBarIcon: icon("clipboard") }}
          />
        </Tabs>
        <SideMenu />
      </View>
    </DrawerProvider>
  );
}
