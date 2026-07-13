/** #314 (N1): nagłówek aplikacji — „3 kreski" (szuflada), logo, avatar. */
import { palette } from "@e-logistic/ui";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrawer } from "../lib/drawer";
import { initialOf, useProfile } from "../lib/useProfile";
import { Avatar } from "./ui";

export function AppHeader({ subtitle }: { subtitle?: string | null }) {
  const { openDrawer } = useDrawer();
  const profile = useProfile();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={openDrawer}
        hitSlop={12}
        style={s.burger}
        accessibilityLabel="Menu"
        accessibilityRole="button"
      >
        <View style={s.line} />
        <View style={s.line} />
        <View style={s.line} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={s.logo}>
          E-<Text style={{ color: palette.red }}>Logistic</Text>
        </Text>
        {subtitle ? (
          <Text style={s.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={() => router.push("/profile")} hitSlop={8} accessibilityLabel="Profil">
        <Avatar initial={initialOf(profile.email)} size={30} uri={profile.avatarUrl} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: palette.black,
  },
  burger: { width: 26, gap: 5, paddingVertical: 4 },
  line: { height: 2.5, borderRadius: 2, backgroundColor: palette.offWhite },
  logo: { color: palette.offWhite, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  sub: { color: palette.smoke, fontSize: 10.5, marginTop: 1 },
});
