import styles from "./map.module.css";

/** Wiersz „etykieta — wartość" w panelu wyniku trasy. */
export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowKey}>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

/** Mapa nazw klas panelu mapy (CSS Module) — używana przez `className` w page/mapPanels. */
export { styles };
