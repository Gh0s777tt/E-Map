import { createTranslator } from "@e-logistic/i18n";
import { Stack } from "expo-router";
import { LiquidForm } from "../components/LiquidForm";

const t = createTranslator("pl");

export default function AdblueScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("form.adblue.title") }} />
      <LiquidForm kind="adblue" />
    </>
  );
}
