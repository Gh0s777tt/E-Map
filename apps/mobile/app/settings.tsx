/** #285: Ustawienia — konto, powiadomienia push, wersja aplikacji, wylogowanie.
 *  #300: wybór języka aplikacji (Systemowy / PL / EN / DE / UK). */

import {
  deleteMyAccount,
  deleteMyPosition,
  getAccountDeletionPreview,
  OwnerHasMembersError,
} from "@e-logistic/api";
import { MOBILE_LOCALES, type MobileLocale, type MobileMessageKey } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../components/AuthProvider";
import { Card, GhostButton, PrimaryButton, SectionTitle, wide } from "../components/ui";
import {
  authenticate,
  biometricAvailable,
  isAppLockEnabled,
  setAppLockEnabled,
} from "../lib/appLock";
import { type LocalePref, useLocale } from "../lib/i18n";
import {
  bgLocationEnabled,
  getSharePositionMode,
  type PositionShareMode,
  reportPositionOnce,
  setSharePositionMode,
} from "../lib/positionShare";
import { type PowerSyncStatusInfo, powersyncConfigured, powersyncStatus } from "../lib/powersync";
import { registerForPush } from "../lib/push";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const LOCALE_LABEL: Record<MobileLocale, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
  uk: "Українська",
};

/**
 * [#372] Dane lokalne kasowane razem z kontem. Sesję czyści `signOut`,
 * ale te klucze przeżyłyby wylogowanie i po zalogowaniu innego użytkownika
 * na tym samym telefonie wróciłyby jako cudze — m.in. niezsynchronizowane
 * formularze w kolejce offline i zgoda na udostępnianie pozycji.
 */
const LOCAL_KEYS_TO_WIPE = [
  "el-outbox",
  "el-share-position",
  "el-app-lock",
  "el-tacho-live",
  "el-tacho-km",
  "el-tacho-live-notifs",
  "el-weekly-rest-notifs",
  "el-live-activities",
];

