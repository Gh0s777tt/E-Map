import { describe, expect, it } from "vitest";
import type { TypedSupabaseClient } from "../client";
import { uploadChatPhotoBinary } from "./messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimalny stub Storage — mock z `test-utils` odtwarza tylko query-builder. */
function storageStub() {
  const uploads: { path: string; contentType?: string }[] = [];
  const client = {
    storage: {
      from: () => ({
        upload: (path: string, _bytes: ArrayBuffer, opts?: { contentType?: string }) => {
          uploads.push({ path, contentType: opts?.contentType });
          return Promise.resolve({ data: { path }, error: null });
        },
      }),
    },
  } as unknown as TypedSupabaseClient;
  return { client, uploads };
}

describe("uploadChatPhotoBinary (ścieżka = bramka RLS, #369)", () => {
  it("wątek trafia do ścieżki: {firma}/chat/{threadId}/{uuid}.{ext}", async () => {
    const { client, uploads } = storageStub();
    const path = await uploadChatPhotoBinary(client, "c1", new ArrayBuffer(4), {
      mime: "image/png",
      threadId: "9f1d0b6e-2b3a-4c5d-8e7f-0a1b2c3d4e5f",
    });
    const parts = path.split("/");
    expect(parts.slice(0, 3)).toEqual(["c1", "chat", "9f1d0b6e-2b3a-4c5d-8e7f-0a1b2c3d4e5f"]);
    expect(parts[3]).toMatch(/\.png$/);
    expect(parts[3]?.replace(/\.png$/, "")).toMatch(UUID);
    expect(uploads[0]?.path).toBe(path);
    expect(uploads[0]?.contentType).toBe("image/png");
  });

  it("kanał ogólny (bez wątku) ląduje w folderze `general`", async () => {
    const { client } = storageStub();
    const path = await uploadChatPhotoBinary(client, "c1", new ArrayBuffer(4));
    expect(path.split("/").slice(0, 3)).toEqual(["c1", "chat", "general"]);
    expect(path.endsWith(".jpeg")).toBe(true);
  });

  it("nigdy nie wraca do płaskiej ścieżki sprzed #369 (`chat-<uuid>`)", async () => {
    const { client } = storageStub();
    const path = await uploadChatPhotoBinary(client, "c1", new ArrayBuffer(4), { threadId: null });
    expect(path).not.toMatch(/\/chat-/);
    // 4 segmenty = polityka 0088 ma z czego odczytać firmę i kanał.
    expect(path.split("/")).toHaveLength(4);
  });

  it("rzuca błędem Storage (np. odmowa RLS przy obcym wątku)", async () => {
    const client = {
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: new Error("RLS") }),
        }),
      },
    } as unknown as TypedSupabaseClient;
    await expect(uploadChatPhotoBinary(client, "c1", new ArrayBuffer(4))).rejects.toThrow("RLS");
  });
});
