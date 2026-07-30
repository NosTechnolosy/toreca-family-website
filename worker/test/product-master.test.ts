import { describe, expect, it } from "vitest";
import {
  enrichInventoryImages,
  parseProductMaster
} from "../src/product-master";
import { validateProductMaster } from "../src/validation";
import type { PublicInventory } from "../src/types";

const now = "2026-07-30T12:00:00+09:00";
const request = {
  updatedAt: null,
  sourceFileName: "item.csv",
  totalImportedCount: 2,
  publishedCount: 2,
  excludedCount: 0,
  imagesByMycaItemId: {
    "100": "https://static.example.com/a.jpg"
  },
  imagesByItemId: {
    "20": "https://static.example.com/b.jpg"
  }
};

const inventory: PublicInventory = {
  updatedAt: now,
  sourceFileName: "stock.csv",
  totalImportedCount: 2,
  publishedCount: 2,
  excludedCount: 0,
  items: [
    {
      id: "1",
      itemId: "10",
      mycaItemId: "100",
      name: "A",
      nameEn: "A",
      nameEnSource: "manual",
      condition: "",
      price: 100,
      stock: 1,
      genre: "",
      category: "",
      expansion: "",
      cardNumber: "",
      rarity: "",
      packName: ""
    },
    {
      id: "2",
      itemId: "20",
      mycaItemId: "",
      name: "B",
      nameEn: "B",
      nameEnSource: "manual",
      condition: "",
      price: 200,
      stock: 1,
      genre: "",
      category: "",
      expansion: "",
      cardNumber: "",
      rarity: "",
      packName: ""
    }
  ]
};

describe("product master", () => {
  it("accepts HTTPS image lookups and overwrites updatedAt", () => {
    const result = validateProductMaster(request, now);
    expect(result.updatedAt).toBe(now);
    expect(result.publishedCount).toBe(2);
  });

  it("rejects unsafe URLs and inconsistent counts", () => {
    expect(() => validateProductMaster({
      ...request,
      imagesByMycaItemId: { "100": "http://example.com/a.jpg" }
    }, now)).toThrow("HTTPS");
    expect(() => validateProductMaster({
      ...request,
      publishedCount: 3
    }, now)).toThrow("集計件数");
  });

  it("matches Myca ID first and falls back to the product master ID", () => {
    const master = validateProductMaster(request, now);
    const result = enrichInventoryImages(inventory, master);
    expect(result.matchedImageCount).toBe(2);
    expect(result.inventory.items.map((item) => item.imageUrl)).toEqual([
      "https://static.example.com/a.jpg",
      "https://static.example.com/b.jpg"
    ]);
  });

  it("parses stored product master JSON", () => {
    expect(parseProductMaster(JSON.stringify(request))?.publishedCount).toBe(2);
    expect(parseProductMaster("{")).toBeNull();
  });
});
