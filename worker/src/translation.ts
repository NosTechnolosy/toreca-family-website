import type {
  PublicInventory,
  PublicInventoryItem,
  TranslationSource
} from "./types";

const MODEL = "@cf/meta/m2m100-1.2b";
const CONCURRENCY = 8;
const JAPANESE_TEXT = /[\u3040-\u30ff\u3400-\u9fff]/;

export interface TranslationStats {
  translatedCount: number;
  reusedTranslationCount: number;
  fallbackTranslationCount: number;
}

type TranslationResult = {
  translated_text?: string;
};

export async function enrichInventoryTranslations(
  inventory: PublicInventory,
  previous: PublicInventory | null,
  ai?: Ai
): Promise<{ inventory: PublicInventory; stats: TranslationStats }> {
  const manualByKey = translationMap(previous, "manual");
  const reusableById = new Map(
    (previous?.items ?? [])
      .filter((item) => item.nameEn)
      .map((item) => [item.id, item])
  );
  const automaticByName = new Map<string, string>();
  for (const item of previous?.items ?? []) {
    if (item.nameEn && item.nameEnSource === "auto") {
      automaticByName.set(item.name, item.nameEn);
    }
  }

  const pendingNames = new Set<string>();
  const prepared = inventory.items.map((item) => {
    const incomingManual =
      item.nameEnSource === "manual" && item.nameEn ? item.nameEn : "";
    const savedManual = incomingManual || findManualTranslation(item, manualByKey);
    if (savedManual) return withTranslation(item, savedManual, "manual");

    const saved = reusableById.get(item.id);
    if (
      saved?.name === item.name &&
      saved.nameEn &&
      saved.nameEnSource === "auto"
    ) {
      return withTranslation(item, saved.nameEn, saved.nameEnSource);
    }

    const sameName = automaticByName.get(item.name);
    if (sameName) return withTranslation(item, sameName, "auto");

    if (!JAPANESE_TEXT.test(item.name)) {
      return withTranslation(item, item.name, "auto");
    }
    pendingNames.add(item.name);
    return withTranslation(item, "", "fallback");
  });

  const translated = await translateNames([...pendingNames], ai);
  let translatedCount = 0;
  let fallbackTranslationCount = 0;
  let reusedTranslationCount = 0;

  const items = prepared.map((item) => {
    if (item.nameEn) {
      if (item.nameEnSource !== "fallback") reusedTranslationCount += 1;
      return item;
    }
    const english = translated.get(item.name);
    if (english) {
      translatedCount += 1;
      return withTranslation(item, english, "auto");
    }
    fallbackTranslationCount += 1;
    return withTranslation(item, item.name, "fallback");
  });

  return {
    inventory: { ...inventory, items },
    stats: { translatedCount, reusedTranslationCount, fallbackTranslationCount }
  };
}

export function parsePreviousInventory(value: string | null): PublicInventory | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PublicInventory;
    return Array.isArray(parsed?.items) ? parsed : null;
  } catch {
    return null;
  }
}

async function translateNames(names: string[], ai?: Ai) {
  const translated = new Map<string, string>();
  if (!ai || names.length === 0) return translated;

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, names.length) },
    async () => {
      while (cursor < names.length) {
        const index = cursor++;
        const source = names[index];
        try {
          const response = await ai.run(MODEL, {
            text: source,
            source_lang: "ja",
            target_lang: "en"
          }) as TranslationResult;
          const english = cleanTranslation(response?.translated_text, source);
          if (english) translated.set(source, english);
        } catch {
          // A failed translation must never block an inventory update.
        }
      }
    }
  );
  await Promise.all(workers);
  return translated;
}

function cleanTranslation(value: unknown, source: string) {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > 300 || cleaned.includes("\uFFFD")) return "";
  if (JAPANESE_TEXT.test(cleaned) && cleaned === source) return "";
  return cleaned;
}

function withTranslation(
  item: PublicInventoryItem,
  nameEn: string,
  nameEnSource: TranslationSource
): PublicInventoryItem {
  return { ...item, nameEn, nameEnSource };
}

function translationMap(previous: PublicInventory | null, source: TranslationSource) {
  const result = new Map<string, string>();
  for (const item of previous?.items ?? []) {
    if (!item.nameEn || item.nameEnSource !== source) continue;
    for (const key of identityKeys(item)) result.set(key, item.nameEn);
  }
  return result;
}

function findManualTranslation(item: PublicInventoryItem, translations: Map<string, string>) {
  for (const key of identityKeys(item)) {
    const value = translations.get(key);
    if (value) return value;
  }
  return "";
}

function identityKeys(item: PublicInventoryItem) {
  return [
    item.id && `inventory:${item.id}`,
    item.itemId && `item:${item.itemId}`,
    item.mycaItemId && `myca:${item.mycaItemId}`,
    item.cardNumber && `card:${item.genre}:${item.cardNumber}`
  ].filter(Boolean) as string[];
}
