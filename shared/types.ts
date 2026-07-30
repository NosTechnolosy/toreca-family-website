export interface PublicInventoryItem {
  id: string;
  itemId: string;
  mycaItemId: string;
  name: string;
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

export interface ProductMasterPreview {
  itemId: string;
  mycaItemId: string;
  name: string;
  cardNumber: string;
  imageUrl: string;
}

export interface ProductMasterAnalysis {
  sourceFileName: string;
  encoding: "UTF-8" | "UTF-8 BOM" | "Shift_JIS";
  fileSize: number;
  importedCount: number;
  publishedCount: number;
  missingImageCount: number;
  invalidImageCount: number;
  otherErrorCount: number;
  publicProductMaster: ProductMaster;
  preview: ProductMasterPreview[];
}

export interface BuybackTableContent {
  imageUrl: string;
  updatedAt: string;
  displayDate: string;
  alt: string;
  history: string[];
}

export interface SiteContent {
  buybackTable: BuybackTableContent;
}

export interface ExcludedInventoryRow {
  line: number;
  id: string;
  name: string;
  condition: string;
  sellPrice: string;
  stockNumber: string;
  reasons: string[];
}

export interface InventoryAnalysis {
  sourceFileName: string;
  encoding: "UTF-8" | "UTF-8 BOM" | "Shift_JIS";
  fileSize: number;
  importedCount: number;
  publishedCount: number;
  stockExcludedCount: number;
  priceExcludedCount: number;
  otherErrorCount: number;
  warningCount: number;
  publicInventory: PublicInventory;
  publishedPreview: PublicInventoryItem[];
  excludedPreview: ExcludedInventoryRow[];
  errors: ExcludedInventoryRow[];
}
