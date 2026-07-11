/**
 * Warstwa danych: rejestr wydatków kierowcy (#288) — opłaty drogowe, parkingi,
 * naprawy itd. ze zdjęciem paragonu. Kierowca dodaje; zarząd zatwierdza.
 */
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
export async function insertDriverExpense(
  client: SupabaseClient,
  input: DriverExpenseInput,
): Promise<string> {
  const { data, error } = await client
    .from("driver_expenses")
    .insert({
      company_id: input.companyId,
      vehicle_id: input.vehicleId ?? null,
      category: input.category,
      amount: input.amount,
      currency: input.currency ?? "PLN",
      expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
      note: input.note ?? null,
      photo_path: input.photoPath ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
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
  const path = `${companyId}/expense-${crypto.randomUUID()}.${ext}`;
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
