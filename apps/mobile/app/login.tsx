/**
 * Logowanie (#287): e-mail/hasło + Sign in with Apple (natywnie, iOS) +
 * Google i Microsoft przez OAuth PKCE w przeglądarce systemowej (deep link
 * `elogistic://auth`). Provider wyłączony w Supabase → czytelny komunikat.
 * Passkey działa w panelu web (natywny WebAuthn w RN — osobny etap).
 */
import { palette } from "@e-logistic/ui";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT = "elogistic://auth";

let DISABLED_TEXT = "Ten sposób logowania nie jest jeszcze włączony przez administratora firmy.";
function friendlyOAuthError(message: string): string {
  if (/not enabled|disabled|unsupported provider/i.test(message)) {
    return DISABLED_TEXT;
  }
  return message;
}

export default function Login() {
  const t = useT();
  DISABLED_TEXT = t("m.login.oauthDisabled");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "apple" | "google" | "azure">(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => {});
    }
  }, []);

  async function signIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError(t("m.login.missing"));
      return;
    }
    setBusy("password");
    try {
      const { error: e } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) setError(e.message);
      // Sukces → AuthProvider wykryje sesję i przekieruje na pulpit.
    } catch {
      setError(t("m.login.failed"));
    } finally {
      setBusy(null);
    }
  }

  /** Natywny Sign in with Apple → token tożsamości → sesja Supabase. */
  async function signInApple() {
    setError(null);
    setBusy("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple nie zwróciło tokenu.");
      const { error: e } = await getSupabase().auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (e) setError(friendlyOAuthError(e.message));
    } catch (e) {
      // ERR_REQUEST_CANCELED = użytkownik zamknął arkusz — bez komunikatu.
      const msg = e instanceof Error ? e.message : "";
      if (!/canceled|cancelled/i.test(msg)) {
        setError(friendlyOAuthError(msg || t("m.login.appleFailed")));
      }
    } finally {
      setBusy(null);
    }
  }

  /** OAuth w przeglądarce systemowej (PKCE): Google / Microsoft. */
  async function signInOAuth(provider: "google" | "azure") {
    setError(null);
    setBusy(provider);
    try {
      const sb = getSupabase();
      const { data, error: e } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: REDIRECT,
          skipBrowserRedirect: true,
          ...(provider === "azure" ? { scopes: "openid profile email" } : {}),
        },
      });
      if (e) {
        setError(friendlyOAuthError(e.message));
        return;
      }
      if (!data?.url) throw new Error("Brak adresu logowania.");
      const res = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT);
      if (res.type !== "success" || !res.url) return; // anulowane
      const code = new URL(res.url).searchParams.get("code");
      if (!code) {
        setError(t("m.login.cancelled"));
        return;
      }
      const { error: ex } = await sb.auth.exchangeCodeForSession(code);
      if (ex) setError(friendlyOAuthError(ex.message));
    } catch (e) {
      setError(friendlyOAuthError(e instanceof Error ? e.message : t("m.login.oauthFailed")));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.brand}>GH0ST EMPIRE</Text>
      <Text style={styles.title}>
        <Text style={styles.accent}>E</Text>-Logistic
      </Text>
      <Text style={styles.subtitle}>Zaloguj się do konta firmy</Text>

      {!supabaseConfigured ? (
        <Text style={styles.error}>
          Brak konfiguracji Supabase. Ustaw EXPO_PUBLIC_SUPABASE_URL i
          EXPO_PUBLIC_SUPABASE_ANON_KEY.
        </Text>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t("m.login.email")}
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={t("m.login.password")}
            placeholderTextColor={palette.smoke}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.cta, busy === "password" && styles.ctaDisabled]}
            disabled={busy !== null}
            onPress={signIn}
          >
            {busy === "password" ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.ctaText}>{t("m.login.signIn")}</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("m.login.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {appleAvailable && (
            <Pressable
              style={[styles.provider, styles.providerApple]}
              onPress={signInApple}
              disabled={busy !== null}
            >
              {busy === "apple" ? (
                <ActivityIndicator color={palette.black} />
              ) : (
                <Text style={styles.providerAppleText}>{t("m.login.viaApple")}</Text>
              )}
            </Pressable>
          )}
          <Pressable
            style={styles.provider}
            onPress={() => signInOAuth("google")}
            disabled={busy !== null}
          >
            {busy === "google" ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.providerText}>{t("m.login.viaGoogle")}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.provider}
            onPress={() => signInOAuth("azure")}
            disabled={busy !== null}
          >
            {busy === "azure" ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.providerText}>{t("m.login.viaMicrosoft")}</Text>
            )}
          </Pressable>

          <Text style={styles.passkeyNote}>{t("m.login.passkeyNote")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  brand: { color: palette.smoke, letterSpacing: 4, fontSize: 12 },
  title: { color: palette.offWhite, fontSize: 40, fontWeight: "800" },
  accent: { color: palette.red },
  subtitle: { color: palette.smoke, fontSize: 15, marginBottom: 12 },
  form: { width: "100%", maxWidth: 360, gap: 10 },
  input: {
    backgroundColor: palette.nearBlack,
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: palette.offWhite,
    fontSize: 16,
  },
  cta: {
    backgroundColor: palette.red,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.graphite },
  dividerText: { color: palette.smoke, fontSize: 12 },
  provider: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  providerApple: { backgroundColor: palette.white, borderColor: palette.white },
  providerAppleText: { color: palette.black, fontWeight: "700", fontSize: 15 },
  providerText: { color: palette.offWhite, fontWeight: "600", fontSize: 15 },
  passkeyNote: { color: palette.smoke, fontSize: 12, textAlign: "center", marginTop: 8 },
  error: { color: palette.red, fontSize: 13, textAlign: "center" },
});
