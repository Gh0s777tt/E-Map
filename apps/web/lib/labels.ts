import type { OrderStatus } from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";

type T = (key: MessageKey) => string;

/** Etykieta statusu zlecenia w aktualnym języku (klucze `order.status.*`). */
export function orderStatusLabel(t: T, status: OrderStatus): string {
  return t(`order.status.${status}`);
}

const TRIP_ACTIONS = new Set(["load", "unload", "start", "end", "service", "other"]);

/**
 * Etykieta akcji trasy (`trip.action.*`). Akcje przychodzą jako `string` (DB),
 * więc nieznane wartości zwracamy surowe — bez gubienia danych.
 */
export function tripActionLabel(t: T, action: string): string {
  return TRIP_ACTIONS.has(action) ? t(`trip.action.${action}` as MessageKey) : action;
}
