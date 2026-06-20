import { palette } from "@e-logistic/ui";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.black },
        headerTintColor: palette.red,
        contentStyle: { backgroundColor: palette.black },
      }}
    >
      <Stack.Screen name="index" options={{ title: "E-Logistic" }} />
    </Stack>
  );
}
