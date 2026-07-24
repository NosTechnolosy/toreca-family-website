import { describe, expect, it, vi } from "vitest";
import { enrichInventoryTranslations } from "../src/translation";
import type { PublicInventory } from "../src/types";

const inventory = (name = "リザードン"): PublicInventory => ({
  updatedAt: "2026-07-24T12:00:00+09:00",
  sourceFileName: "stock.csv",
  totalImportedCount: 1,
  publishedCount: 1,
  excludedCount: 0,
  items: [{
    id: "1",
    itemId: "10",
    mycaItemId: "100",
    name,
    nameEn: "",
    nameEnSource: "fallback",
    condition: "状態A",
    price: 1200,
    stock: 1,
    genre: "ポケモン",
    category: "カード",
    expansion: "SV",
    cardNumber: "001",
    rarity: "SR",
    packName: "テストパック"
  }]
});

describe("inventory name translation", () => {
  it("translates a Japanese name and records its source", async () => {
    const ai = {
      run: vi.fn().mockResolvedValue({ translated_text: "Charizard" })
    } as unknown as Ai;
    const result = await enrichInventoryTranslations(inventory(), null, ai);
    expect(result.inventory.items[0]).toMatchObject({
      name: "リザードン",
      nameEn: "Charizard",
      nameEnSource: "auto"
    });
    expect(result.stats.translatedCount).toBe(1);
  });

  it("reuses a manual name matched by card identity", async () => {
    const previous = inventory();
    previous.items[0].nameEn = "Official Charizard";
    previous.items[0].nameEnSource = "manual";
    const ai = { run: vi.fn() } as unknown as Ai;
    const result = await enrichInventoryTranslations(inventory(), previous, ai);
    expect(result.inventory.items[0].nameEn).toBe("Official Charizard");
    expect(result.inventory.items[0].nameEnSource).toBe("manual");
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("falls back to Japanese without blocking the update", async () => {
    const ai = {
      run: vi.fn().mockRejectedValue(new Error("translation unavailable"))
    } as unknown as Ai;
    const result = await enrichInventoryTranslations(inventory(), null, ai);
    expect(result.inventory.items[0]).toMatchObject({
      nameEn: "リザードン",
      nameEnSource: "fallback"
    });
    expect(result.stats.fallbackTranslationCount).toBe(1);
  });
});
