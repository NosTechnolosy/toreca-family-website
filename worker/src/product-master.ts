import type {
  ProductMaster,
  PublicInventory,
  PublicInventoryItem
} from "./types";

export function parseProductMaster(value: string | null): ProductMaster | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ProductMaster;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.imagesByMycaItemId ||
      !parsed.imagesByItemId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parsePublishedInventory(value: string | null): PublicInventory | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PublicInventory;
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

export function enrichInventoryImages(
  inventory: PublicInventory,
  productMaster: ProductMaster | null,
  previous: PublicInventory | null = null
) {
  const previousImages = new Map<string, string>();
  for (const item of previous?.items ?? []) {
    if (item.imageUrl) previousImages.set(identityKey(item), item.imageUrl);
  }

  let matchedImageCount = 0;
  const items = inventory.items.map((item) => {
    const imageUrl =
      (item.mycaItemId && productMaster?.imagesByMycaItemId[item.mycaItemId]) ||
      (item.itemId && productMaster?.imagesByItemId[item.itemId]) ||
      previousImages.get(identityKey(item)) ||
      "";
    if (imageUrl) matchedImageCount += 1;
    return { ...item, imageUrl };
  });

  return {
    inventory: { ...inventory, items },
    matchedImageCount
  };
}

function identityKey(item: PublicInventoryItem) {
  return item.mycaItemId || item.itemId || item.id;
}
