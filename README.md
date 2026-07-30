# トレカfamily Webサイト・店舗用更新アプリ

「トレカfamily」の公開サイト、店舗スタッフ用Windowsアプリ、更新APIを同じリポジトリで管理します。

店舗スタッフが使う機能は次の3つです。

1. 在庫CSVの確認と公開
2. 商品マスタCSVの画像URL確認と公開
3. 買取表画像の確認と公開

WindowsアプリにGitHubトークンは保存しません。アプリはHTTPSでCloudflare Workersへ送信し、WorkerだけがGitHubへ書き込みます。

## 全体構成

```text
Windowsアプリ（Tauri 2 + React）
  └─ HTTPS / X-App-Key
       ↓
Cloudflare Worker
  ├─ 認証・サイズ制限・内容の再検証・レート制限
  └─ GitHub API（トークンはCloudflare Secretのみ）
       ↓
GitHubテストブランチ／main
  └─ docs/data/*.json と docs/assets/buyback/*
       ↓
GitHub Pages
```

```text
apps/site-updater/       Windows更新アプリ
worker/                  Cloudflare Workers更新API
shared/                  公開JSONとアプリ間の型定義
data/product-master.json 商品IDと画像URLの照合データ（Pagesでは非公開）
docs/                    GitHub Pages公開物
  data/inventory.json    公開対象だけの在庫
  data/site-content.json 最新買取表の情報
  assets/buyback/        更新アプリから追加される買取表
tests/                   CSV・画像・ブラウザ確認用データ
manual/                  店舗スタッフ向けマニュアル
```

## 現在のサイト構成と変更理由

既存サイトはビルド不要の静的HTML・CSS・JavaScriptで、GitHub Pagesは `main` ブランチの `/docs` を公開します。既存の配色、余白、カード表現、日英切替、ページ内リンクは維持しています。

以前の在庫ページは固定のダミー商品12件をJavaScript内に持ち、ブランド、価格帯、在庫状態で絞り込む構成でした。添付CSVには商品画像URLやブランド専用列がなく、在庫なし商品も公開しない要件のため、次のように変更しました。

- 削除: ダミー商品、固定価格、価格帯、在庫状態、画像がある前提の表示
- 追加: 実在庫JSON読込、商品名／カード番号検索、ジャンル／カテゴリ絞り込み、状態、カード番号、レアリティ、パック名、最終更新日時
- 表示: 在庫数は公開せず「在庫あり」、価格は3桁区切り
- 画像: 商品マスタのMyca ID（なければ商品マスタID）で照合し、HTTPS画像URLがある商品だけ実画像を表示
- 速度: 初回は24件だけDOMへ表示し、「さらに表示」で24件ずつ追加
- 安全性: CSV由来の文字列はテンプレートのテキストとして描画し、`innerHTML` へ渡さない

トップページの買取表は `docs/content-loader.js` が `docs/data/site-content.json` を読み、画像URL、表示日、代替テキストを差し替えます。新しい画像名には日時を含めるため、ブラウザに古い画像が残りにくい構成です。Workerは最新5件だけを残します。

## 添付CSVの確認結果

`stock_1784863558.csv` を4行目のシステム列名から解析した結果です。

| 項目 | 件数 |
|---|---:|
| CSVデータ行 | 2,046 |
| 公開対象 | 442 |
| 除外 | 1,604 |
| 在庫数による除外 | 0 |
| 販売価格による除外 | 1,604 |
| その他のエラー | 0 |

公開条件は必ず `stock_number > 0 AND sell_price > 0` です。`specific_sell_price` は判定にも公開価格にも使用しません。添付CSVの除外1,604件はすべて `sell_price` が0であることを確認しています。

## 商品マスタCSVの確認結果

`item_260724_1784818980.csv` から、公開に必要な商品ID・Myca ID・画像URLだけを抽出します。