// #351: tryby udostępniania pozycji (kolejność w chooserze). "always" tylko w v2.
const POS_MODES: PositionShareMode[] = ["off", "foreground", "always"];
const POS_MODE_LABEL: Record<PositionShareMode, MobileMessageKey> = {
  off: "m.settings.posOff",
  foreground: "m.settings.posForeground",
  always: "m.settings.posAlways",
};

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { pref, setPref, t } = useLocale();
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  // [#372] Blokuje ponowne kliknięcie w trakcie kasowania — operacja jest nieodwracalna.
  const [deleting, setDeleting] = useState(false);
  // #311: status PowerSync (offline sync) — tylko gdy skonfigurowany
  const [ps, setPs] = useState<PowerSyncStatusInfo | null>(null);
  useEffect(() => {
    if (!powersyncConfigured()) return;
    const tick = () =>
      powersyncStatus()
        .then(setPs)
        .catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);
  const version = Constants.expoConfig?.version ?? "—";

  // #324/#351: udostępnianie pozycji firmie (dobrowolne; wybór trybu; "off" kasuje wiersz)
  const [posMode, setPosMode] = useState<PositionShareMode>("off");
  const [posMsg, setPosMsg] = useState<string | null>(null);
  useEffect(() => {
    getSharePositionMode().then(setPosMode);
  }, []);
  // #340: blokada biometryczna aplikacji
  const [lockOn, setLockOn] = useState(false);
  const [bioAvail, setBioAvail] = useState<boolean | null>(null);
  useEffect(() => {
    isAppLockEnabled().then(setLockOn);
    biometricAvailable().then(setBioAvail);
  }, []);
  async function toggleLock() {
    if (lockOn) {
      // wyłączenie wymaga potwierdzenia tożsamości
      const ok = await authenticate(t("m.lock.prompt"));
      if (!ok) return;
      await setAppLockEnabled(false);
      setLockOn(false);
      return;
    }
    const ok = await authenticate(t("m.lock.prompt"));
    if (!ok) return;
    await setAppLockEnabled(true);
    setLockOn(true);
  }

  async function selectMode(mode: PositionShareMode) {
    setPosMsg(null);
    if (mode === posMode) return;
    // "always" tylko w buildzie v2 (flaga) — w v1 chip jest nieaktywny, ale strzeżemy i tu
    if (mode === "always" && !bgLocationEnabled) return;

    if (mode === "off") {
      await setSharePositionMode("off");
      setPosMode("off");
      if (supabaseConfigured) await deleteMyPosition(getSupabase()).catch(() => {});
      setPosMsg(t("m.settings.sharePosRemoved"));
      return;
    }

    // każdy tryb udostępniania wymaga zgody na lokalizację przy użyciu aplikacji
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      setPosMsg(t("m.settings.sharePosDenied"));
      return;
    }
    if (mode === "always") {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (!bg.granted) {
        setPosMsg(t("m.settings.sharePosDenied"));
        return;
      }
    }
    await setSharePositionMode(mode);
    setPosMode(mode);
    reportPositionOnce().catch(() => {});
    setPosMsg(t("m.settings.sharePosEnabled"));
  }

  async function enablePush() {
    setPushMsg(null);
    const uid = session?.user?.id;
    if (!uid) {
      setPushMsg(t("m.settings.pushLoginFirst"));
      return;
    }
    try {
      await registerForPush(uid);
      setPushMsg(t("m.settings.pushEnabled"));
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : t("m.settings.pushFail"));
    }
  }

  /**
   * [#372] Usunięcie konta — wymóg App Store 5.1.1(v) i Google Play.
   *
   * Przebieg: podgląd skutków z bazy → potwierdzenie → (dla właściciela firmy
   * z pracownikami) drugie, osobne potwierdzenie → kasowanie → czyszczenie
   * danych lokalnych → wylogowanie.
   */
  async function confirmDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    try {
      const preview = await getAccountDeletionPreview(getSupabase());
      const lines = [
        t("m.settings.deleteAccountHint"),
        "",
        t("m.settings.deleteAccountSummary", {
          fuel: String(preview.fuelLogs),
          adblue: String(preview.adblueLogs),
          trip: String(preview.tripEvents),
          messages: String(preview.messages),
        }),
      ];
      for (const c of preview.soloCompanies) {
        lines.push("", t("m.settings.deleteAccountSolo", { company: c.name }));
      }

      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(t("m.settings.deleteAccountConfirmTitle"), lines.join("\n"), [
          {
            text: t("m.settings.deleteAccountCancel"),
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: t("m.settings.deleteAccountAction"),
            style: "destructive",
            onPress: () => resolve(true),
          },
        ]);
      });
      if (!proceed) return;

      // Właściciel firmy z pracownikami: usunięcie skasuje CUDZE dane,
      // więc zgoda musi być osobna i jednoznaczna — nie chowamy jej w pierwszym oknie.
      let deleteCompany = false;
      const blocking = preview.blockingCompanies[0];
      if (blocking) {
        const owned = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t("m.settings.deleteAccountOwnerTitle"),
            t("m.settings.deleteAccountOwnerBody", {
              company: blocking.name,
              members: String(blocking.activeMembers),
            }),
            [
              {
                text: t("m.settings.deleteAccountCancel"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("m.settings.deleteAccountOwnerConfirm"),
                style: "destructive",
                onPress: () => resolve(true),
              },
            ],
          );
        });
        if (!owned) return;
        deleteCompany = true;
      }

      await deleteMyAccount(getSupabase(), { deleteCompany });
      await AsyncStorage.multiRemove(LOCAL_KEYS_TO_WIPE).catch(() => {});
      await signOut();
    } catch (e) {
      // Właściciel z pracownikami bez zgody na kasowanie firmy — baza broni się sama,
      // nawet gdyby podgląd zdążył się zdezaktualizować między oknami.
      const msg =
        e instanceof OwnerHasMembersError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("m.settings.deleteAccountFail");
      Alert.alert(t("m.settings.deleteAccountFail"), msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, wide]}>
      <SectionTitle>{t("m.settings.account")}</SectionTitle>
      <Card style={{ gap: 8 }}>
        <View style={s.kv}>
          <Text style={s.k}>{t("m.settings.email")}</Text>
          <Text style={s.v} numberOfLines={1}>
            {session?.user?.email ?? "—"}
          </Text>
        </View>
        <Text style={s.hint}>{t("m.settings.accountHint")}</Text>
      </Card>

      <SectionTitle>{t("m.settings.notifications")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.hint}>{t("m.settings.notificationsHint")}</Text>
        <PrimaryButton label={t("m.settings.pushButton")} onPress={enablePush} />
        {pushMsg && <Text style={s.msg}>{pushMsg}</Text>}
      </Card>

      <SectionTitle>{t("m.settings.security")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.hint}>{t("m.settings.appLockHint")}</Text>
        {bioAvail === false ? (
          <Text style={s.msg}>{t("m.settings.appLockUnavailable")}</Text>
        ) : (
          <Pressable
            style={[s.lang, lockOn && s.langOn, { alignSelf: "flex-start" }]}
            onPress={toggleLock}
            accessibilityRole="switch"
            accessibilityState={{ checked: lockOn }}
          >
            <Text style={[s.langText, lockOn && s.langTextOn]}>
              {lockOn ? `🔒 ${t("m.settings.appLockOn")}` : `🔓 ${t("m.settings.appLockOff")}`}
            </Text>
          </Pressable>
        )}
      </Card>

      <SectionTitle>{t("m.settings.position")}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.hint}>{t("m.settings.sharePosHint")}</Text>
        <Text style={s.k}>{t("m.settings.posMode")}</Text>
        <View style={s.langRow}>
          {POS_MODES.map((mode) => {
            const on = posMode === mode;
            const disabled = mode === "always" && !bgLocationEnabled;
            return (
              <Pressable
                key={mode}
                style={[s.lang, on && s.langOn, disabled && s.langDisabled]}
                onPress={() => selectMode(mode)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled }}
              >
                <Text style={[s.langText, on && s.langTextOn, disabled && s.langTextDisabled]}>
                  {t(POS_MODE_LABEL[mode])}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!bgLocationEnabled && <Text style={s.hint}>{t("m.settings.posAlwaysV2Note")}</Text>}
        {posMsg && <Text style={s.msg}>{posMsg}</Text>}
      </Card>

      <SectionTitle>{t("m.settings.language")}</SectionTitle>
      <Card>
        <View style={s.langRow}>
          {(["auto", ...MOBILE_LOCALES] as LocalePref[]).map((p) => {
            const on = pref === p;
            return (
              <Pressable
                key={p}
                style={[s.lang, on && s.langOn]}
                onPress={() => setPref(p)}
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.langText, on && s.langTextOn]}>
                  {p === "auto" ? t("m.settings.languageAuto") : LOCALE_LABEL[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {powersyncConfigured() && (
        <>
          <SectionTitle>{t("m.settings.syncOffline")}</SectionTitle>
          <Card style={{ gap: 8 }}>
            <View style={s.kv}>
              <Text style={s.k}>PowerSync</Text>
              <Text style={[s.v, { color: ps?.connected ? palette.success : palette.warning }]}>
                {ps
                  ? ps.connected
                    ? t("m.settings.syncConnected")
                    : t("m.settings.syncConnecting")
                  : "—"}
              </Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t("m.settings.lastSync")}</Text>
              <Text style={s.v}>
                {ps?.lastSyncedAt ? ps.lastSyncedAt.slice(0, 16).replace("T", " ") : "—"}
              </Text>
            </View>
            <View style={s.kv}>
              <Text style={s.k}>{t("m.settings.rowsLocal")}</Text>
              <Text style={s.v}>{ps?.rows ?? "—"}</Text>
            </View>
          </Card>
        </>
      )}

      <SectionTitle>{t("m.settings.app")}</SectionTitle>
      <Card style={{ gap: 8 }}>
        <View style={s.kv}>
          <Text style={s.k}>{t("m.settings.version")}</Text>
          <Text style={s.v}>{version}</Text>
        </View>
        <View style={s.kv}>
          <Text style={s.k}>{t("m.settings.support")}</Text>
          <Pressable
            onPress={() =>
              Linking.openURL("https://e-logistic-one.vercel.app/support").catch(() => {})
            }
            accessibilityRole="link"
          >
            <Text style={[s.v, { color: palette.red }]}>e-logistic-one.vercel.app/support</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ marginTop: 18 }}>
        <GhostButton label={t("m.settings.logout")} onPress={() => signOut()} />
      </View>

      {/* [#372] Wymóg App Store 5.1.1(v): konto musi dać się usunąć w aplikacji. */}
      <SectionTitle>{t("m.settings.dangerZone")}</SectionTitle>
      <Card style={{ gap: 10, borderColor: palette.red }}>
        <Text style={s.hint}>{t("m.settings.deleteAccountHint")}</Text>
        <Pressable
          onPress={confirmDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          style={[s.danger, deleting && s.dangerBusy]}
        >
          <Text style={s.dangerText}>
            {deleting ? t("m.settings.deleteAccountBusy") : t("m.settings.deleteAccount")}
          </Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  k: { color: palette.smoke, fontSize: 14 },
  v: { color: palette.offWhite, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  hint: { color: palette.smoke, fontSize: 13, lineHeight: 19 },
  msg: { color: palette.smoke, fontSize: 13 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lang: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langOn: { backgroundColor: palette.red, borderColor: palette.red },
  langDisabled: { opacity: 0.4 },
  langText: { color: palette.smoke, fontSize: 14, fontWeight: "600" },
  langTextOn: { color: palette.white, fontWeight: "800" },
  langTextDisabled: { color: palette.smoke },
  // Akcja nieodwracalna — obrys zamiast wypełnienia, żeby nie zapraszała do kliknięcia.
  danger: {
    borderColor: palette.red,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBusy: { opacity: 0.5 },
  dangerText: { color: palette.red, fontSize: 15, fontWeight: "800" },
});
