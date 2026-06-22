"use client";

import { getOrderPhotoUrl, listOrderPhotos, type OrderPhoto } from "@e-logistic/api";
import { isPodCaption, parsePodCaption } from "@e-logistic/core";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface PodSignature {
  /** Podpisany URL do obrazu podpisu (PNG z web / SVG z mobile). */
  url: string;
  recipient: string | null;
  when: string | null;
}

/**
 * Wczytuje najnowszy podpis odbiorcy (POD) zlecenia z załączników i zwraca
 * podpisany URL + dane z `caption`. `undefined`, gdy podpisu brak / brak dostępu.
 * Wspólne dla dokumentu CMR i samodzielnego dowodu dostawy.
 */
export function usePodSignature(orderId: string): PodSignature | undefined {
  const [pod, setPod] = useState<PodSignature>();
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const photos = await listOrderPhotos(sb, orderId);
        const sig = photos.find((p: OrderPhoto) => isPodCaption(p.caption));
        if (!sig) return;
        const url = await getOrderPhotoUrl(sb, sig.path, 1800).catch(() => "");
        if (!url || !alive) return;
        const info = parsePodCaption(sig.caption);
        setPod({ url, recipient: info.recipient, when: info.when });
      } catch {
        // brak podpisu / brak dostępu — komponent pokaże pustą linię
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);
  return pod;
}
