import {
  commitFiles,
  GitHubConflictError,
  GitHubRequestError,
  readTextFile
} from "./github";
import type { Env, PublishedBuybackImage, SiteContent } from "./types";
import {
  enrichInventoryImages,
  parseProductMaster,
  parsePublishedInventory
} from "./product-master";
import {
  enrichInventoryTranslations,
  parsePreviousInventory
} from "./translation";
import {
  validateBuyback,
  validateInventory,
  validateProductMaster,
  ValidationError
} from "./validation";

const INVENTORY_PATH = "docs/data/inventory.json";
const PRODUCT_MASTER_PATH = "data/product-master.json";
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
    if (request.method !== "POST" && request.method !== "GET") {
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
      if (request.method === "GET" && url.pathname === "/api/buyback") {
        return await getBuyback(request, env);
      }
      if (request.method !== "POST") {
        return json({ error: "更新先が見つかりません。" }, 404, request, env);
      }
      if (url.pathname === "/api/inventory/update") {
        return await updateInventory(request, env);
      }
      if (url.pathname === "/api/buyback/update") {
        return await updateBuyback(request, env);
      }
      if (url.pathname === "/api/product-master/update") {
        return await updateProductMaster(request, env);
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
  const validated = validateInventory(body, now);
  let previous = null;
  let productMaster = null;
  try {
    const previousText = await readTextFile(env, INVENTORY_PATH);
    previous = parsePreviousInventory(previousText);
    productMaster = parseProductMaster(await readTextFile(env, PRODUCT_MASTER_PATH));
  } catch {
    // Existing data reuse is optional; a read failure must not prevent publishing.
  }
  const { inventory, stats } = await enrichInventoryTranslations(validated, previous, env.AI);
  const images = enrichInventoryImages(inventory, productMaster, previous);
  await commitFiles(
    env,
    [{ path: INVENTORY_PATH, content: `${JSON.stringify(images.inventory)}\n` }],
    `Update inventory (${images.inventory.publishedCount} items)`
  );
  return json(
    {
      message: "在庫データを更新しました。",
      updatedAt: now,
      publishedCount: images.inventory.publishedCount,
      excludedCount: images.inventory.excludedCount,
      matchedImageCount: images.matchedImageCount,
      ...stats
    },
    200,
    request,
    env
  );
}

async function updateProductMaster(request: Request, env: Env) {
  const body = await readJsonWithLimit(request, 10 * 1024 * 1024);
  const now = tokyoIsoString();
  const productMaster = validateProductMaster(body, now);
  const changes: Array<{ path: string; content: string }> = [{
    path: PRODUCT_MASTER_PATH,
    content: `${JSON.stringify(productMaster)}\n`
  }];
  let matchedImageCount = 0;
  try {
    const inventory = parsePublishedInventory(await readTextFile(env, INVENTORY_PATH));
    if (inventory) {
      const images = enrichInventoryImages(inventory, productMaster);
      matchedImageCount = images.matchedImageCount;
      changes.push({
        path: INVENTORY_PATH,
        content: `${JSON.stringify(images.inventory)}\n`
      });
    }
  } catch {
    // The product master can still be saved when no inventory has been published yet.
  }
  await commitFiles(
    env,
    changes,
    `Update product master (${productMaster.publishedCount} images)`
  );
  return json({
    message: "商品マスタを更新しました。",
    updatedAt: now,
    publishedCount: productMaster.publishedCount,
    excludedCount: productMaster.excludedCount,
    matchedImageCount
  }, 200, request, env);
}

async function updateBuyback(request: Request, env: Env) {
  const input = validateBuyback(await readJsonWithLimit(request, 58 * 1024 * 1024));
  const now = tokyoIsoString();
  const stamp = now
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\+.*/, "")
    .slice(0, 15);
  const currentText = await readTextFile(env, CONTENT_PATH);
  const current = parseSiteContent(currentText);
  const previousImages = currentBuybackImages(current);
  const previousById = new Map(previousImages.map((image) => [image.id, image]));
  const changes: Array<{ path: string; content: string | Uint8Array | null }> = [];
  const images: PublishedBuybackImage[] = input.images.map((image, index) => {
    let imageUrl = image.existingUrl ?? "";
    if (image.bytes && image.mimeType) {
      const extension = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/png" ? "png" : "webp";
      const imagePath = `docs/assets/buyback/buyback-${stamp}-${index + 1}.${extension}`;
      imageUrl = `./assets/buyback/${imagePath.split("/").pop()}`;
      changes.push({ path: imagePath, content: image.bytes });
    }
    const previous = previousById.get(image.id);
    return {
      id: image.id,
      imageUrl,
      updatedAt: image.bytes ? now : (previous?.updatedAt ?? now),
      displayDate: image.displayDate.replaceAll("-", "/"),
      alt: image.alt
    };
  });
  const activeUrls = images.map((image) => image.imageUrl);
  const removed = previousImages
    .map((image) => image.imageUrl)
    .filter((url) => url.startsWith("./assets/buyback/") && !activeUrls.includes(url))
    .map((url) => ({
      path: `docs/${url.replace(/^\.\//, "")}`,
      content: null
    }));
  const first = images[0];
  const content: SiteContent = {
    buybackTable: {
      imageUrl: first?.imageUrl ?? "",
      updatedAt: now,
      displayDate: first?.displayDate ?? "",
      alt: first?.alt ?? "",
      history: activeUrls,
      images
    }
  };
  changes.push({ path: CONTENT_PATH, content: `${JSON.stringify(content)}\n` }, ...removed);
  await commitFiles(
    env,
    changes,
    `Update buyback tables (${images.length} images)`
  );
  return json(
    {
      message: images.length ? "買取表を更新しました。" : "買取表をすべて非表示にしました。",
      updatedAt: now,
      displayDate: content.buybackTable.displayDate,
      imageCount: images.length
    },
    200,
    request,
    env
  );
}

async function getBuyback(request: Request, env: Env) {
  const current = parseSiteContent(await readTextFile(env, CONTENT_PATH));
  return json({ images: currentBuybackImages(current) }, 200, request, env);
}

function currentBuybackImages(content: SiteContent | null): PublishedBuybackImage[] {
  const table = content?.buybackTable;
  if (!table) return [];
  if (Array.isArray(table.images)) return table.images.slice(0, 5);
  if (!table.imageUrl) return [];
  return [{
    id: "buyback-legacy",
    imageUrl: table.imageUrl,
    updatedAt: table.updatedAt,
    displayDate: table.displayDate,
    alt: table.alt
  }];
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
