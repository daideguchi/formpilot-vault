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
- `dist/ai-form-autofill-0.1.0.zip`
- `site/privacy.html`
- `site/terms.html`
- `docs/13_production_launch_runbook.md`
- `docs/14_chrome_web_store_submission_packet.md`
- `extension/_locales/*/messages.json` 21 locale分 / 65 message keys
  - `en`, `en_GB`, `ja`, `es`, `es_419`, `fr`, `de`, `it`, `nl`, `pl`, `pt_BR`, `ru`, `tr`, `ar`, `hi`, `id`, `th`, `vi`, `ko`, `zh_CN`, `zh_TW`

再生成:

```bash
npm run assets:store
npm run package:extension
npm run release:check
```

2026-06-01 13:35 JSTに最新ZIP `69309 bytes` をChrome Web Store draftへ再upload済み。本番schema API優先、国/国番号semantic key、拡張 `locale_context`、65キー x 21 localeが入っている。

## 提出前の停止条件

- APIキーが拡張内にある
- 送信ボタンを自動クリックする
- 個人情報実値をAIへ送る
- プライバシーポリシーURLがない
- 公開問い合わせ先がない
- `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- 金融/医療/行政フォームで動作保証をうたっている

## 現在の人間停止点

- 最終 `Submit for Review`
- 審査中/審査後に本人確認、公開確認、差し戻し対応が出た場合の承認
