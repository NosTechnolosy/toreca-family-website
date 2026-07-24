import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  ExcludedInventoryRow,
  InventoryAnalysis
} from "../../../shared/types";

type Tab = "inventory" | "buyback";
type UpdateResult = {
  message: string;
  updatedAt: string;
  publishedCount?: number;
  excludedCount?: number;
  displayDate?: string;
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

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value))
    : "—";

export default function App() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [displayDate, setDisplayDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [alt, setAlt] = useState("トレカfamily 最新買取表");
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
        else void inspectImage(path);
      })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => undefined);
    return () => dispose?.();
  }, [tab]);

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

  const inspectImage = async (path: string) => {
    clearStatus();
    setBusy(true);
    setProgress("画像を確認しています…");
    try {
      setImage(await invoke<ImageInfo>("inspect_buyback_image", { path }));
    } catch (reason) {
      setImage(null);
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

  const chooseImage = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "買取表画像", extensions: ["jpg", "jpeg", "png", "webp"] }]
    });
    if (typeof path === "string") await inspectImage(path);
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
    if (!image || !displayDate || !alt.trim() || busy) return;
    clearStatus();
    setBusy(true);
    setProgress("買取表を送信しています…");
    try {
      setResult(
        await invoke<UpdateResult>("update_buyback", {
          path: image.path,
          displayDate,
          alt: alt.trim()
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
      ) : (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="step">STEP 1</span>
              <h2>買取表画像を選ぶ</h2>
            </div>
            <p>JPG・PNG・WebPに対応しています。</p>
          </div>
          <button className="drop-zone" onClick={chooseImage} disabled={busy}>
            <strong>ここに買取表画像をドロップ</strong>
            <span>または</span>
            <em>画像を選択</em>
          </button>

          {image && (
            <>
              <div className="buyback-layout">
                <img src={image.previewDataUrl} alt="選択した買取表のプレビュー" />
                <div className="image-details">
                  <dl>
                    <div><dt>ファイル名</dt><dd>{image.fileName}</dd></div>
                    <div><dt>画像形式</dt><dd>{image.mimeType}</dd></div>
                    <div><dt>サイズ</dt><dd>{image.width} × {image.height}px</dd></div>
                    <div><dt>ファイル容量</dt><dd>{formatBytes(image.fileSize)}</dd></div>
                  </dl>
                  {image.warning && <p className="warning">{image.warning}</p>}
                  <label>
                    <span>表示上の更新日</span>
                    <input type="date" value={displayDate} onChange={(event) => setDisplayDate(event.target.value)} />
                  </label>
                  <label>
                    <span>画像の説明</span>
                    <input value={alt} maxLength={120} onChange={(event) => setAlt(event.target.value)} />
                  </label>
                </div>
              </div>
              <div className="actions end">
                <button className="primary" onClick={updateBuyback} disabled={busy || !connected || !alt.trim()}>
                  買取表を更新する
                </button>
              </div>
            </>
          )}
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
