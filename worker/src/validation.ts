import type {
  BuybackUpdateRequest,
  PublicInventory,
  PublicInventoryItem
} from "./types";

export class ValidationError extends Error {}

const ITEM_KEYS = new Set([
  "id",
  "itemId",
  "mycaItemId",
  "name",
  "condition",
  "price",
  "stock",
  "genre",
  "category",
  "expansion",
  "cardNumber",
  "rarity",
  "packName"
]);

const text = (value: unknown, max: number, required = false) => {
  if (typeof value !== "string") throw new ValidationError("文字列の項目が不正です。");
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError("必須項目が入力されていません。");
  if (trimmed.length > max) throw new ValidationError("文字数が上限を超えています。");
  return trimmed;
};

const positiveInteger = (value: unknown, label: string) => {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ValidationError(`${label}は1以上の整数である必要があります。`);
  }
  return Number(value);
};

export function validateInventory(value: unknown, now: string): PublicInventory {
  if (!value || typeof value !== "object") throw new ValidationError("在庫データが不正です。");
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ValidationError("公開対象の在庫がありません。既存データは更新されません。");
  }
  if (input.items.length > 100_000) {
    throw new ValidationError("在庫件数が上限を超えています。");
  }

  const ids = new Set<string>();
  const items: PublicInventoryItem[] = input.items.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError(`${index + 1}件目の商品が不正です。`);
    }
    const item = raw as Record<string, unknown>;
    const unknownKeys = Object.keys(item).filter((key) => !ITEM_KEYS.has(key));
    if (unknownKeys.length) {
      throw new ValidationError(
        `公開不要な項目が含まれています: ${unknownKeys.slice(0, 3).join(", ")}`
      );
    }
    const id = text(item.id, 80, true);
    if (ids.has(id)) throw new ValidationError("在庫IDが重複しています。");
    ids.add(id);
    return {
      id,
      itemId: text(item.itemId, 80),
      mycaItemId: text(item.mycaItemId, 80),
      name: text(item.name, 300, true),
      condition: text(item.condition, 120),
      price: positiveInteger(item.price, "販売価格"),
      stock: positiveInteger(item.stock, "在庫数"),
      genre: text(item.genre, 120),
      category: text(item.category, 120),
      expansion: text(item.expansion, 180),
      cardNumber: text(item.cardNumber, 120),
      rarity: text(item.rarity, 80),
      packName: text(item.packName, 240)
    };
  });

  const totalImportedCount = positiveInteger(input.totalImportedCount, "CSV読込件数");
  const publishedCount = positiveInteger(input.publishedCount, "公開対象件数");
  const excludedCount =
    typeof input.excludedCount === "number" &&
    Number.isSafeInteger(input.excludedCount) &&
    input.excludedCount >= 0
      ? input.excludedCount
      : (() => {
          throw new ValidationError("除外件数が不正です。");
        })();
  if (publishedCount !== items.length || totalImportedCount !== publishedCount + excludedCount) {
    throw new ValidationError("集計件数と商品件数が一致しません。");
  }

  return {
    updatedAt: now,
    sourceFileName: text(input.sourceFileName, 180, true).replace(/[\\/]/g, "_"),
    totalImportedCount,
    publishedCount,
    excludedCount,
    items
  };
}

export function validateBuyback(value: unknown): BuybackUpdateRequest & { bytes: Uint8Array } {
  if (!value || typeof value !== "object") throw new ValidationError("画像データが不正です。");
  const input = value as Record<string, unknown>;
  const mimeType = input.mimeType;
  if (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp") {
    throw new ValidationError("対応していない画像形式です。");
  }
  const imageBase64 = text(input.imageBase64, 12_000_000, true);
  let bytes: Uint8Array;
  try {
    const binary = atob(imageBase64);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new ValidationError("画像データを読み取れませんでした。");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > 8 * 1024 * 1024) {
    throw new ValidationError("画像容量は8MB以下にしてください。");
  }
  if (!matchesImageSignature(bytes, mimeType)) {
    throw new ValidationError("画像の内容と形式が一致しません。");
  }
  const displayDate = text(input.displayDate, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    throw new ValidationError("表示上の更新日が不正です。");
  }
  return {
    fileName: text(input.fileName, 180, true),
    mimeType,
    imageBase64,
    displayDate,
    alt: text(input.alt, 120, true),
    bytes
  };
}

function matchesImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") {
    return bytes.slice(0, 8).every((value, index) =>
      value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]
    );
  }
  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}