| 項目 | 件数 |
|---|---:|
| CSVデータ行 | 79,818 |
| 有効なHTTPS画像URL | 79,700 |
| 画像URLなし | 118 |
| 不正な画像URL | 0 |
| 現在の在庫と画像が一致 | 392 / 442 |

商品マスタ全体は在庫ページから直接読み込みません。Workerが更新時に在庫へ画像URLを付与するため、ページ表示が重くならない構成です。残り50件は商品マスタ側に画像URLがない商品で、従来の「NO IMAGE」表示になります。

## 必要な開発環境

- Windows 10または11
- Node.js 20以降
- pnpm 10以降
- Rust stable（MSVC）
- Microsoft C++ Build Tools（Desktop development with C++）
- Microsoft Edge WebView2
- Cloudflareアカウント
- 対象リポジトリだけにアクセスできるGitHub fine-grained personal access token

TauriのWindows要件は [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) を参照してください。

## 初回セットアップ

PowerShellでリポジトリ直下へ移動し、依存関係を取得します。

```powershell
pnpm install
```

サンプル設定をコピーします。実値を入れたファイルはGitへ追加されません。

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

## Windowsアプリの開発起動

画面だけを確認する場合:

```powershell
pnpm dev:updater
```

CSV解析・画像確認・Windows資格情報保存まで含めて起動する場合:

```powershell
pnpm tauri:dev
```

初回はアプリ右上の「接続設定」で、Worker URLと接続キーを登録します。接続先URLだけをアプリ設定フォルダへ保存し、接続キーはWindows資格情報マネージャーへ保存します。

## Windowsインストーラーの作成

```powershell
pnpm tauri:build
```

成功すると、通常は次に生成されます。

```text
apps/site-updater/src-tauri/target/release/bundle/msi/
apps/site-updater/src-tauri/target/release/bundle/nsis/
```

店舗PCへの正式配布は、生成後も安定して保持されるMSI版を推奨します。NSIS版は環境によってWindowsの保護機能により隔離される場合があります。その場合は保護機能を無効化せず、MSI版を使用してください。コード署名証明書を導入するまでは、Windowsが発行元確認を表示する場合があります。

## ローカルのモックAPIで確認

ターミナル1:

```powershell
pnpm --filter @toreca-family/update-worker mock
```

ターミナル2:

```powershell
pnpm tauri:dev
```

アプリの接続設定:

```text
接続先: http://127.0.0.1:8787
接続キー: local-test-key-change-before-production
```

モックAPIはGitHubや公開サイトを変更せず、受信内容の検証と成功応答だけを行います。

## Cloudflare Workerの設定

初回導入時はGitHubで `test/site-updater` ブランチを作り、テストブランチで動作確認してから `main` へ切り替えます。現在の設定は確認済みのため、本番の `main` ブランチを更新します。

### 1. GitHubトークン

GitHubの **Settings → Developer settings → Personal access tokens → Fine-grained tokens** で作成します。

- Repository access: `nostechnolosy/toreca-family-website` のみ
- Repository permissions → Contents: Read and write
- 有効期限: 運用に必要な最短期間
- Metadata: 自動でRead-only

トークンをソース、README、チャット、Windowsアプリへ貼り付けないでください。

### 2. 通常変数

Cloudflare DashboardのWorker設定で登録します。

```text
GITHUB_OWNER=nostechnolosy
GITHUB_REPO=toreca-family-website
GITHUB_BRANCH=main
ALLOWED_ORIGIN=tauri://localhost,http://tauri.localhost,https://tauri.localhost
```

### 3. Secrets

ランダムな接続キーは最低32文字を推奨します。

```powershell
pnpm --filter @toreca-family/update-worker exec wrangler secret put GITHUB_TOKEN
pnpm --filter @toreca-family/update-worker exec wrangler secret put APP_API_KEY
```

入力内容は画面に表示されず、Gitへも保存されません。

### 4. Workerを公開

```powershell
pnpm --filter @toreca-family/update-worker deploy
```

確認:

