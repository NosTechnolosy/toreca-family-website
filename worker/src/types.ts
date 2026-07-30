export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  APP_API_KEY: string;
  ALLOWED_ORIGIN: string;
  AI?: Ai;
  UPDATES_RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
}

export type TranslationSource = "manual" | "auto" | "fallback";

export interface PublicInventoryItem {
  id: string;
  itemId: string;
  mycaItemId: string;
  name: string;
  nameEn: string;
  nameEnSource: TranslationSource;
  condition: string;
  price: number;
  stock: number;
  genre: string;
  category: string;
  expansion: string;
  cardNumber: string;
  rarity: string;
  packName: string;
  imageUrl?: string;
}

export interface PublicInventory {
  updatedAt: string | null;
  sourceFileName: string;
  totalImportedCount: number;
  publishedCount: number;
  excludedCount: number;
  items: PublicInventoryItem[];
}

export interface ProductMaster {
  updatedAt: string | null;
  sourceFileName: string;
  totalImportedCount: number;
  publishedCount: number;
  excludedCount: number;
  imagesByMycaItemId: Record<string, string>;
  imagesByItemId: Record<string, string>;
}

export interface BuybackUpdateRequest {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  imageBase64: string;
  displayDate: string;
  alt: string;
}

export interface SiteContent {
  buybackTable: {
    imageUrl: string;
    updatedAt: string;
    displayDate: string;
    alt: string;
    history: string[];
  };
}
