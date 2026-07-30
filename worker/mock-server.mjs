import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.MOCK_PORT ?? 8787);
const key = process.env.APP_API_KEY ?? "local-test-key-change-before-production";
const workerDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(workerDirectory, "../tests/output");

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin ?? "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-App-Key");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") return response.end();
  if (request.url === "/api/health") return send(response, 200, { ok: true });
  if (request.headers["x-app-key"] !== key) {
    return send(response, 401, { error: "接続キーが正しくありません。" });
  }
  if (request.method !== "POST") {
    return send(response, 405, { error: "この操作には対応していません。" });
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 12 * 1024 * 1024) throw new Error("送信容量が大きすぎます。");
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    await mkdir(outputDirectory, { recursive: true });
    const now = new Date().toISOString();
    if (request.url === "/api/inventory/update") {
      if (!Array.isArray(body.items) || body.items.some((item) => item.stock <= 0 || item.price <= 0)) {
        throw new Error("公開条件を満たさない在庫データです。");
      }
      await writeFile(
        resolve(outputDirectory, "mock-inventory.json"),
        `${JSON.stringify({ ...body, updatedAt: now }, null, 2)}\n`
      );
      return send(response, 200, {
        message: "在庫データを更新しました。",
        updatedAt: now,
        publishedCount: body.publishedCount,
        excludedCount: body.excludedCount
      });
    }
    if (request.url === "/api/product-master/update") {
      const imageCount =
        Object.keys(body.imagesByMycaItemId ?? {}).length +
        Object.keys(body.imagesByItemId ?? {}).length;
      if (!imageCount || imageCount !== body.publishedCount) {
        throw new Error("商品マスタの画像件数が一致しません。");
      }
      await writeFile(
        resolve(outputDirectory, "mock-product-master.json"),
        `${JSON.stringify({ ...body, updatedAt: now })}\n`
      );
      return send(response, 200, {
        message: "商品マスタを更新しました。",
        updatedAt: now,
        publishedCount: body.publishedCount,
        excludedCount: body.excludedCount,
        matchedImageCount: 0
      });
    }
    if (request.url === "/api/buyback/update") {
      const extension = body.mimeType === "image/png" ? "png" : body.mimeType === "image/webp" ? "webp" : "jpg";
      await writeFile(
        resolve(outputDirectory, `mock-buyback.${extension}`),
        Buffer.from(body.imageBase64, "base64")
      );
      return send(response, 200, {
        message: "買取表を更新しました。",
        updatedAt: now,
        displayDate: body.displayDate.replaceAll("-", "/")
      });
    }
    return send(response, 404, { error: "更新先が見つかりません。" });
  } catch (error) {
    return send(response, 400, {
      error: error instanceof Error ? error.message : "データが不正です。"
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock update API: http://127.0.0.1:${port}`);
  console.log(`Local key: ${key}`);
});

function send(response, status, body) {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}
