import { describe, expect, it } from "vitest";
import { guardRedirect, notificationTarget } from "./navigation";

describe("guardRedirect (bramka tras)", () => {
  const base = { session: null, loading: false, configured: true, segments: ["index"] as string[] };

  it("nie przekierowuje podczas ładowania ani bez konfiguracji", () => {
    expect(guardRedirect({ ...base, loading: true })).toBeNull();
    expect(guardRedirect({ ...base, configured: false })).toBeNull();
  });

  it("bez sesji poza /login → /login", () => {
    expect(guardRedirect({ ...base, session: null, segments: ["index"] })).toBe("/login");
  });

  it("bez sesji na /login → null (zostań)", () => {
    expect(guardRedirect({ ...base, session: null, segments: ["login"] })).toBeNull();
  });

  it("z sesją na /login → / (pulpit)", () => {
    expect(guardRedirect({ ...base, session: {}, segments: ["login"] })).toBe("/");
  });

  it("z sesją poza /login → null", () => {
    expect(guardRedirect({ ...base, session: {}, segments: ["my-orders"] })).toBeNull();
  });
});

describe("notificationTarget", () => {
  it("zwraca ścieżkę względną z url", () => {
    expect(notificationTarget("/orders/5")).toBe("/orders/5");
  });

  it("fallback /my-orders dla braku lub URL absolutnego (bezpieczeństwo)", () => {
    expect(notificationTarget(undefined)).toBe("/my-orders");
    expect(notificationTarget("https://evil.com")).toBe("/my-orders");
    expect(notificationTarget(123)).toBe("/my-orders");
  });
});
