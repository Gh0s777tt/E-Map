/**
 * #351: Konfiguracja Expo jako funkcja (zamiast statycznego app.json), aby
 * warunkowo dołączać lokalizację w tle WYŁĄCZNIE w buildzie v2
 * (`EAS_BG_LOCATION="1"`, profil `production-bg`, TestFlight po zatwierdzeniu
 * przez Apple). Domyślny build (v1, idący do recenzji) NIE deklaruje żadnej
 * lokalizacji w tle — wymóg Apple 5.6/2.5.4 (brak `UIBackgroundModes`,
 * `NSLocationAlwaysAndWhenInUseUsageDescription`, `ACCESS_BACKGROUND_LOCATION`).
 *
 * Poza tą jedną warunkową sekcją konfiguracja jest 1:1 z poprzednim app.json
 * (wersja 1.91.0, wszystkie infoPlist/pluginy/permissions bez zmian).
 */

// v2 (tło) tylko gdy jawnie ustawione w profilu EAS `production-bg`.
const bg = process.env.EAS_BG_LOCATION === "1";

const LOCATION_WHEN_IN_USE =
  "E-Logistic pokazuje Twoją pozycję na mapie TIR (parkingi i stacje w okolicy).";
const LOCATION_ALWAYS =
  "E-Logistic udostępnia Twoją pozycję firmie także w tle, aby dyspozytor widział lokalizację auta podczas trasy.";

/** infoPlist iOS — bazowe klucze; w v2 dokładamy tło. */
const iosInfoPlist = {
  NSLocationWhenInUseUsageDescription: LOCATION_WHEN_IN_USE,
  NSCameraUsageDescription:
    "E-Logistic używa aparatu do zdjęć towaru (dowód zabezpieczenia ładunku) i checklist.",
  NSFaceIDUsageDescription: "E-Logistic używa Face ID do odblokowania aplikacji.",
  NSPhotoLibraryUsageDescription:
    "E-Logistic potrzebuje dostępu do zdjęć, by dołączyć zdjęcie towaru do zlecenia.",
  NSPhotoLibraryAddUsageDescription: "E-Logistic zapisuje zdjęcia dokumentów przewozowych.",
  ITSAppUsesNonExemptEncryption: false,
  ...(bg
    ? {
        UIBackgroundModes: ["location"],
        NSLocationAlwaysAndWhenInUseUsageDescription: LOCATION_ALWAYS,
      }
    : {}),
};

/** Uprawnienia Android — w v2 dokładamy lokalizację w tle. */
const androidPermissions = [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.USE_BIOMETRIC",
  ...(bg ? ["android.permission.ACCESS_BACKGROUND_LOCATION"] : []),
];

/** Plugin expo-location — w v2 włączamy zgody i flagę tła (Android). */
const expoLocationPlugin = [
  "expo-location",
  {
    locationWhenInUsePermission: LOCATION_WHEN_IN_USE,
    ...(bg
      ? {
          locationAlwaysAndWhenInUsePermission: LOCATION_ALWAYS,
          isAndroidBackgroundLocationEnabled: true,
        }
      : {}),
  },
];

module.exports = {
  expo: {
    name: "E-Logistic",
    slug: "e-logistic",
    scheme: "elogistic",
    version: "1.91.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    backgroundColor: "#0a0a0a",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0a",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ghostempire.elogistic",
      infoPlist: iosInfoPlist,
      usesAppleSignIn: true,
    },
    android: {
      package: "com.ghostempire.elogistic",
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0a0a0a",
      },
      permissions: androidPermissions,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-status-bar",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          cameraPermission:
            "E-Logistic używa aparatu do zdjęć towaru (dowód zabezpieczenia ładunku).",
          photosPermission:
            "E-Logistic potrzebuje dostępu do zdjęć, by dołączyć zdjęcie towaru do zlecenia.",
        },
      ],
      "expo-secure-store",
      "@maplibre/maplibre-react-native",
      expoLocationPlugin,
      [
        "expo-local-authentication",
        {
          faceIDPermission: "E-Logistic używa Face ID do odblokowania aplikacji.",
        },
      ],
      "expo-web-browser",
      "expo-apple-authentication",
      "expo-localization",
      "expo-live-activity",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "ffddfdc9-504e-4d15-83bd-dc95b3e4c278",
      },
    },
    owner: "gh0stt77",
  },
};
