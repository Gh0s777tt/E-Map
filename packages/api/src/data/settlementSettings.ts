/** Warstwa danych: parametry rozliczenia kierowcy per firma (#265). */
import { DEFAULT_SETTLEMENT_SETTINGS, type SettlementSettings } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

/** Ustawienia firmy — gdy brak wiersza, zwraca domyślne (seed z formularza wzorcowego). */
export async function getSettlementSettings(
  client: SupabaseClient,
  companyId: string,
): Promise<SettlementSettings> {
  const { data, error } = await client
    .from("company_settlement_settings")
    .select(
      "daily_rate, km_norm_per_day, km_rate, insurance_per_day, phone_monthly, doc_bonus_monthly",
    )
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_SETTLEMENT_SETTINGS };
  return {
    dailyRate: data.daily_rate,
    kmNormPerDay: data.km_norm_per_day,
    kmRate: data.km_rate,
    insurancePerDay: data.insurance_per_day,
    phoneMonthly: data.phone_monthly,
    docBonusMonthly: data.doc_bonus_monthly,
  };
}

/** Zapis ustawień (upsert). RLS: wyłącznie owner. */
export async function saveSettlementSettings(
  client: SupabaseClient,
  companyId: string,
  s: SettlementSettings,
): Promise<void> {
  const { error } = await client.from("company_settlement_settings").upsert({
    company_id: companyId,
    daily_rate: s.dailyRate,
    km_norm_per_day: s.kmNormPerDay,
    km_rate: s.kmRate,
    insurance_per_day: s.insurancePerDay,
    phone_monthly: s.phoneMonthly,
    doc_bonus_monthly: s.docBonusMonthly,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
