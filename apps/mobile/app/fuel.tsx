import { createTranslator } from "@e-logistic/i18n";
import { Stack } from "expo-router";
import { LiquidForm } from "../components/LiquidForm";

const t = createTranslator("pl");

export default function FuelScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("form.fuel.title") }} />
      <LiquidForm kind="fuel" />
    </>
  );
}
