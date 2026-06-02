# Chrome Web Store提出チェック

作成日: 2026-06-01

## 必須

- [x] 拡張名
- [x] 短い説明
- [x] 詳細説明
- [x] アイコン
- [x] スクリーンショット
- [x] プライバシーポリシーURL
- [x] 単一目的の説明
- [x] 収集データの説明
- [x] 権限の説明
- [x] 提出用ZIP
- [x] 提出用Dashboard入力パケット
- [x] Extension package i18n
- [x] Worldwide distribution方針
- [x] Chrome Web Store draft作成
- [x] 多言語ZIP upload
- [x] Profile Vault暗号化保存
- [x] Dashboard Store Listing保存
- [x] Dashboard Privacy保存
- [x] Dashboard販売地域保存
- [x] Dashboardテスト手順保存

## 権限説明

`activeTab`: ユーザーが明示的に開いているフォームだけを解析するため。

`scripting`: ユーザー操作時だけcontent scriptを注入し、DOM収集と入力を行うため。

`storage`: 端末内プロフィール、設定、ライセンス、利用回数、サイト別マッピングを保存するため。

## ストア説明の芯

日本語フォームに強いAI自動入力ツールです。フォーム構造だけを解析し、氏名や住所などの実値は端末内のプロフィールから入力します。送信はユーザーが確認して行います。

詳細文面は `docs/12_chrome_store_listing_copy.md` を使います。
Dashboardへ貼る最終値は `docs/14_chrome_web_store_submission_packet.md` を使います。

## 作成済みアセット

- `extension/icons/icon16.png`
- `extension/icons/icon32.png`
- `extension/icons/icon48.png`
- `extension/icons/icon128.png`
- `store-assets/icon-128.png`
- `store-assets/promo-small-440x280.png`
- `store-assets/screenshot-main-1280x800.png`
- `store-assets/screenshot-popup-1280x800.png`
- `store-assets/screenshot-pricing-1280x800.png`
- `dist/ai-form-autofill-0.1.1.zip`
- `site/privacy.html`
- `site/terms.html`
- `docs/13_production_launch_runbook.md`
- `docs/14_chrome_web_store_submission_packet.md`
- `extension/_locales/*/messages.json` 21 locale分 / 152 message keys
  - `en`, `en_GB`, `ja`, `es`, `es_419`, `fr`, `de`, `it`, `nl`, `pl`, `pt_BR`, `ru`, `tr`, `ar`, `hi`, `id`, `th`, `vi`, `ko`, `zh_CN`, `zh_TW`

再生成:

```bash
npm run assets:store
npm run package:extension
npm run release:check
```

2026-06-02 09:47 JSTにUIUX改善/辞書登録強化/住所自動検索/電話番号3分割/空の初期値/Free月20回版ZIP `105168 bytes` を作成済み。本番schema API優先、国/国番号semantic key、拡張 `locale_context`、自由追加できる `custom.<key>`、呼び名つき登録台帳、第一画面の `登録 / 確認 / 入力` 3ステップ、ステップ表示の選択不可、`自動入力` 表示、見つけやすい `登録情報 / 登録台帳 / プラン` 入口、設定内の `登録情報 / 登録台帳 / プラン` タブ、台帳検索、種類、`会員番号` / `シート用語` / `案件ID` のクイック追加、フォーム確認で見つけた未登録項目をその場で台帳追加して追加行を強調する導線、郵便番号から住所を自動入力するZipCloud連携、初期値を空にして例をプレースホルダーに出す登録フォーム、保存後の `登録しました` 表示、Free月20回、152キー x 21 localeが入っている。`store-assets/screenshot-popup-1280x800.png` も辞書登録UI版へ更新済み。

Chrome Web Storeは2026-06-02 08:36 JST実測で公開済み。公開URLは `https://chromewebstore.google.com/detail/formpilot-vault/kmlcabffhmenjajmlnkkglphjnbaahlf`。2026-06-02 09:47 JSTに最新Free月20回版 `0.1.1` / `105168 bytes` をDashboardへuploadし、更新審査へ送信済み。Dashboard読み戻しは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`。

2026-06-02 11:48 JSTに、Free月20回を再固定したローカル最新ZIP `dist/ai-form-autofill-0.1.1.zip` / `105172 bytes` を再生成し、`npm test`、`npm run assets:store`、`npm run package:extension`、`npm run release:check` を通過した。このパスでは審査中Packageの差し替えuploadは未実行。CWS Dashboardで審査中Package差し替えが可能なら `105172 bytes` を差し替え、不可なら審査通過後に `0.1.2` で再提出する。

## 提出前の停止条件

- APIキーが拡張内にある
- 送信ボタンを自動クリックする
- 個人情報実値をAIへ送る
- プライバシーポリシーURLがない
- 公開問い合わせ先がない
- `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- 金融/医療/行政フォームで動作保証をうたっている

## 現在の人間停止点

- Chrome Web Storeは公開済み
- `0.1.1` 更新審査の差し戻し対応、または審査通過後の公開版読み戻し
- Stripeの実購入/入金確認
