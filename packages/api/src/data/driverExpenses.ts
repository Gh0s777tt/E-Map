/**
 * Warstwa danych: rejestr wydatków kierowcy (#288) — opłaty drogowe, parkingi,
 * naprawy itd. ze zdjęciem paragonu. Kierowca dodaje; zarząd zatwierdza.
 */
import { newId } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export const EXPENSE_CATEGORIES = ["toll", "parking", "repair", "wash", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseStatus = "submitted" | "approved" | "rejected";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  toll: "Opłaty drogowe",
  parking: "Parking",
  repair: "Naprawa",
  wash: "Myjnia",
  other: "Inne",
};

export interface DriverExpense {
  id: string;
  company_id: string;
  user_id: string;
  vehicle_id: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expense_date: string;
  note: string | null;
  photo_path: string | null;
  status: ExpenseStatus;
  created_at: string;
}

export interface DriverExpenseInput {
  companyId: string;
  vehicleId?: string | null;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  expenseDate?: string;
  note?: string | null;
  photoPath?: string | null;
}

const COLS =
  "id, company_id, user_id, vehicle_id, category, amount, currency, expense_date, note, photo_path, status, created_at";

/** Wydatki (RLS: kierowca swoje, zarząd całą firmę). Filtr statusu opcjonalny. */
export async function listDriverExpenses(
  client: SupabaseClient,
  opts: { status?: ExpenseStatus; limit?: number } = {},
): Promise<DriverExpense[]> {
  let q = client.from("driver_expenses").select(COLS).order("created_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  q = q.limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DriverExpense[];
}

/** Dodaje wydatek we własnym imieniu (RLS wymusza user_id = auth.uid()). */
/**
 * [#391] `id` z kolejki offline — bez niego ponowna wysyłka tworzy DUPLIKAT.
 *
 * Ścieżka, która to wywołuje, jest w tej branży zwyczajna: kierowca dodaje
 * wydatek na słabym zasięgu, żądanie DOCHODZI do bazy i wiersz powstaje, ale
 * odpowiedź ginie po drodze. Klient widzi błąd sieci, wpis zostaje w kolejce ze
 * statusem `error`, a przy następnym połączeniu leci **drugi zwykły INSERT** —
 * i w rozliczeniu są dwie myjnie po 180 zł zamiast jednej.
 *
 * Paliwo, AdBlue, Trip i czat miały to rozwiązane od dawna: `id` pochodzi
 * z kolejki, a zapis idzie przez `upsert(onConflict:"id", ignoreDuplicates)`,
 * więc powtórzenie nie robi nic. Wydatki i checklisty zostały przy czystym
 * `insert` z kluczem generowanym przez bazę — czyli przy każdej próbie powstawał
 * nowy wiersz.
 *
 * `id` jest opcjonalne: zapis wprost z formularza (online) nadal może zdać się
 * na `gen_random_uuid()`.
 */
export async function insertDriverExpense(
  client: SupabaseClient,
  input: DriverExpenseInput,
  /** Identyfikator z kolejki offline — czyni ponowną wysyłkę bezpieczną. */
  id?: string,
): Promise<string> {
  const { data, error } = await client
    .from("driver_expenses")
    .upsert(
      {
        ...(id ? { id } : {}),
        company_id: input.companyId,
        vehicle_id: input.vehicleId ?? null,
        category: input.category,
        amount: input.amount,
        currency: input.currency ?? "PLN",
        expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
        note: input.note ?? null,
        photo_path: input.photoPath ?? null,
      },
      // Powtórka tego samego `id` ma być brakiem zmian, nie nadpisaniem:
      // wpis mógł już zostać poprawiony w panelu i cofnięcie tego byłoby gorsze
      // niż duplikat, przed którym się bronimy.
      { onConflict: "id", ignoreDuplicates: true },
    )
    /*
     * [#391] `maybeSingle`, nie `single` — przy powtórnej wysyłce z kolejki
     * `ignoreDuplicates` sprawia, że baza NIE zwraca wiersza (bo nic nie wstawiła).
     * `single()` uznałby to za błąd i wpis wróciłby do kolejki ze statusem `error`,
     * czyli poprawka przed duplikatem stworzyłaby pętlę nieudanych wysyłek.
     *
     * Brak zwróconego `id` znaczy „ten wpis już tam jest" i jest poprawnym
     * zakończeniem synchronizacji. Oddajemy wtedy `id` z kolejki, bo to ten sam
     * wiersz — wołający dostaje identyfikator, którym może się posłużyć.
     */
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? id ?? "";
}

/** Zatwierdzenie/odrzucenie (RLS: owner/dispatcher). */
export async function setDriverExpenseStatus(
  client: SupabaseClient,
  id: string,
  status: ExpenseStatus,
): Promise<void> {
  const { error } = await client.from("driver_expenses").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Usunięcie własnego, nierozpatrzonego wpisu. */
export async function deleteDriverExpense(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("driver_expenses").delete().eq("id", id);
  if (error) throw error;
}

const BUCKET = "cargo-photos";

/** Upload zdjęcia paragonu — zwraca ścieżkę do zapisania w `photo_path`. */
export async function uploadExpensePhotoBinary(
  client: SupabaseClient,
  companyId: string,
  bytes: ArrayBuffer,
  opts: { mime?: string } = {},
): Promise<string> {
  const ext = (opts.mime ?? "image/jpeg").split("/")[1] ?? "jpg";
  const path = `${companyId}/expense-${newId()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: opts.mime ?? "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/** Podpisany URL zdjęcia paragonu (podgląd w panelu). */
export async function expensePhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
