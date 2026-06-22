import { palette } from "@e-logistic/ui";
import { useRef, useState } from "react";
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface Point {
  x: number;
  y: number;
}

/** Minimalny dystans między próbkami punktów (px) — odciąża render i SVG. */
const MIN_STEP = 1.5;
const STROKE = "#0a0a0a";
const STROKE_W = 2.5;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Buduje dokument SVG z narysowanych pociągnięć (białe „tło papieru" + czarny tusz). */
function strokesToSvg(strokes: Point[][], w: number, h: number): string {
  const paths = strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const d = s.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(" ");
      return `<path d="${d}" fill="none" stroke="${STROKE}" stroke-width="${STROKE_W}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/>${paths}</svg>`;
}

/**
 * Pole podpisu odbiorcy (e-CMR / POD) na telefonie — bez dodatkowych natywnych
 * modułów. PanResponder zbiera punkty, podgląd to realne segmenty-linie (obrót
 * View), eksport do wektorowego SVG. Interakcję rysowania należy przeklikać na
 * urządzeniu dotykowym; budowa SVG jest deterministyczna.
 */
export function SignaturePadMobile({
  onSave,
  onCancel,
  busy = false,
}: {
  onSave: (svg: string, width: number, height: number) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const strokesRef = useRef<Point[][]>([]);
  const currentRef = useRef<Point[]>([]);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const [, setTick] = useState(0);
  const [hasInk, setHasInk] = useState(false);
  const rerender = () => setTick((t) => t + 1);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        currentRef.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
        rerender();
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        const cur = currentRef.current;
        const last = cur[cur.length - 1];
        if (!last || dist(last, p) >= MIN_STEP) {
          cur.push(p);
          rerender();
        }
      },
      onPanResponderRelease: () => {
        if (currentRef.current.length > 0) {
          strokesRef.current.push(currentRef.current);
          currentRef.current = [];
          setHasInk(true);
        }
        rerender();
      },
      onPanResponderTerminate: () => {
        if (currentRef.current.length > 0) {
          strokesRef.current.push(currentRef.current);
          currentRef.current = [];
          setHasInk(true);
        }
        rerender();
      },
    }),
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: Math.round(width), h: Math.round(height) };
  }

  function clear() {
    strokesRef.current = [];
    currentRef.current = [];
    setHasInk(false);
    rerender();
  }

  function save() {
    if (!hasInk) return;
    const { w, h } = sizeRef.current;
    onSave(strokesToSvg(strokesRef.current, w, h), w, h);
  }

  const allStrokes = [...strokesRef.current, currentRef.current];

  return (
    <View style={styles.wrap}>
      <View style={styles.canvas} onLayout={onLayout} {...responder.panHandlers}>
        {allStrokes.map((stroke, si) =>
          stroke.map((p, i) => {
            if (i === 0) return null;
            const prev = stroke[i - 1];
            if (!prev) return null;
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const len = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            return (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: punkty pociągnięcia są stabilne w obrębie renderu
                key={`${si}-${i}`}
                style={[
                  styles.seg,
                  {
                    left: (p.x + prev.x) / 2 - len / 2,
                    top: (p.y + prev.y) / 2 - STROKE_W / 2,
                    width: len,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          }),
        )}
      </View>
      <View style={styles.row}>
        <Pressable style={styles.ghost} onPress={clear} disabled={busy}>
          <Text style={styles.ghostText}>🧹 Wyczyść</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.ghost} onPress={onCancel} disabled={busy}>
          <Text style={styles.ghostText}>Anuluj</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, (busy || !hasInk) && styles.disabled]}
          onPress={save}
          disabled={busy || !hasInk}
        >
          <Text style={styles.primaryText}>{busy ? "Zapisuję…" : "✔️ Zapisz"}</Text>
        </Pressable>
      </View>
      {!hasInk && <Text style={styles.hint}>Złóż podpis w polu powyżej.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  canvas: {
    height: 180,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderColor: palette.graphite,
    borderWidth: 1,
    overflow: "hidden",
  },
  seg: {
    position: "absolute",
    height: STROKE_W,
    backgroundColor: STROKE,
    borderRadius: STROKE_W / 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  ghost: {
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ghostText: { color: palette.offWhite, fontSize: 14 },
  primary: {
    backgroundColor: palette.red,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  primaryText: { color: palette.white, fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.5 },
  hint: { color: palette.smoke, fontSize: 12 },
});
