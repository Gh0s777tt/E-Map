/**
 * #318: Mój profil — avatar (upload do Storage), telefon kontaktowy,
 * zmiana e-maila (link potwierdzający na nowy adres) i hasła.
 * Kierowca aktualizuje swoje dane bez udziału właściciela.
 */
import { changeMyEmail, changeMyPassword, updateMyPhone, uploadMyAvatar } from "@e-logistic/api";
import { palette } from "@e-logistic/ui";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { Avatar, Card, PrimaryButton, SectionTitle } from "../components/ui";
import { success, warn } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { initialOf, useProfile } from "../lib/useProfile";

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

export default function ProfileScreen() {
  const t = useT();
  const profile = useProfile();
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const shownAvatar = avatarUrl ?? profile.avatarUrl;
  const shownPhone = phone ?? profile.phone ?? "";

  async function run(kind: string, fn: () => Promise<void>, okMsg: string) {
    if (busy || !supabaseConfigured) return;
    setMsg(null);
    setBusy(kind);
    try {
      await fn();
      success();
      setMsg(okMsg);
    } catch (e) {
      warn();
      setMsg(e instanceof Error ? e.message : t("m.profile.error"));
    } finally {
      setBusy(null);
    }
  }

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) return;
    const contentType = asset.mimeType ?? "image/jpeg";
    await run(
      "avatar",
      async () => {
        const url = await uploadMyAvatar(getSupabase(), decode(asset.base64 ?? ""), {
          contentType,
          ext: extFromMime(contentType),
        });
        setAvatarUrl(url);
      },
      t("m.profile.avatarSaved"),
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card style={s.head}>
        <Pressable onPress={pickAvatar} accessibilityLabel={t("m.profile.changeAvatar")}>
          <Avatar initial={initialOf(profile.email)} size={72} uri={shownAvatar} />
          <View style={s.camBadge}>
            <Text style={{ fontSize: 12 }}>📷</Text>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headName} numberOfLines={1}>
            {session?.user?.email ?? "—"}
          </Text>
          <Text style={s.headHint}>{t("m.profile.avatarHint")}</Text>
        </View>
      </Card>

      {msg && <Text style={s.msg}>{msg}</Text>}

      <SectionTitle>{t("m.profile.phone")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <TextInput
          style={s.input}
          value={shownPhone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+48 600 000 000"
          placeholderTextColor={palette.smoke}
        />
        <PrimaryButton
          label={busy === "phone" ? "…" : t("m.profile.save")}
          onPress={() =>
            run("phone", () => updateMyPhone(getSupabase(), shownPhone), t("m.profile.phoneSaved"))
          }
        />
      </Card>

      <SectionTitle>{t("m.profile.email")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={profile.email ?? "nowy@email.com"}
          placeholderTextColor={palette.smoke}
        />
        <Text style={s.hint}>{t("m.profile.emailHint")}</Text>
        <PrimaryButton
          label={busy === "email" ? "…" : t("m.profile.changeEmail")}
          onPress={() => {
            if (!email.includes("@")) {
              setMsg(t("m.profile.emailInvalid"));
              return;
            }
            run("email", () => changeMyEmail(getSupabase(), email), t("m.profile.emailSent"));
          }}
        />
      </Card>

      <SectionTitle>{t("m.profile.password")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <TextInput
          style={s.input}
          value={pass1}
          onChangeText={setPass1}
          secureTextEntry
          placeholder={t("m.profile.newPassword")}
          placeholderTextColor={palette.smoke}
        />
        <TextInput
          style={s.input}
          value={pass2}
          onChangeText={setPass2}
          secureTextEntry
          placeholder={t("m.profile.repeatPassword")}
          placeholderTextColor={palette.smoke}
        />
        <PrimaryButton
          label={busy === "pass" ? "…" : t("m.profile.changePassword")}
          onPress={() => {
            if (pass1.length < 8) {
              setMsg(t("m.profile.passwordShort"));
              return;
            }
            if (pass1 !== pass2) {
              setMsg(t("m.profile.passwordMismatch"));
              return;
            }
            run(
              "pass",
              async () => {
                await changeMyPassword(getSupabase(), pass1);
                setPass1("");
                setPass2("");
              },
              t("m.profile.passwordSaved"),
            );
          }}
        />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  camBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: palette.red,
    borderRadius: 999,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headName: { color: palette.offWhite, fontSize: 15, fontWeight: "800" },
  headHint: { color: palette.smoke, fontSize: 12, marginTop: 3, lineHeight: 17 },
  msg: { color: palette.smoke, fontSize: 13 },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: palette.graphite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.offWhite,
    fontSize: 15,
    backgroundColor: palette.nearBlack,
  },
});
