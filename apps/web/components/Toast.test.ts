// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => vi.useFakeTimers());

function Trigger({ msg, kind }: { msg: string; kind?: "success" | "error" | "info" }) {
  const toast = useToast();
  return h("button", { type: "button", onClick: () => toast(msg, kind) }, "fire");
}

const provider = (msg: string, kind?: "success" | "error" | "info") =>
  // biome-ignore lint/correctness/noChildrenProp: createElement w teście — children w props (wymóg tsc)
  h(ToastProvider, { children: h(Trigger, { msg, kind }) });

describe("ToastProvider", () => {
  it("pokazuje toast po wywołaniu useToast (z klasą wg rodzaju)", () => {
    render(provider("Zapisano", "success"));
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getByText("Zapisano").className).toContain("el-toast-success");
  });

  it("auto-znika po ~3.5 s", () => {
    render(provider("Znika"));
    fireEvent.click(screen.getByText("fire"));
    expect(screen.queryByText("Znika")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByText("Znika")).toBeNull();
  });

  it("kontener toastów ma aria-live (dostępność)", () => {
    render(provider("x"));
    expect(document.querySelector(".el-toasts")?.getAttribute("aria-live")).toBe("polite");
  });

  it("akcja „Cofnij” (#295): żyje dłużej, klik wywołuje callback i zamyka toast", () => {
    const onClick = vi.fn();
    function TriggerAction() {
      const toast = useToast();
      return h(
        "button",
        { type: "button", onClick: () => toast("Odrzucono", "info", { label: "Cofnij", onClick }) },
        "fire",
      );
    }
    // biome-ignore lint/correctness/noChildrenProp: createElement w teście — children w props (wymóg tsc)
    render(h(ToastProvider, { children: h(TriggerAction) }));
    fireEvent.click(screen.getByText("fire"));
    act(() => {
      vi.advanceTimersByTime(3600); // po standardowych 3.5 s wciąż widoczny
    });
    expect(screen.queryByText("Cofnij")).not.toBeNull();
    fireEvent.click(screen.getByText("Cofnij"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Odrzucono")).toBeNull();
  });
});
