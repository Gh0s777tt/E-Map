"use client";

/**
 * #310: TanStack Query — wspólny cache zapytań panelu (stack docelowy z CLAUDE.md).
 * Konserwatywne domyślne: dane świeże 30 s, bez refetchu na fokusie okna
 * (panel operacyjny — odświeżanie jawne lub przez mutacje/invalidate).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
