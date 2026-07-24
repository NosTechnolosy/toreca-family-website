import {
  commitFiles,
  GitHubConflictError,
  GitHubRequestError,
  readTextFile
} from "./github";
import type { Env, SiteContent } from "./types";
import {
  validateBuyback,
  validateInventory,
  ValidationError
} from "./validation";

const INVENTORY_PATH = "docs/data/inventory.json";
const CONTENT_PATH = "docs/data/site-content.json";
const fallbackLimits = new Map<string, { count: number; resetAt: number }>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "toreca-family-update-api" }, 200, request, env);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method !== "POST") {
      return json({ error: "この操作には対応していません。" }, 405, request, env);
    }
    if (!isAllowedOrigin(request, env)) {
      return json({ error: "許可されていない接続元です。" }, 403, request, env);
    }
    const rateKey = `${request.headers.get("CF-Connecting-IP") ?? "unknown"}:${url.pathname}`;
    if (!(await allowRequest(env, rateKey))) {
      return json({ error: "短時間に更新が集中しています。1分ほど待ってください。" }, 429, request, env);
    }
    if (!(await isAuthenticated(request, env.APP_API_KEY))) {
      return json({ error: "接続キーが正しくありません。" }, 401, request, env);
    }

    try {
      if (url.pathname === "/api/inventory/update") {
        return await updateInventory(request, env);
      }
      if (url.pathname === "/api/buyback/update") {
        return await updateBuyback(request, env);
      }
      return json({ error: "更新先が見つかりません。" }, 404, request, env);
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: error.message }, 400, request, env);
      }
      if (error instanceof GitHubConflictError) {
        return json({ error: error.message }, 409, request, env);
      }
      if (error instanceof GitHubRequestError) {
        return json({ error: error.message }, 502, request, env);
      }
      console.error("update failed", {
        path: url.pathname,
        error: error instanceof Error ? error.name : "UnknownError"
      });
      return json(
        { error: "更新処理に失敗しました。以前の公開データは変更されていません。" },
        500,
        request,
        env
      );
    }
  }
};

async function updateInventory(request: Request, env: Env) {
  const body = await readJsonWithLimit(request, 10 * 1024 * 1024);
  const now = tokyoIsoString();
  const inventory = validateInventory(body, now);
  await commitFiles(
    env,
    [{ path: INVENTORY_PATH, content: `${JSON.stringify(inventory)}\n` }],
    `Update inventory (${inventory.publishedCount} items)`
  );
  return json(
    {
      message: "在庫データを更新しました。",
      updatedAt: now,
      publishedCount: inventory.publishedCount,
      excludedCount: inventory.excludedCount
    },
    200,
    request,
    env
  );
}

async function updateBuyback(request: Request, env: Env) {
  const input = validateBuyback(await readJsonWithLimit(request, 12 * 1024 * 1024));
  const now = tokyoIsoString();
  const extension =
    input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
  const stamp = now
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\+.*/, "")
    .slice(0, 15);
  const imagePath = `docs/assets/buyback/buyback-${stamp}.${extension}`;
  const publicUrl = `./assets/buyback/${imagePath.split("/").pop()}`;
  const currentText = await readTextFile(env, CONTENT_PATH);
  const current = parseSiteContent(currentText);
  const previousHistory = current?.buybackTable.history ?? (
    current?.buybackTable.imageUrl ? [current.buybackTable.imageUrl] : []
  );
  const history = [publicUrl, ...previousHistory.filter((url) => url !== publicUrl)].slice(0, 5);
  const removed = previousHistory
    .filter((url) => !history.includes(url))
    .map((url) => ({
      path: `docs/${url.replace(/^\.\//, "")}`,
      content: null
    }));
  const content: SiteContent = {
    buybackTable: {
      imageUrl: publicUrl,
      updatedAt: now,
      displayDate: input.displayDate.replaceAll("-", "/"),
      alt: input.alt,
      history
    }
  };
  await commitFiles(
    env,
    [
      { path: imagePath, content: input.bytes },
      { path: CONTENT_PATH, content: `${JSON.stringify(content)}\n` },
      ...removed
    ],
    `Update buyback table (${input.displayDate})`
  );
  return json(
    {
      message: "買取表を更新しました。",
      updatedAt: now,
      displayDate: content.buybackTable.displayDate
    },
    200,
    request,
    env
  );
}

function parseSiteContent(value: string | null): SiteContent | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as SiteContent;
    return parsed?.buybackTable ? parsed : null;
  } catch {
    return null;
  }
}

async function readJsonWithLimit(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > limit) throw new ValidationError("送信データの容量が上限を超えています。");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > limit) {
    throw new ValidationError("送信データの容量が上限を超えています。");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new ValidationError("送信データを読み取れませんでした。");
  }
}

async function isAuthenticated(request: Request, expected: string) {
  const actual = request.headers.get("X-App-Key") ?? "";
  if (!actual || !expected) return false;
  const [actualHash, expectedHash] = await Promise.all([digest(actual), digest(expected)]);
  let difference = actualHash.length ^ expectedHash.length;
  for (let index = 0; index < Math.min(actualHash.length, expectedHash.length); index++) {
    difference |= actualHash[index] ^ expectedHash[index];
  }
  return difference === 0;
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function allowRequest(env: Env, key: string) {
  if (env.UPDATES_RATE_LIMITER) {
    return (await env.UPDATES_RATE_LIMITER.limit({ key })).success;
  }
  const now = Date.now();
  const current = fallbackLimits.get(key);
  if (!current || current.resetAt <= now) {
    fallbackLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
}

function isAllowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return env.ALLOWED_ORIGIN.split(",").map((value) => value.trim()).includes(origin);
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin") ?? "";
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  if (isAllowedOrigin(request, env) && origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function json(value: unknown, status: number, request: Request, env: Env) {
  return new Response(JSON.stringify(value), {
    status,
    headers: corsHeaders(request, env)
  });
}

function tokyoIsoString() {
  const now = new Date();
  const tokyo = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${tokyo.toISOString().slice(0, 19)}+09:00`;
}
