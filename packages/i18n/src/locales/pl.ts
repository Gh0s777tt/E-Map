/** Katalog komunikatów PL — źródło prawdy dla zestawu kluczy (MessageKey). */
export const pl = {
  "app.name": "E-Logistic",
  "app.tagline": "Platforma dla transportu",

  "role.developer": "Developer",
  "role.owner": "Właściciel",
  "role.dispatcher": "Spedytor",
  "role.driver": "Kierowca",

  "nav.dashboard": "Pulpit",
  "nav.vehicles": "Pojazdy",
  "nav.drivers": "Kierowcy",
  "nav.cards": "Karty paliwowe",
  "nav.map": "Mapa",
  "nav.stats": "Statystyki",
  "nav.settings": "Ustawienia",

  "auth.signIn": "Zaloguj się",
  "auth.signOut": "Wyloguj",
  "auth.email": "E-mail",
  "auth.password": "Hasło",
  "auth.magicLink": "Wyślij link logujący",
  "auth.continueGoogle": "Kontynuuj z Google",
  "auth.continueApple": "Kontynuuj z Apple",

  "form.fuel.title": "Formularz paliwowy",
  "form.adblue.title": "Formularz AdBlue",
  "form.trip.title": "Formularz Trip",
  "form.field.vehicle": "Pojazd",
  "form.field.odometer": "Stan licznika (km)",
  "form.field.liters": "Litry",
  "form.field.country": "Kraj",
  "form.field.location": "Lokalizacja",
  "form.field.weight": "Waga (kg)",
  "form.field.amount": "Kwota",
  "form.field.comment": "Komentarz",
  "form.field.paymentMethod": "Metoda płatności",
  "form.payment.card": "Karta",
  "form.payment.cash": "Gotówka",

  "trip.action.load": "Załadunek",
  "trip.action.unload": "Rozładunek",
  "trip.action.start": "Rozpoczęcie",
  "trip.action.end": "Zakończenie",
  "trip.action.service": "Serwis",
  "trip.action.other": "Inne",

  "sync.draft": "Szkic",
  "sync.queued": "W kolejce",
  "sync.synced": "Zsynchronizowano",
  "sync.error": "Błąd synchronizacji",
  "sync.offline": "Tryb offline",

  "common.save": "Zapisz",
  "common.cancel": "Anuluj",
  "common.edit": "Edytuj",
  "common.delete": "Usuń",
  "common.history": "Historia",
} as const;

export type MessageKey = keyof typeof pl;
