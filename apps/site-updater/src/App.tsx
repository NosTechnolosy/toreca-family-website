import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  ExcludedInventoryRow,
  InventoryAnalysis,
  ProductMasterAnalysis
} from "../../../shared/types";

type Tab = "inventory" | "productMaster" | "buyback";
type UpdateResult = {
  message: string;
  updatedAt: string;
  publishedCount?: number;
  excludedCount?: number;
  displayDate?: string;
  matchedImageCount?: number;
  imageCount?: number;
};
type ConnectionStatus = { configured: boolean; apiUrl: string };
type ImageInfo = {
  path: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  warning: string | null;
  previewDataUrl: string;
};
type PublishedBuybackImage = {
  id: string;
  imageUrl: string;
  updatedAt: string;
  displayDate: string;
  alt: string;
};
type BuybackDraft = {
  id: string;
  existingUrl?: string;
  path?: string;
  previewUrl: string;
  fileName: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  warning?: string | null;
  displayDate: string;
  alt: string;
};

const PUBLIC_SITE_BASE = "https://nostechnolosy.github.io/toreca-family-website/";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch {
    return value;
  }
};

export default function App() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [productMaster, setProductMaster] = useState<ProductMasterAnalysis | null>(null);
  const [buybackImages, setBuybackImages] = useState<BuybackDraft[]>([]);
  const [buybackLoaded, setBuybackLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_UPDATE_API_URL ?? "");
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    invoke<ConnectionStatus>("connection_status")
      .then((status) => {
        setConnected(status.configured);
        if (status.apiUrl) setApiUrl(status.apiUrl);
      })
      .catch(() => undefined);

    let dispose: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type !== "drop" || !event.payload.paths[0]) return;
        const path = event.payload.paths[0];
        if (tab === "inventory") void parseCsv(path);
        else if (tab === "productMaster") void parseProductMaster(path);
        else void inspectImage(path);
      })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => undefined);
    return () => dispose?.();
  }, [tab]);

  useEffect(() => {
    if (tab !== "buyback" || !connected || buybackLoaded) return;
    void loadBuyback();
  }, [tab, connected, buybackLoaded]);

  const clearStatus = () => {
    setResult(null);
    setError("");
  };

  const parseCsv = async (path: string) => {
    clearStatus();
    setBusy(true);
    setProgress("CSVを確認しています…");
    try {
      const next = await invoke<InventoryAnalysis>("parse_inventory_csv", { path });
      setAnalysis(next);
    } catch (reason) {
      setAnalysis(null);
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const loadBuyback = async () => {
    setBusy(true);
    setProgress("登録中の買取表を読み込んでいます…");
    try {
      const response = await invoke<{ images: PublishedBuybackImage[] }>("get_buyback");
      setBuybackImages(response.images.slice(0, 5).map((item) => ({
        id: item.id,
        existingUrl: item.imageUrl,
        previewUrl: new URL(item.imageUrl.replace(/^\.\//, ""), PUBLIC_SITE_BASE).href,
        fileName: item.imageUrl.split("/").pop() || "登録済み画像",
        displayDate: item.displayDate.replaceAll("/", "-"),
        alt: item.alt
      })));
      setBuybackLoaded(true);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const inspectImage = async (path: string, replaceIndex?: number) => {
    clearStatus();
    if (replaceIndex === undefined && buybackImages.length >= 5) {
      setError("買取表は最大5枚まで登録できます");
      return;
    }
    setBusy(true);
    setProgress("画像を確認しています…");
    try {
      const info = await invoke<ImageInfo>("inspect_buyback_image", { path });
      const draft: BuybackDraft = {
        id: replaceIndex === undefined
          ? `buyback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          : buybackImages[replaceIndex].id,
        existingUrl: replaceIndex === undefined ? undefined : buybackImages[replaceIndex].existingUrl,
        path: info.path,
        previewUrl: info.previewDataUrl,
        fileName: info.fileName,
        mimeType: info.mimeType,
        width: info.width,
        height: info.height,
        fileSize: info.fileSize,
        warning: info.warning,
        displayDate: replaceIndex === undefined
          ? new Date().toISOString().slice(0, 10)
          : buybackImages[replaceIndex].displayDate,
        alt: replaceIndex === undefined
          ? "トレカfamily 最新買取表"
          : buybackImages[replaceIndex].alt
      };
      setBuybackImages((current) => {
        if (replaceIndex === undefined) return [...current, draft].slice(0, 5);
        return current.map((item, index) => index === replaceIndex ? draft : item);
      });
      setBuybackLoaded(true);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const parseProductMaster = async (path: string) => {
    clearStatus();
    setBusy(true);
    setProgress("商品マスタCSVを確認しています…");
    try {
      const next = await invoke<ProductMasterAnalysis>("parse_product_master_csv", { path });
      setProductMaster(next);
    } catch (reason) {
      setProductMaster(null);
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const chooseCsv = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "在庫CSV", extensions: ["csv"] }]
    });
    if (typeof path === "string") await parseCsv(path);
  };

  const chooseImage = async (replaceIndex?: number) => {
    if (replaceIndex === undefined && buybackImages.length >= 5) {
      setError("買取表は最大5枚まで登録できます");
      return;
    }
    const path = await open({
      multiple: false,
      filters: [{ name: "買取表画像", extensions: ["jpg", "jpeg", "png", "webp"] }]
    });
    if (typeof path === "string") await inspectImage(path, replaceIndex);
  };

  const chooseProductMaster = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "商品マスタCSV", extensions: ["csv"] }]
    });
    if (typeof path === "string") await parseProductMaster(path);
  };

  const updateInventory = async () => {
    if (!analysis || busy) return;
    clearStatus();
    setBusy(true);
    setProgress("在庫データを送信しています…");
    try {
      setResult(
        await invoke<UpdateResult>("update_inventory", {
          inventory: analysis.publicInventory
        })
      );
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const updateBuyback = async () => {
    if (busy || buybackImages.some((image) => !image.displayDate || !image.alt.trim())) return;
    clearStatus();
    setBusy(true);
    setProgress("買取表を送信しています…");
    try {
      const nextResult = await invoke<UpdateResult>("update_buyback", {
        images: buybackImages.map((image) => ({
          id: image.id,
          existingUrl: image.existingUrl,
          path: image.path,
          displayDate: image.displayDate,
          alt: image.alt.trim()
        }))
      });
      setResult(nextResult);
      setBuybackLoaded(false);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const updateBuybackDraft = (index: number, patch: Partial<BuybackDraft>) => {
    setBuybackImages((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    ));
  };

  const moveBuyback = (index: number, direction: -1 | 1) => {
    setBuybackImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBuyback = (index: number) => {
    if (!window.confirm(`買取表${index + 1}を一覧から削除しますか？\n「Webサイトに反映する」までは公開サイトに影響しません。`)) return;
    setBuybackImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateProductMaster = async () => {
    if (!productMaster || busy) return;
    clearStatus();
    setBusy(true);
    setProgress("商品マスタを送信しています…（データ量により数分かかります）");
    try {
      setResult(
        await invoke<UpdateResult>("update_product_master", {
          productMaster: productMaster.publicProductMaster
        })
      );
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const exportErrors = async () => {
    if (!analysis?.errors.length) return;
    const path = await save({
      defaultPath: "在庫CSV_除外データ.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });
    if (!path) return;
    try {
      await invoke("export_inventory_errors", {
        path,
        errors: analysis.errors
      });
    } catch (reason) {
      setError(String(reason));
    }
  };

  const saveSettings = async () => {
    setBusy(true);
    setError("");
    try {
      await invoke("save_connection", { apiUrl: apiUrl.trim(), apiKey });
      setConnected(true);
      setApiKey("");
      setSettingsOpen(false);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(
    () =>
      analysis
        ? [
            ["CSV読込件数", analysis.importedCount],
            ["公開対象", analysis.publishedCount],
            ["在庫数による除外", analysis.stockExcludedCount],
            ["販売価格による除外", analysis.priceExcludedCount],
            ["その他のエラー", analysis.otherErrorCount],
            ["警告", analysis.warningCount]
          ]
        : [],
    [analysis]
  );

  return (
    <main>
      <header className="app-header">
        <div>
          <span className="eyebrow">STORE OPERATIONS</span>
          <h1>トレカfamily サイト更新</h1>
          <p>内容を確認してから、公開サイトを安全に更新できます。</p>
        </div>
        <button className="settings-button" onClick={() => setSettingsOpen(true)}>
          接続設定
          <span className={connected ? "status-dot connected" : "status-dot"} />
        </button>
      </header>

      <nav className="tabs" aria-label="更新内容">
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>
          在庫更新
        </button>
        <button className={tab === "productMaster" ? "active" : ""} onClick={() => setTab("productMaster")}>
          商品マスタ更新
        </button>
        <button className={tab === "buyback" ? "active" : ""} onClick={() => setTab("buyback")}>
          買取表更新
        </button>
      </nav>

      {tab === "inventory" ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="step">STEP 1</span>
              <h2>在庫CSVを読み込む</h2>
            </div>
            <p>ファイルを選んだだけでは、サイトは更新されません。</p>
          </div>
          <button className="drop-zone" onClick={chooseCsv} disabled={busy}>
            <strong>ここに在庫CSVをドロップ</strong>
            <span>または</span>
            <em>CSVファイルを選択</em>
          </button>

          {analysis && (
            <>
              <div className="file-summary">
                <div><span>ファイル名</span><strong>{analysis.sourceFileName}</strong></div>
                <div><span>ファイル容量</span><strong>{formatBytes(analysis.fileSize)}</strong></div>
                <div><span>文字コード</span><strong>{analysis.encoding}</strong></div>
              </div>
              <div className="stats-grid">
                {stats.map(([label, value]) => (
                  <div className="stat" key={String(label)}>
                    <span>{label}</span>
                    <strong>{Number(value).toLocaleString()}件</strong>
                  </div>
                ))}
              </div>

              <PreviewTable
                title="公開されるデータの一部"
                rows={analysis.publishedPreview.map((item) => ({
                  id: item.id,
                  name: item.name,
                  condition: item.condition,
                  price: `¥${item.price.toLocaleString()}`,
                  stock: String(item.stock),
                  reason: "公開対象"
                }))}
              />
              {analysis.excludedPreview.length > 0 && (
                <PreviewTable
                  title="除外データの例（最大20件）"
                  rows={analysis.excludedPreview.map((item) => ({
                    id: item.id,
                    name: item.name,
                    condition: item.condition,
                    price: item.sellPrice || "未入力",
                    stock: item.stockNumber || "未入力",
                    reason: item.reasons.join("／")
                  }))}
                />
              )}
              <div className="actions">
                <button className="secondary" onClick={exportErrors} disabled={!analysis.errors.length || busy}>
                  エラー詳細をCSVで保存
                </button>
                <button className="primary" onClick={updateInventory} disabled={busy || !connected}>
                  サイトの在庫を更新する
                </button>
              </div>
            </>
          )}
        </section>
      ) : tab === "productMaster" ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="step">STEP 1</span>
              <h2>商品マスタCSVを読み込む</h2>
            </div>
            <p>画像URLと商品IDだけを安全に抽出します。</p>
          </div>
          <button className="drop-zone" onClick={chooseProductMaster} disabled={busy}>
            <strong>ここに商品マスタCSVをドロップ</strong>
            <span>または</span>
            <em>商品マスタCSVを選択</em>
          </button>

          {productMaster && (
            <>
              <div className="file-summary">
                <div><span>ファイル名</span><strong>{productMaster.sourceFileName}</strong></div>
                <div><span>ファイル容量</span><strong>{formatBytes(productMaster.fileSize)}</strong></div>
                <div><span>文字コード</span><strong>{productMaster.encoding}</strong></div>
              </div>
              <div className="stats-grid product-master-stats">
                <div className="stat"><span>CSV読込件数</span><strong>{productMaster.importedCount.toLocaleString()}件</strong></div>
                <div className="stat"><span>有効な画像</span><strong>{productMaster.publishedCount.toLocaleString()}件</strong></div>
                <div className="stat"><span>画像URLなし</span><strong>{productMaster.missingImageCount.toLocaleString()}件</strong></div>
                <div className="stat"><span>不正な画像URL</span><strong>{productMaster.invalidImageCount.toLocaleString()}件</strong></div>
                <div className="stat"><span>その他のエラー</span><strong>{productMaster.otherErrorCount.toLocaleString()}件</strong></div>
              </div>
              <ProductMasterPreview rows={productMaster.preview} />
              <div className="actions end">
                <button className="primary" onClick={updateProductMaster} disabled={busy || !connected}>
                  商品マスタを更新する
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="step">買取表管理</span>
              <h2>現在の登録枚数：{buybackImages.length} / 5枚</h2>
            </div>
            <p>表示順の変更後に、まとめてWebサイトへ反映します。</p>
          </div>
          {!buybackLoaded && connected && !busy && (
            <button className="secondary" onClick={() => void loadBuyback()}>登録内容を再読み込み</button>
          )}

          <div className="buyback-list">
            {buybackImages.map((image, index) => (
              <article className="buyback-item" key={image.id}>
                <div className="buyback-item-heading">
                  <h3>買取表{index + 1}</h3>
                  <span>{index + 1} / {buybackImages.length}</span>
                </div>
                <div className="buyback-layout">
                  <img src={image.previewUrl} alt={`買取表${index + 1}のプレビュー`} />
                  <div className="image-details">
                    <dl>
                      <div><dt>ファイル名</dt><dd>{image.fileName}</dd></div>
                      {image.mimeType && <div><dt>画像形式</dt><dd>{image.mimeType}</dd></div>}
                      {image.width && image.height && <div><dt>サイズ</dt><dd>{image.width} × {image.height}px</dd></div>}
                      {image.fileSize !== undefined && <div><dt>ファイル容量</dt><dd>{formatBytes(image.fileSize)}</dd></div>}
                    </dl>
                    {image.warning && <p className="warning">{image.warning}</p>}
                    <label>
                      <span>表示上の更新日</span>
                      <input type="date" value={image.displayDate} onChange={(event) => updateBuybackDraft(index, { displayDate: event.target.value })} />
                    </label>
                    <label>
                      <span>画像の説明</span>
                      <input value={image.alt} maxLength={120} onChange={(event) => updateBuybackDraft(index, { alt: event.target.value })} />
                    </label>
                    <div className="buyback-item-actions">
                      <button className="secondary" onClick={() => void chooseImage(index)} disabled={busy}>画像を変更</button>
                      <button className="secondary" onClick={() => moveBuyback(index, -1)} disabled={busy || index === 0}>上へ</button>
                      <button className="secondary" onClick={() => moveBuyback(index, 1)} disabled={busy || index === buybackImages.length - 1}>下へ</button>
                      <button className="danger" onClick={() => removeBuyback(index)} disabled={busy}>削除</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {buybackImages.length < 5 ? (
            <button className="drop-zone buyback-add" onClick={() => void chooseImage()} disabled={busy}>
              <strong>＋ 買取表画像を追加</strong>
              <span>JPG・PNG・WebP／最大8MB</span>
              <em>画像を選択</em>
            </button>
          ) : (
            <p className="limit-message">買取表は最大5枚まで登録できます</p>
          )}

          <div className="actions end">
            <button className="primary" onClick={updateBuyback} disabled={busy || !connected || buybackImages.some((item) => !item.displayDate || !item.alt.trim())}>
              Webサイトに反映する
            </button>
          </div>
        </section>
      )}

      {progress && <div className="notice progress"><span className="spinner" />{progress}</div>}
      {error && <div className="notice error"><strong>更新できませんでした。</strong><span>{error}</span></div>}
      {result && (
        <div className="notice success">
          <strong>{result.message}</strong>
          {result.publishedCount !== undefined && (
            <span>公開対象：{result.publishedCount.toLocaleString()}件　除外：{result.excludedCount?.toLocaleString()}件</span>
          )}
          {result.displayDate && <span>更新日：{result.displayDate}</span>}
          {result.matchedImageCount !== undefined && (
            <span>在庫画像との照合：{result.matchedImageCount.toLocaleString()}件</span>
          )}
          {result.imageCount !== undefined && <span>公開する買取表：{result.imageCount}枚</span>}
          <span>更新日時：{formatDateTime(result.updatedAt)}</span>
          <small>公開サイトへの反映には数分かかる場合があります。</small>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setSettingsOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(e) => e.stopPropagation()}>
            <h2 id="settings-title">接続設定</h2>
            <p>初回設定時に管理者から案内された内容を入力してください。</p>
            <label><span>接続先</span><input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://…" /></label>
            <label><span>接続キー</span><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="new-password" /></label>
            <div className="actions end">
              <button className="secondary" onClick={() => setSettingsOpen(false)} disabled={busy}>キャンセル</button>
              <button className="primary" onClick={saveSettings} disabled={busy || !apiUrl.trim() || !apiKey}>保存</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function PreviewTable({
  title,
  rows
}: {
  title: string;
  rows: Array<{
    id: string;
    name: string;
    condition: string;
    price: string;
    stock: string;
    reason: string;
  }>;
}) {
  return (
    <div className="preview">
      <h3>{title}</h3>
      <div className="table-scroll">
        <table>
          <thead><tr><th>在庫ID</th><th>商品名</th><th>状態</th><th>販売価格</th><th>在庫数</th><th>判定</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id}-${index}`}>
                <td>{row.id || "—"}</td>
                <td>{row.name || "—"}</td>
                <td>{row.condition || "—"}</td>
                <td>{row.price}</td>
                <td>{row.stock}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductMasterPreview({
  rows
}: {
  rows: ProductMasterAnalysis["preview"];
}) {
  return (
    <div className="preview">
      <h3>登録される画像の一部</h3>
      <div className="table-scroll">
        <table className="product-master-table">
          <thead><tr><th>画像</th><th>商品マスタID</th><th>Myca ID</th><th>商品名</th><th>カード番号</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.mycaItemId}-${row.itemId}`}>
                <td><img src={row.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /></td>
                <td>{row.itemId || "—"}</td>
                <td>{row.mycaItemId || "—"}</td>
                <td>{row.name || "—"}</td>
                <td>{row.cardNumber || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
