"use client";

/**
 * [#374] Dymek wiadomości z akcjami: edycja, usunięcie, kopiowanie, cytowanie,
 * przekazanie, reakcje.
 *
 * Wydzielony z `chat/page.tsx`, który miał już 594 linie — dołożenie tam menu
 * kontekstowego, trybu edycji i paska reakcji zrobiłoby z niego plik nie do
 * utrzymania. Reguły uprawnień pochodzą z `@e-logistic/core`, żeby web i mobile
 * nie rozjechały się w tym, kto co może; rozjazd byłby cichy — interfejs
 * pokazałby akcję, a baza odrzuciłaby ją dopiero po kliknięciu.
 */
import type { ChatMessage, MessageReaction } from "@e-logistic/api";
import {
  type ChatViewer,
  canDeleteMessage,
  canEditMessage,
  EMOJI_CATEGORIES,
  isDeleted,
  QUICK_REACTIONS,
  quotePreview,
  type ReactionSummary,
  summarizeReactions,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

export interface MessageBubbleProps {
  message: ChatMessage;
  /** Cytowana wiadomość, jeśli `reply_to_id` wskazuje na coś, co mamy w widoku. */
  repliedTo: ChatMessage | null;
  reactions: readonly MessageReaction[];
  viewer: ChatViewer;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReply: (m: ChatMessage) => void;
  onForward: (m: ChatMessage) => void;
  onReact: (id: string, emoji: string, on: boolean) => void;
  onCopy: (text: string) => void;
  children: React.ReactNode;
}

export function MessageBubble({
  message: m,
  repliedTo,
  reactions,
  viewer,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onReact,
  onCopy,
  children,
}: MessageBubbleProps) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Pełny picker rozwijany z paska szybkich reakcji — domyślnie schowany. */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catIdx, setCatIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const mine = m.sender_id === viewer.userId;

  // Uprawnienia liczymy przy renderze, bo okno edycji wygasa z czasem —
  // zamrożenie ich w stanie zostawiłoby aktywny przycisk po terminie.
  const now = Date.now();
  const mayEdit = canEditMessage(m, viewer, now);
  const mayDelete = canDeleteMessage(m, viewer);

  const summary: ReactionSummary[] = summarizeReactions(reactions, m.id, viewer.userId);

  // Usunięta wiadomość zostaje w wątku jako ślad — inaczej rozmowa nagle traci
  // sens („odpowiedź na nic"), a odbiorca nie wie, że coś tu było.
  if (isDeleted(m)) {
    return (
      <div style={{ ...styles.row, justifyContent: mine ? "flex-end" : "flex-start" }}>
        <div style={{ ...styles.bubble, ...styles.bubbleGone }}>{t("chat.msg.deleted")}</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.row, justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div style={styles.stack}>
        <div style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleOther) }}>
          {!mine && <div style={styles.sender}>{m.sender_label || "—"}</div>}

          {repliedTo && (
            <div style={styles.quote}>
              <div style={styles.quoteAuthor}>{repliedTo.sender_label || "—"}</div>
              {quotePreview(repliedTo, {
                photo: t("chat.msg.photo"),
                location: t("chat.msg.location"),
              })}
            </div>
          )}

          {editing ? (
            <div style={{ display: "grid", gap: 6 }}>
              <textarea
                style={styles.editArea}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                // biome-ignore lint/a11y/noAutofocus: użytkownik wszedł w edycję świadomym kliknięciem, kursor ma trafić w pole od razu
                autoFocus
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={styles.editSave}
                  onClick={() => {
                    const next = draft.trim();
                    if (next && next !== m.body) onEdit(m.id, next);
                    setEditing(false);
                  }}
                >
                  {t("chat.msg.editSave")}
                </button>
                <button
                  type="button"
                  style={styles.editCancel}
                  onClick={() => {
                    setDraft(m.body);
                    setEditing(false);
                  }}
                >
                  {t("chat.msg.editCancel")}
                </button>
              </div>
            </div>
          ) : (
            children
          )}

          <div style={{ ...styles.time, color: mine ? "#ffffffaa" : palette.smoke }}>
            {m.created_at.slice(11, 16)}
            {m.edited_at && ` · ${t("chat.msg.edited")}`}
            {m.expires_at && " · ⏱"}
          </div>

          <button
            type="button"
            style={styles.menuBtn}
            aria-label={t("chat.msg.react")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>

          {menuOpen && (
            <>
              {/* Kliknięcie obok zamyka menu. Prawdziwy <button> zamiast nasłuchu
                  na <div> — działa też z klawiatury i czytnikiem ekranu. */}
              <button
                type="button"
                style={styles.backdrop}
                aria-label={t("chat.msg.editCancel")}
                onClick={() => setMenuOpen(false)}
              />
              <div style={styles.menu}>
                <div style={styles.quickRow}>
                  {QUICK_REACTIONS.map((e) => {
                    const on = summary.some((r) => r.emoji === e && r.mine);
                    return (
                      <button
                        key={e}
                        type="button"
                        style={{ ...styles.quick, ...(on ? styles.quickOn : null) }}
                        onClick={() => {
                          onReact(m.id, e, !on);
                          setMenuOpen(false);
                        }}
                      >
                        {e}
                      </button>
                    );
                  })}
                  {/* Pełny zestaw dopiero na żądanie — sześć szybkich reakcji
                      pokrywa większość przypadków, a siatka 140 znaków otwarta
                      domyślnie przykryłaby całą rozmowę. */}
                  <button
                    type="button"
                    style={styles.quick}
                    aria-label={t("chat.msg.react")}
                    aria-expanded={pickerOpen}
                    onClick={() => setPickerOpen((v) => !v)}
                  >
                    ➕
                  </button>
                </div>

                {pickerOpen && (
                  <div style={styles.picker}>
                    <div style={styles.pickerTabs}>
                      {EMOJI_CATEGORIES.map((c, i) => (
                        <button
                          key={c.labelKey}
                          type="button"
                          style={{ ...styles.pickerTab, ...(i === catIdx ? styles.quickOn : null) }}
                          aria-label={t(c.labelKey as Parameters<typeof t>[0])}
                          onClick={() => setCatIdx(i)}
                        >
                          {c.icon}
                        </button>
                      ))}
                    </div>
                    <div style={styles.pickerGrid}>
                      {EMOJI_CATEGORIES[catIdx]?.emojis.map((e) => {
                        const on = summary.some((r) => r.emoji === e && r.mine);
                        return (
                          <button
                            key={e}
                            type="button"
                            style={styles.quick}
                            onClick={() => {
                              onReact(m.id, e, !on);
                              setPickerOpen(false);
                              setMenuOpen(false);
                            }}
                          >
                            {e}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <MenuItem
                  label={t("chat.msg.reply")}
                  onClick={() => {
                    onReply(m);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  label={t("chat.msg.copy")}
                  onClick={() => {
                    onCopy(m.body);
                    setMenuOpen(false);
                  }}
                />
                <MenuItem
                  label={t("chat.msg.forward")}
                  onClick={() => {
                    onForward(m);
                    setMenuOpen(false);
                  }}
                />
                {mayEdit && (
                  <MenuItem
                    label={t("chat.msg.edit")}
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  />
                )}
                {mayDelete && (
                  <MenuItem
                    label={t("chat.msg.delete")}
                    danger
                    onClick={() => {
                      onDelete(m.id);
                      setMenuOpen(false);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {summary.length > 0 && (
          <div style={{ ...styles.reactions, justifyContent: mine ? "flex-end" : "flex-start" }}>
            {summary.map((r) => (
              <button
                key={r.emoji}
                type="button"
                style={{ ...styles.chip, ...(r.mine ? styles.chipMine : null) }}
                onClick={() => onReact(m.id, r.emoji, !r.mine)}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      style={{ ...styles.menuItem, ...(danger ? { color: palette.red } : null) }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", width: "100%" },
  stack: { display: "grid", gap: 4, maxWidth: "78%" },
  bubble: {
    position: "relative",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },
  bubbleMine: { background: palette.red, color: "#fff" },
  bubbleOther: { background: palette.graphite, color: palette.offWhite },
  bubbleGone: {
    background: "transparent",
    border: `1px dashed ${palette.graphite}`,
    color: palette.smoke,
    fontStyle: "italic",
  },
  sender: { fontSize: 12, fontWeight: 700, marginBottom: 2, opacity: 0.85 },
  quote: {
    borderLeft: `3px solid ${palette.smoke}`,
    paddingLeft: 8,
    marginBottom: 6,
    fontSize: 12,
    opacity: 0.85,
  },
  quoteAuthor: { fontWeight: 700 },
  time: { fontSize: 11, marginTop: 4, textAlign: "right" },
  menuBtn: {
    position: "absolute",
    top: 2,
    right: 4,
    background: "transparent",
    border: "none",
    color: "inherit",
    opacity: 0.6,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: "0 4px",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
    background: "transparent",
    border: "none",
    cursor: "default",
  },
  menu: {
    position: "absolute",
    top: 22,
    right: 4,
    zIndex: 20,
    background: "#141414",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: 6,
    display: "grid",
    gap: 2,
    minWidth: 170,
    boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
  },
  menuItem: {
    background: "transparent",
    border: "none",
    color: palette.offWhite,
    textAlign: "left",
    padding: "7px 10px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 13,
  },
  quickRow: { display: "flex", gap: 2, padding: "2px 4px 6px" },
  quick: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    padding: 2,
    borderRadius: 6,
  },
  quickOn: { background: palette.graphite },
  picker: {
    borderTop: `1px solid ${palette.graphite}`,
    paddingTop: 6,
    marginBottom: 4,
    maxWidth: 250,
  },
  pickerTabs: { display: "flex", gap: 2, marginBottom: 4 },
  pickerTab: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    padding: 3,
    borderRadius: 6,
  },
  // Siatka ma własne przewijanie — inaczej menu urosłoby poza ekran.
  pickerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 1,
    maxHeight: 150,
    overflowY: "auto",
  },
  reactions: { display: "flex", gap: 4, flexWrap: "wrap" },
  chip: {
    background: palette.graphite,
    border: `1px solid transparent`,
    borderRadius: 999,
    padding: "1px 8px",
    fontSize: 12,
    color: palette.offWhite,
    cursor: "pointer",
  },
  chipMine: { borderColor: palette.red },
  editArea: {
    background: "#0a0a0a",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    resize: "vertical",
    fontFamily: "inherit",
  },
  editSave: {
    background: palette.red,
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "5px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  editCancel: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 7,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
};
