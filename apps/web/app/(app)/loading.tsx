import { Skeleton } from "@/components/ui";

/**
 * Streaming loading UI (App Router) — natychmiastowy szkielet podczas nawigacji do stron
 * panelu, zanim serwerowy layout (auth) i komponent strony się zamontują. Suspense boundary
 * wstrzykiwany automatycznie przez Next dla całej grupy `(app)`. Motyw przez `.el-skeleton`.
 */
export default function AppLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true">
      <Skeleton width={220} height={30} radius={8} />
      <Skeleton width={360} height={16} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={230} height={92} radius={12} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={44} radius={10} />
        ))}
      </div>
    </div>
  );
}
