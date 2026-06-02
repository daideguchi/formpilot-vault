# SEO Launch Plan

作成日: 2026-06-01
対象: `FormPilot Vault`
状態: `implemented`

## 目的

検索流入から課金へつなげる。初期は大きな一般ワードだけを狙わず、実際に困っている人が検索しやすい「フォーム入力」「フォーム自動入力」「Chrome拡張」「AI自動入力」と、英語の「form autofill」「AI form autofill」「Chrome extension」を狙う。

## 対象ページ

- 英語トップ: `https://formpilot-vault-api.vercel.app/`
- 日本語SEOページ: `https://formpilot-vault-api.vercel.app/ja`
- robots: `https://formpilot-vault-api.vercel.app/robots.txt`
- sitemap: `https://formpilot-vault-api.vercel.app/sitemap.xml`

## 実装済み

- 英語/日本語の静的titleとmeta description
- canonical URL
- `hreflang="en"`, `hreflang="ja"`, `hreflang="x-default"`
- Open Graph / Twitter card
- `SoftwareApplication`, `WebSite`, `Organization` のJSON-LD
- `robots.txt` からsitemapを案内
- `sitemap.xml` に主要ページを収録
- 日本語本文に自然な検索意図コピーを追加
- 英語本文に自然な検索意図コピーを追加
- `npm run check:seo` で検証
- Google Search Console URL prefix所有権確認
- Google Search Console sitemap送信

## Search Console 状態

2026-06-02 10:07 JSTに `https://formpilot-vault-api.vercel.app/` をURL prefixで追加し、HTML file `google429836ef33603a29.html` で所有権確認済み。

`/sitemap.xml` はSearch Consoleへ送信済み。ただし初回読み込みステータスは `取得できませんでした`。外部HTTP確認では、Googlebot User-Agentでも `https://formpilot-vault-api.vercel.app/sitemap.xml` はHTTP 200 / `application/xml`。後続でSearch Console側の再取得結果を確認する。

## 重要キーワード

日本語:

- フォーム入力
- フォーム自動入力
- Chrome拡張
- AI自動入力
- 会員登録 自動入力
- 問い合わせフォーム 自動入力
- 資料請求フォーム 自動入力

英語:

- form autofill
- AI form autofill
- Chrome extension form autofill
- signup form autofill
- contact form autofill
- encrypted local Vault

## 方針

検索順位は即日で保証できない。まずGoogleが理解しやすい公開面を作り、公開後はSearch Consoleでsitemap登録、URL検査、検索クエリ確認を行う。LP本文はキーワード詰め込みにせず、フォーム入力の手間、AIによる項目理解、暗号化Vault、人間確認、送信しない安全性を一貫して説明する。

## 確認コマンド

```bash
npm run check:seo
npm run check:seo -- --live
npm run check:production
```

Chrome Web Store公開後:

```bash
npm run check:launch -- --require-published
```

実購入後:

```bash
AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:launch -- --require-paid-license
```
