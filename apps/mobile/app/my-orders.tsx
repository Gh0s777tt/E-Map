/** Stary adres z powiadomień push (#285) — przekierowanie do zakładki Zlecenia. */
import { Redirect } from "expo-router";

export default function MyOrdersRedirect() {
  return <Redirect href="/orders" />;
}
