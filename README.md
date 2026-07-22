# トレカfamily Webサイト

神戸・三宮のトレーディングカード専門店「トレカfamily」の公式Webサイトです。現在は静的サイトとしてGitHub Pagesで公開します。

## 公開構成

```text
docs/
├─ index.html          # トップページ
├─ inventory.html      # 在庫確認・カード検索
├─ support.js          # ページ表示・操作ロジック
├─ assets/             # 公開に必要な画像のみ
└─ .nojekyll           # GitHub Pages用設定
```

GitHub Pagesの公開元は `main` ブランチの `/docs` です。デザイン引き渡しファイルやローカル作業用ファイルは `.gitignore` で公開対象から除外しています。

現在は共有URLを知る方向けの確認期間として、各HTMLに `noindex` を設定し、検索エンジンへの掲載を抑止しています。これはパスワード保護ではないため、URLを知る方は閲覧できます。

## 初回公開手順

1. GitHubでリポジトリを作成します。
2. このフォルダをGitリポジトリとして初期化し、GitHubリポジトリを `origin` に登録します。
3. `main` ブランチへPushします。
4. GitHubのリポジトリで **Settings → Pages** を開きます。
5. **Deploy from a branch** を選び、Branchを `main`、Folderを `/docs` に設定して保存します。
6. 表示された公開URLでトップページと在庫検索ページを確認します。

## 更新手順

1. `docs/` 内のHTML、JavaScript、画像を更新します。
2. ローカルサーバーでPC・スマートフォン表示、リンク、コンソールエラー、404を確認します。
3. 変更内容をコミットし、`main` ブランチへPushします。
4. GitHub Pagesのデプロイ完了後、公開URLで再確認します。

## 検索掲載を開始する手順

1. `docs/index.html` と `docs/inventory.html` から `<meta name="robots" content="noindex, nofollow, noarchive">` を削除します。
2. 変更をコミットして `main` ブランチへPushします。
3. デプロイ後、必要に応じてGoogle Search Consoleからインデックス登録をリクエストします。

## ローカル確認

リポジトリ直下で任意の静的HTTPサーバーを起動し、`docs/` を公開ルートに指定します。HTMLファイルを直接開くのではなく、HTTP経由で確認してください。

## 将来の移行方針

- DMMマイカポスや在庫管理APIとの連携時は、APIキーをフロントエンドへ埋め込まず、サーバー側の環境変数で管理します。
- 動的機能を追加する際は、静的公開物の `docs/` と、アプリケーションソース・API層を分離します。
- 独自ドメイン導入時はGitHub Pagesのカスタムドメイン設定とDNSを利用できます。
- エックスサーバー等へ移行する場合も、`docs/` の静的ファイルを公開ディレクトリへ配置できる構成です。
- 認証情報、Personal Access Token、APIキー、`.env` はコミットしません。
