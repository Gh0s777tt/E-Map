import { palette } from "@e-logistic/ui";
import * as Sentry from "@sentry/react-native";
import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  children: ReactNode;
  title: string;
  body: string;
  retryLabel: string;
  /** Wołane po tapnięciu „spróbuj ponownie" (np. powrót na pulpit). */
  onReset?: () => void;
}
interface State {
  hasError: boolean;
}

/**
 * Łapie nieuchwycone błędy renderu poddrzewa i pokazuje markowy ekran zamiast
 * ubijać całą aplikację (kluczowe dla stabilności / Apple 5.6). Zgłasza też do
 * Sentry, gdy skonfigurowany. Teksty przekazywane z zewnątrz (zlokalizowane).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    try {
      Sentry.captureException(error);
    } catch {
      // Sentry niedostępny/niekonfigurowany — nie eskaluj błędu z boundary.
    }
  }

  private reset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>{this.props.title}</Text>
        <Text style={styles.body}>{this.props.body}</Text>
        <Pressable style={styles.btn} onPress={this.reset} accessibilityRole="button">
          <Text style={styles.btnText}>{this.props.retryLabel}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: palette.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  emoji: { fontSize: 44 },
  title: { color: palette.offWhite, fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: {
    color: palette.smoke,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  btn: {
    marginTop: 8,
    backgroundColor: palette.red,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: { color: palette.white, fontSize: 15, fontWeight: "800" },
});
