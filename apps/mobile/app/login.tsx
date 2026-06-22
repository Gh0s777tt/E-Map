import { palette } from "@e-logistic/ui";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Podaj e-mail i hasło.");
      return;
    }
    setBusy(true);
    try {
      const { error: e } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) setError(e.message);
      // Sukces → AuthProvider wykryje sesję i przekieruje na pulpit.
    } catch {
      setError("Nie udało się zalogować.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
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
            placeholder="E-mail"
            placeholderTextColor={palette.smoke}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Hasło"
            placeholderTextColor={palette.smoke}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            disabled={busy}
            onPress={signIn}
          >
            {busy ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.ctaText}>Zaloguj się</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.black,
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.offWhite,
    fontSize: 16,
  },
  cta: {
    backgroundColor: palette.red,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: palette.white, fontWeight: "700", fontSize: 16 },
  error: { color: palette.red, fontSize: 13, textAlign: "center" },
});
