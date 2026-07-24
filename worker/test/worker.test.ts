import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/types";

const env: Env = {
  GITHUB_TOKEN: "secret-token",
  GITHUB_OWNER: "owner",
  GITHUB_REPO: "repo",
  GITHUB_BRANCH: "test/site-updater",
  APP_API_KEY: "a-very-long-application-key",
  ALLOWED_ORIGIN: "tauri://localhost"
};

const body = {
  updatedAt: null,
  sourceFileName: "stock.csv",
  totalImportedCount: 1,
  publishedCount: 1,
  excludedCount: 0,
  items: [{
    id: "1",
    itemId: "10",
    mycaItemId: "100",
    name: "テスト",
    condition: "状態A",
    price: 100,
    stock: 1,
    genre: "ポケモン",
    category: "カード",
    expansion: "",
    cardNumber: "001",
    rarity: "R",
    packName: ""
  }]
};

const request = (key = env.APP_API_KEY) =>
  new Request("https://worker.example/api/inventory/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "tauri://localhost",
      "X-App-Key": key
    },
    body: JSON.stringify(body)
  });

afterEach(() => vi.restoreAllMocks());

describe("update worker", () => {
  it("returns health without authentication", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/api/health"),
      env
    );
    expect(response.status).toBe(200);
  });

  it("rejects failed authentication", async () => {
    const response = await worker.fetch(request("wrong-key"), env);
    expect(response.status).toBe(401);
  });

  it("rejects a chunked body that exceeds the inventory limit", async () => {
    const oversized = new Request("https://worker.example/api/inventory/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "tauri://localhost",
        "X-App-Key": env.APP_API_KEY
      },
      body: JSON.stringify({ padding: "x".repeat(10 * 1024 * 1024) })
    });
    const response = await worker.fetch(oversized, env);
    expect(response.status).toBe(400);
  });

  it("keeps existing data when GitHub fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "failure" }), { status: 500 })
    );
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("保存できません")
    });
  });

  it("reports a concurrent GitHub update as conflict", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/git/ref/")) {
        return Response.json({ object: { sha: "head" } });
      }
      if (url.endsWith("/git/commits/head")) {
        return Response.json({ tree: { sha: "tree" } });
      }
      if (url.endsWith("/git/blobs")) {
        return Response.json({ sha: "blob" });
      }
      if (url.endsWith("/git/trees")) {
        return Response.json({ sha: "new-tree" });
      }
      if (url.endsWith("/git/commits")) {
        return Response.json({ sha: "new-commit" });
      }
      if (url.includes("/git/refs/") && init?.method === "PATCH") {
        return Response.json({ message: "conflict" }, { status: 422 });
      }
      return Response.json({ message: "unexpected" }, { status: 500 });
    });
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(409);
  });
});
