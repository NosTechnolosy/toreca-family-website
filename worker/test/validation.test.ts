import { describe, expect, it } from "vitest";
import { validateBuyback, validateInventory } from "../src/validation";

const item = {
  id: "1",
  itemId: "10",
  mycaItemId: "100",
  name: "テストカード",
  condition: "状態A",
  price: 1200,
  stock: 1,
  genre: "ポケモン",
  category: "カード",
  expansion: "SV",
  cardNumber: "001",
  rarity: "SR",
  packName: "テストパック"
};

const inventory = (overrides: Record<string, unknown> = {}) => ({
  updatedAt: null,
  sourceFileName: "stock.csv",
  totalImportedCount: 1,
  publishedCount: 1,
  excludedCount: 0,
  items: [item],
  ...overrides
});

describe("inventory validation", () => {
  it("accepts only publishable items and overwrites updatedAt", () => {
    const result = validateInventory(inventory(), "2026-07-24T12:00:00+09:00");
    expect(result.updatedAt).toBe("2026-07-24T12:00:00+09:00");
    expect(result.items[0].price).toBe(1200);
  });

  it("rejects sell_price zero", () => {
    expect(() =>
      validateInventory(
        inventory({ items: [{ ...item, price: 0 }] }),
        "2026-07-24T12:00:00+09:00"
      )
    ).toThrow("販売価格");
  });

  it("rejects stock zero", () => {
    expect(() =>
      validateInventory(
        inventory({ items: [{ ...item, stock: 0 }] }),
        "2026-07-24T12:00:00+09:00"
      )
    ).toThrow("在庫数");
  });

  it("rejects duplicate inventory ids", () => {
    expect(() =>
      validateInventory(
        inventory({
          totalImportedCount: 2,
          publishedCount: 2,
          items: [item, { ...item }]
        }),
        "2026-07-24T12:00:00+09:00"
      )
    ).toThrow("重複");
  });

  it("rejects internal or unknown fields", () => {
    expect(() =>
      validateInventory(
        inventory({ items: [{ ...item, buyPrice: 999 }] }),
        "2026-07-24T12:00:00+09:00"
      )
    ).toThrow("公開不要");
  });
});

describe("buyback validation", () => {
  it("rejects an invalid image signature", () => {
    expect(() =>
      validateBuyback({
        fileName: "fake.png",
        mimeType: "image/png",
        imageBase64: btoa("not a png"),
        displayDate: "2026-07-24",
        alt: "最新買取表"
      })
    ).toThrow("一致");
  });

  it("rejects an oversized image payload", () => {
    expect(() =>
      validateBuyback({
        fileName: "large.png",
        mimeType: "image/png",
        imageBase64: "A".repeat(12_000_001),
        displayDate: "2026-07-24",
        alt: "最新買取表"
      })
    ).toThrow("上限");
  });
});
