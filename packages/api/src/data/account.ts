/**
 * [#372] Usuwanie konta i danych z poziomu aplikacji.
 *
 * App Store Guideline 5.1.1(v) i Google Play wymagają, aby aplikacja pozwalająca
 * założyć konto pozwalała je też usunąć WEWNĄTRZ aplikacji — sama instrukcja
 * „napisz e-mail" nie spełnia wymogu.
 *
 * Kasowanie wykonuje RPC `delete_my_account` (migracja 0090) w kontekście
 * zalogowanego użytkownika, więc nie potrzeba klienta administracyjnego.
 */
import type { TypedSupabaseClient as SupabaseClient } from "../client";

/** Firma, w której użytkownik jest właścicielem, a która ma innych aktywnych członków. */
export interface BlockingCompany {
  companyId: string;
  name: string;
  activeMembers: number;
}

/** Firma, w której użytkownik jest jedynym członkiem — zniknie razem z kontem. */
export interface SoloCompany {
  companyId: string;
  name: string;
}

export interface AccountDeletionPreview {
  /**
   * Niepuste = użytkownik jest właścicielem firmy z pracownikami. Usunięcie konta
   * skasuje też ICH dane, więc interfejs musi zebrać osobną, świadomą zgodę.
   */
  blockingCompanies: BlockingCompany[];
  soloCompanies: SoloCompany[];
  fuelLogs: number;
  adblueLogs: number;
  tripEvents: number;
  messages: number;
}

/**
 * Co się stanie po usunięciu konta — do ekranu potwierdzenia.
 * Nic nie zmienia; funkcja SQL jest oznaczona jako `stable`.
 */
export async function getAccountDeletionPreview(
  client: SupabaseClient,
): Promise<AccountDeletionPreview> {
  const { data, error } = await client.rpc("account_deletion_preview");
  if (error) throw error;
  const d = (data ?? {}) as Partial<AccountDeletionPreview>;
  return {
    blockingCompanies: d.blockingCompanies ?? [],
    soloCompanies: d.soloCompanies ?? [],
    fuelLogs: d.fuelLogs ?? 0,
    adblueLogs: d.adblueLogs ?? 0,
    tripEvents: d.tripEvents ?? 0,
    messages: d.messages ?? 0,
  };
}

/**
 * Stała wartownicza wymagana przez funkcję SQL.
 *
 * Świadomie NIE jest to tłumaczony tekst z interfejsu: aplikacja mobilna ma cztery
 * języki, a potwierdzenie po stronie bazy musi być jedno i niezmienne. Interfejs
 * prowadzi własne potwierdzenie w języku użytkownika i dopiero potem wysyła tę stałą.
 */
const CONFIRM = "DELETE";

/** Rzucane, gdy użytkownik jest właścicielem firmy z aktywnymi pracownikami. */
export class OwnerHasMembersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerHasMembersError";
  }
}

/**
 * Usuwa konto zalogowanego użytkownika.
 *
 * @param deleteCompany świadoma zgoda na skasowanie firm, których użytkownik jest
 *   właścicielem, wraz z danymi wszystkich ich pracowników. Bez tego RPC odmawia
 *   (błąd 23503) — patrz `OwnerHasMembersError`.
 */
export async function deleteMyAccount(
  client: SupabaseClient,
  opts?: { deleteCompany?: boolean },
): Promise<void> {
  const { error } = await client.rpc("delete_my_account", {
    p_confirm: CONFIRM,
    p_delete_company: opts?.deleteCompany ?? false,
  });
  if (!error) return;
  // 23503 to sygnał „jesteś właścicielem firmy z pracownikami" — nie błąd techniczny.
  if (error.code === "23503") throw new OwnerHasMembersError(error.message);
  throw error;
}
