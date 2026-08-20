/**
 * [#374] Zestaw emoji do czatu.
 *
 * Świadomie NIE jest to pełna tablica Unicode (~3800 znaków). Pełny picker
 * wymagałby osobnego pakietu danych z nazwami i słowami kluczowymi w każdym
 * z czterech języków aplikacji — kilkaset kilobajtów doładowywanych do buildu
 * mobilnego po to, żeby kierowca mógł wysłać emoji flagi Wysp Owczych.
 *
 * Zamiast tego: ~140 znaków w sześciu kategoriach, dobranych pod realną rozmowę
 * w firmie transportowej — reakcje, pogoda, drogi, ładunek, czas, jedzenie.
 * Wyszukiwarki nie ma z tego samego powodu: wymagałaby tłumaczonych nazw.
 */

export interface EmojiCategory {
  /** Znak reprezentujący kategorię w pasku zakładek. */
  icon: string;
  /** Klucz i18n nazwy kategorii. */
  labelKey: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    icon: "🙂",
    labelKey: "emoji.cat.faces",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😅",
      "😂",
      "🙂",
      "😉",
      "😊",
      "😍",
      "😘",
      "😎",
      "🤔",
      "🤨",
      "😐",
      "😴",
      "😮",
      "😢",
      "😭",
      "😤",
      "😡",
      "🥵",
      "🥶",
      "🤒",
      "🤕",
      "🤢",
      "🥱",
      "😬",
      "🙄",
      "😳",
    ],
  },
  {
    icon: "👍",
    labelKey: "emoji.cat.gestures",
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤝",
      "👏",
      "🙏",
      "💪",
      "🫡",
      "👋",
      "☝️",
      "👇",
      "👈",
      "👉",
      "✊",
      "🤙",
      "❤️",
      "🔥",
      "⭐",
      "✅",
      "❌",
      "⚠️",
      "❗",
      "❓",
      "💯",
      "🎉",
    ],
  },
  {
    icon: "🚚",
    labelKey: "emoji.cat.transport",
    emojis: [
      "🚚",
      "🚛",
      "🚐",
      "🚗",
      "🚕",
      "🛻",
      "🚜",
      "🚧",
      "⛽",
      "🛢️",
      "🅿️",
      "🛣️",
      "🌉",
      "🚦",
      "🚏",
      "⚓",
      "🛳️",
      "✈️",
      "🚂",
      "🛞",
      "🔧",
      "🔩",
      "🧰",
      "🔋",
      "🧯",
    ],
  },
  {
    icon: "📦",
    labelKey: "emoji.cat.cargo",
    emojis: [
      "📦",
      "🧊",
      "🪵",
      "🧱",
      "🛢️",
      "⚖️",
      "📋",
      "📄",
      "🧾",
      "📝",
      "✍️",
      "📸",
      "📍",
      "🗺️",
      "🧭",
      "🔒",
      "🔓",
      "☢️",
      "☣️",
      "🚫",
    ],
  },
  {
    icon: "🌦️",
    labelKey: "emoji.cat.weather",
    emojis: ["☀️", "🌤️", "⛅", "☁️", "🌧️", "⛈️", "🌩️", "❄️", "🌨️", "🌫️", "💨", "🌪️", "🌡️", "🧊", "🌙", "🌅"],
  },
  {
    icon: "⏰",
    labelKey: "emoji.cat.time",
    emojis: [
      "⏰",
      "⏱️",
      "⌛",
      "📅",
      "🗓️",
      "☕",
      "🍽️",
      "🛏️",
      "🚿",
      "🏠",
      "💤",
      "🔔",
      "📞",
      "💬",
      "📶",
      "🔌",
    ],
  },
];

/** Wszystkie znaki jednym ciągiem — do walidacji i testów. */
export const ALL_EMOJIS: string[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
