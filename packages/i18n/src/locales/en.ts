import type { MessageKey } from "./pl";

/** EN — typ `Record<MessageKey, string>` wymusza parytet kluczy z PL (compile-time). */
export const en: Record<MessageKey, string> = {
  "app.name": "E-Logistic",
  "app.tagline": "Platform for transport",

  "role.developer": "Developer",
  "role.owner": "Owner",
  "role.dispatcher": "Dispatcher",
  "role.driver": "Driver",

  "nav.dashboard": "Dashboard",
  "nav.vehicles": "Vehicles",
  "nav.drivers": "Drivers",
  "nav.cards": "Fuel cards",
  "nav.map": "Map",
  "nav.stats": "Statistics",
  "nav.settings": "Settings",

  "auth.signIn": "Sign in",
  "auth.signOut": "Sign out",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.magicLink": "Send magic link",
  "auth.continueGoogle": "Continue with Google",
  "auth.continueApple": "Continue with Apple",

  "form.fuel.title": "Fuel form",
  "form.adblue.title": "AdBlue form",
  "form.trip.title": "Trip form",
  "form.field.vehicle": "Vehicle",
  "form.field.odometer": "Odometer (km)",
  "form.field.liters": "Liters",
  "form.field.country": "Country",
  "form.field.location": "Location",
  "form.field.weight": "Weight (kg)",
  "form.field.amount": "Amount",
  "form.field.comment": "Comment",
  "form.field.paymentMethod": "Payment method",
  "form.payment.card": "Card",
  "form.payment.cash": "Cash",

  "trip.action.load": "Loading",
  "trip.action.unload": "Unloading",
  "trip.action.start": "Start",
  "trip.action.end": "End",
  "trip.action.service": "Service",
  "trip.action.other": "Other",

  "sync.draft": "Draft",
  "sync.queued": "Queued",
  "sync.synced": "Synced",
  "sync.error": "Sync error",
  "sync.offline": "Offline mode",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.history": "History",
};
