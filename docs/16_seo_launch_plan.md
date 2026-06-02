# SEO Launch Plan

作成日: 2026-06-01
対象: `FormPilot Vault`
状態: `implemented`

## 目的

検索流入から課金へつなげる。初期は大きな一般ワードだけを狙わず、実際に困っている人が検索しやすい「フォーム入力」「フォーム自動入力」「Chrome拡張」「AI自動入力」と、英語の「form autofill」「AI form autofill」「Chrome extension」を狙う。

## 対象ページ

- 英語トップ: `https://formpilot-vault-api.vercel.app/`
- 日本語SEOページ: `https://formpilot-vault-api.vercel.app/ja`
- フォーム入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/form-input`
- フォーム自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/form-autofill`
- 会員登録自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/signup-autofill`
- 問い合わせフォーム自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/contact-form-autofill`
- 公開ミラー: `https://daideguchi.github.io/formpilot-vault/form-input.html`
- robots: `https://formpilot-vault-api.vercel.app/robots.txt`
- sitemap: `https://formpilot-vault-api.vercel.app/sitemap.xml`

## 実装済み

- 英語/日本語の静的titleとmeta description
- 日本語SEO専用ページ `/form-input`
- 日本語ロングテールSEOページ `/form-autofill`, `/signup-autofill`, `/contact-form-autofill`
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

2026-06-02 10:21 JSTに `https://formpilot-vault-api.vercel.app/form-input` を追加。狙う検索意図は `フォーム入力`、`フォーム自動入力`、`会員登録 自動入力`、`問い合わせフォーム 自動入力`。Search Console URL検査では `URL が Google に登録されていません`。インデックス登録リクエストは日次割り当て超過のため、明日以降に再実行する。

2026-06-02 10:27 JSTに公開repo `daideguchi/formpilot-vault` へも `/form-input.html` を同期。GitHub Pagesはcommit `51a452e Add form input SEO page` のdeploy成功後、`https://daideguchi.github.io/formpilot-vault/form-input.html` と `/sitemap.xml` がHTTP 200。`npm run novus:public` でPendo送信と横スクロールなしを確認済み。

2026-06-02 10:33 JSTに、トップ/日本語ページのSEO本文から専用ページへの内部リンクを追加。Vercel本番は `form-input`、GitHub Pages公開ミラーは `form-input.html` へリンクする。Vercel deployment `dpl_GY7n8bUsLzMUn4hbFeJnPoNLTnXm`、公開repo commit `cce223c Link home pages to form input SEO page`。`npm run check:seo -- --live`、`npm run check:production`、`npm run novus:public` は通過。

2026-06-02 11:05 JSTに、検索意図をさらに分けるため `/form-autofill`、`/signup-autofill`、`/contact-form-autofill` を追加。狙う検索意図は `フォーム自動入力`、`会員登録 自動入力`、`問い合わせフォーム 自動入力`、`資料請求フォーム 自動入力`。各ページにtitle/meta、canonical、hreflang、OG/Twitter、SoftwareApplication + FAQPage JSON-LD、Free月20回、暗号化Vault、AIに個人情報実値を送らない、送信しない安全性を入れた。`sitemap.xml` へ3URLを追加し、トップ/日本語/フォーム入力ページから内部リンクを追加。Vercel deployment `dpl_GBRpH16xHpyhWVFqWhjRaEinr11u` を本番aliasへ反映し、`npm run check:seo -- --live`、`npm run check:production`、`npm run check:launch -- --require-published` はブロッカー0で通過。公開repo commit `0c4be7d Add SEO keyword landing pages`、GitHub Pages pages-build-deployment run `26793869132` は成功。公開ミラーの `/form-autofill.html`、`/signup-autofill.html`、`/contact-form-autofill.html` はHTTP 200で、`npm run novus:public` はPendo requestと横スクロールなしを確認して通過。

2026-06-02 11:31 JSTに、SEOページから課金までのクリック数を減らすため、`/form-input`、`/form-autofill`、`/signup-autofill`、`/contact-form-autofill` にFree/Plus/Pro/Teamの料金カードとPlus/Pro/Team Checkoutボタンを直接追加。`site/pricing.js` はSEO専用ページの静的title/langを保持したままCheckout処理だけ使うようにした。Vercel deployment `dpl_BHoz4wbEmubUbJodJKkjcgdefjm2` を本番aliasへ反映し、`npm run test`、`npm run check:seo -- --live`、`npm run check:production`、`npm run check:launch -- --require-published` が通過。`npm run purchase:verify -- --plan plus` でPlusの `cs_live_` Checkout Session作成も確認済み。これは支払いなしの導線確認であり、実購入/入金確認ではない。

2026-06-02 11:48 JSTに、DDの最新指定としてFreeを月20回で再固定し、SEOページ、本番API、公開ミラーを再検証した。Vercel deployment `dpl_2Sz1QfJmP7DYE44VU2zguRTvPYob`、Cloudflare Worker version id `dfffe4e1-856b-4768-8125-97aaea970e0b`、公開repo commit `6c7ad36 Set Free plan to 20 monthly fills`、GitHub Pages run `26795204977`。`npm run check:seo -- --live`、`npm run check:production`、`npm run check:cloudflare:live`、`npm run novus:public` は通過。Vercel本番とGitHub Pages公開ミラーの `/form-input` / `/form-autofill` / `/signup-autofill` / `/contact-form-autofill` はHTTP 200、`月20回` / `20 fills` あり、`月5回` / `5 fills` なしを確認。

2026-06-02 12:06 JSTのSearch Console URL検査では、`/form-input` はまだ `URL が Google に登録されていません`、理由は `URL が Google に認識されていません`。`インデックス登録をリクエスト` は表示されているが、`割り当て量を超えています` と表示され、日次割り当て超過で処理不可。翌日以降に再リクエストする。

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
