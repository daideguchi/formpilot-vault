# Chrome Web Store提出チェック

作成日: 2026-06-01

## 必須

- [x] 拡張名
- [x] 短い説明
- [x] 詳細説明
- [x] アイコン
- [x] スクリーンショット
- [ ] プライバシーポリシーURL
- [x] 単一目的の説明
- [x] 収集データの説明
- [x] 権限の説明
- [x] 提出用ZIP

## 権限説明

`activeTab`: ユーザーが明示的に開いているフォームだけを解析するため。

`scripting`: ユーザー操作時だけcontent scriptを注入し、DOM収集と入力を行うため。

`storage`: 端末内プロフィール、設定、サイト別マッピングを保存するため。

## ストア説明の芯

日本語フォームに強いAI自動入力ツールです。フォーム構造だけを解析し、氏名や住所などの実値は端末内のプロフィールから入力します。送信はユーザーが確認して行います。

詳細文面は `docs/12_chrome_store_listing_copy.md` を使います。

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

再生成:

```bash
npm run assets:store
npm run package:extension
npm run release:check
```

## 提出前の停止条件

- APIキーが拡張内にある
- 送信ボタンを自動クリックする
- 個人情報実値をAIへ送る
- プライバシーポリシーURLがない
- 公開問い合わせ先がない
- `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- 金融/医療/行政フォームで動作保証をうたっている