```powershell
Invoke-RestMethod https://＜WorkerのURL＞/api/health
```

`ok: true` が返れば接続先をWindowsアプリへ登録します。

## テスト環境から本番へ切り替える

1. 添付CSVをアプリで解析し、2,046件／公開442件／除外1,604件になることを確認します。
2. テスト用買取表画像を送信します。
3. GitHubの `test/site-updater` ブランチで、在庫更新が `docs/data/inventory.json` だけを変更することを確認します。
4. 買取表更新が新画像と `docs/data/site-content.json` を同じ1コミットで変更し、在庫JSONを変更しないことを確認します。
5. テストブランチをローカルまたは一時Pages環境でPC／スマートフォン確認します。
6. 管理者がWorkerの `GITHUB_BRANCH` を `main` へ変更します。
7. Workerを再デプロイし、少量の管理されたデータで最終確認します。

本番公開後は `main` が更新対象です。新機能の検証時は再び `test/site-updater` などのテストブランチへ切り替え、人間の確認後に本番へ戻してください。

## GitHub Pages

公開元は `main` / `/docs` です。

1. GitHubで **Settings → Pages**
2. Sourceを **Deploy from a branch**
3. Branchを `main`、Folderを `/docs`
4. 公開URL `https://nostechnolosy.github.io/toreca-family-website/` を確認

現在はHTMLの `noindex` により検索掲載を抑止しています。これはアクセス制限ではなく、URLを知る人は閲覧できます。

## 自動テスト

```powershell
pnpm --filter @toreca-family/site-updater typecheck
pnpm --filter @toreca-family/update-worker typecheck
pnpm --filter @toreca-family/update-worker test
pnpm --filter @toreca-family/site-updater build
cd apps/site-updater/src-tauri
cargo test
```

RustテストにはUTF-8、BOM、Shift_JIS、説明行、引用符内のカンマと改行、空CSV、不足列、不正数値、価格0、在庫0、`specific_sell_price` の不使用、重複ID、`upload_error`、10,000件CSVを含みます。Workerテストには画像形式／容量、認証失敗、GitHub失敗、GitHub競合を含みます。

## 公開前チェック

- `docs/data/inventory.json` に価格0・在庫0・内部管理情報がない
- 初回表示が24件で、全442件を一度にDOMへ作らない
- 商品名／カード番号検索、ジャンル／カテゴリ絞り込みが動く
- 0件、読込中、取得失敗の表示がある
- 画像なし商品でもレイアウトが崩れない
- 買取表画像URLがGitHub Pagesのサブディレクトリで解決できる
- PC幅と390px幅で横スクロールがない
- コンソールエラー、404、リンク切れがない
- `.env`、`.dev.vars`、GitHubトークン、接続キーがコミット対象にない

## 更新失敗時の復旧

アプリが失敗を表示した場合、成功扱いにせず、まず通信と接続設定を確認します。Workerは新しいGitコミットとブランチ参照の更新が完了するまで公開データを切り替えません。競合時は既存データを維持してHTTP 409を返します。

誤った内容を正常に公開してしまった場合:

1. Windowsアプリから直前の正しいCSVまたは画像を再送します。
2. 再送できない場合は、管理者がGitHubで直前の正常コミットの内容を復元する新しいコミットを作成します。
3. GitHub Pagesのデプロイ完了を確認します。
4. WorkerのSecretを漏えいした疑いがある場合は、GitHubトークンと `APP_API_KEY` を即時ローテーションします。

店舗スタッフ向けの操作だけをまとめた手順は [manual/STAFF_GUIDE.md](manual/STAFF_GUIDE.md) を参照してください。

## 将来の拡張

公開サイト、更新アプリ、更新APIを分離しているため、DMMマイカポス連携、在庫管理システム、独自ドメイン、エックスサーバー等へ段階的に移行できます。外部APIキーは引き続きサーバー側Secretで管理し、公開JSONには表示に必要な最小情報だけを含めます。
