import { LoginForm } from "@/components/LoginForm";
import { getLocale } from "@/lib/locale";

// Język czytany serwerowo z ciasteczka → formularz renderuje się od razu w wybranym
// języku (bez migotania). Zmiana języka (LocaleSwitcher) odświeża tę trasę.
export default async function LoginPage() {
  const locale = await getLocale();
  return <LoginForm locale={locale} />;
}
