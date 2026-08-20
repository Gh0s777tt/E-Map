"use client";

/**
 * #310: TanStack Query — wspólny cache zapytań panelu (stack docelowy z CLAUDE.md).
 * Konserwatywne domyślne: dane świeże 30 s, bez refetchu na fokusie okna
 * (panel operacyjny — odświeżanie jawne lub przez mutacje/invalidate).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { setActiveQueryClient } from "@/lib/queryClient";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  /*
   * Udostępniamy klienta kodowi spoza drzewa Reacta — konkretnie
   * `clearMembershipCache()`, które musi unieważnić `["membership"]` po utworzeniu firmy
   * lub przyjęciu zaproszenia. Bez tego wpis przeżywał zmianę członkostwa (ten provider
   * nie odmontowuje się przy nawigacji wewnątrz `(app)`) i panel przez `staleTime`
   * pokazywał świeżemu właścicielowi stan sprzed założenia firmy. Szczegóły:
   * `lib/queryClient.ts`.
   */
  useEffect(() => {
    setActiveQueryClient(client);
    return () => setActiveQueryClient(null);
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
