import { palette } from "@e-logistic/ui";

/** Pole formularza: etykieta + kontrolka (children) + komunikat błędu. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: kontrolka (input/select/textarea) jest przekazywana przez children
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={{ fontSize: 12, color: palette.smoke }}>{label}</span>
      {children}
      {error && <span style={{ color: palette.red, fontSize: 12 }}>{error}</span>}
    </label>
  );
}

export const fieldInputStyle: React.CSSProperties = {
  background: palette.black,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: palette.offWhite,
  width: "100%",
};
