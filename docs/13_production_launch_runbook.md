# Production Launch Runbook

作成日: 2026-06-01
状態: `vercel_live_checkout_ready`

## ゴール

Chrome拡張を公開し、Plus/Pro/Teamの課金がプロジェクトオーナーのStripeへ入り、拡張側のLicense checkで有料権利が解除される状態にする。

## いま達成済み

- Chrome拡張MVP
- Profile Vault / Memory Space最小DB
- Profile Vault AES-GCM encrypted-at-rest storage
- AI schema proxy
- Cloudflare Worker入口
- D1 entitlement schema
- Cloudflare D1本番DB / Worker本番deploy
- Cloudflare Workers AI live schema確認
- Stripe Checkout Session作成
- Stripe webhook署名検証
- LP / Privacy / Terms
- Chrome Web Store素材
- 提出用ZIP
- 21 locale extension package i18n
- 65キー x 21 locale extension package i18n
- Extension schema API client
- 実ブラウザ拡張E2E
- release readiness check
- Vercel本番LP/API: `https://formpilot-vault-api.vercel.app/`
- 既存のStripe本番ブリッジ: `production-stripe-bridge/*`
- 本番Stripe Checkout Session作成
- 本番License check Free/月5回応答
- AI schema proxyの `rules_fallback`
- GitHub Pages静的公開LP: `https://daideguchi.github.io/formpilot-vault/`
- 公開Privacy URL: `https://daideguchi.github.io/formpilot-vault/privacy.html`

注意: 2026-06-01時点のChrome Web Store提出用本番はVercelを正にします。Cloudflare Worker/D1は6/7以降の無料枠移行先として本番検証済みですが、現在のChrome Web Store提出を止める条件ではありません。

世界配信は初期リリース戦略です。Chrome Web Storeは英語Primary、全155地域、21 locale packageのまま進め、Store Listingの追加翻訳は公開後に拡張します。初版を遅らせる理由にはしません。

## 現行本番接続

- LP/API: `https://formpilot-vault-api.vercel.app/`
- Checkout: `POST https://formpilot-vault-api.vercel.app/api/stripe/checkout-session`
- Entitlement: `POST https://formpilot-vault-api.vercel.app/api/entitlement/check`
- Stripe bridge: `production-stripe-bridge`
- Extension config: `extension/src/release-config.js`
- Extension ZIP: `dist/ai-form-autofill-0.1.0.zip`
- Cloudflare Worker: `https://ai-form-autofill.dd-1107-11107.workers.dev`
- Latest Vercel deployment: `dpl_BkXLM2QPbuNSj159j2NQ1cgSgxTD`

## 現行本番の再デプロイ

```bash
npm test
npm run build:vercel-app
cd deploy/formpilot-vault-api
vercel link --yes --scope daideguchis-projects --project formpilot-vault-api
vercel deploy --prod --yes --scope daideguchis-projects
```

環境変数:

- `FORMPILOT_STRIPE_BRIDGE_BASE_URL=production-stripe-bridge`
- `PUBLIC_SITE_URL=https://formpilot-vault-api.vercel.app`
- `ENTITLEMENT_SOURCE=stripe_bridge`

## 本番確認コマンド

まず一括確認。Plus/Pro/Teamの3プランすべてのStripe Checkout Session作成もここで確認する:

```bash
npm run check:production
npm run check:seo
```

AI providerまでlive必須で見る場合:

```bash
npm run check:production:strict-ai
```

個別確認:

```bash
curl https://formpilot-vault-api.vercel.app/api/health

curl -X POST https://formpilot-vault-api.vercel.app/api/schema/infer \
  -H 'content-type: application/json' \
  -d '{"task":"form_schema_mapping","fields":[{"field_id":"field_001","tag":"input","type":"email","label":"メールアドレス","name":"email"}]}'

curl -X POST https://formpilot-vault-api.vercel.app/api/stripe/checkout-session \
  -H 'content-type: application/json' \
  -d '{"plan":"plus","license_key":"afa_smoke"}'

curl -X POST https://formpilot-vault-api.vercel.app/api/entitlement/check \
  -H 'content-type: application/json' \
  -d '{"license_key":"afa_smoke"}'
```

実購入後のLicense確認:

```bash
AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:paid-license
```

このコマンドはVercel本番とCloudflare Worker本番の両方で、有料plan、active状態、月間fills権利を確認する。購入前のlicenseでは失敗するのが正しい。

審査中/公開後/購入後をまとめて見る:

```bash
npm run check:launch
npm run check:launch -- --require-published
AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:launch -- --require-paid-license
```

`check:launch` はVercel、Cloudflare、GitHub Pages、Chrome Web Store公開URL、開いているChrome Web Store Dashboard、購入後ライセンスをまとめて確認する。審査待ち中は公開URLと有料ライセンス未確認をwarningにし、公開後は `--require-published`、実購入後は `--require-paid-license` でブロッカー化する。

SEO公開面の確認:

```bash
npm run check:seo
npm run check:seo -- --live
```

`check:seo` は英語トップ、日本語 `/ja`、canonical、hreflang、meta description、SoftwareApplication構造化データ、`robots.txt`、`sitemap.xml`、フォーム入力/AI form autofill系の本文コピーを確認する。Google Search Consoleへsitemapを登録できる場合は `https://formpilot-vault-api.vercel.app/sitemap.xml` を提出する。

## Chrome Web Store提出

```bash
AFA_PUBLIC_URL=https://formpilot-vault-api.vercel.app npm run configure:release
npm run package:extension
npm run release:check
```

使うもの:

- `dist/ai-form-autofill-0.1.0.zip`
- `store-assets/icon-128.png`
- `store-assets/promo-small-440x280.png`
- `store-assets/screenshot-main-1280x800.png`
- `store-assets/screenshot-popup-1280x800.png`
- `store-assets/screenshot-pricing-1280x800.png`
- `docs/12_chrome_store_listing_copy.md`
- Privacy URL: `https://formpilot-vault-api.vercel.app/privacy.html`

## Cloudflare移行/再確認

Cloudflare CLI login、D1作成、migration、Worker deploy、Stripe bridge secret、Workers AI live schema確認は完了済み。

再確認:

```bash
npx wrangler whoami
npm run check:cloudflare
npm run check:cloudflare:live
```

現在のCloudflare本番:

- Account: `local Cloudflare operator account`
- D1: `ai-form-autofill-prod`
- database_id: `895767fa-8bc7-4811-9801-63d879eeb194`
- Worker URL: `https://ai-form-autofill.dd-1107-11107.workers.dev`
- AI primary: `@cf/meta/llama-3.2-3b-instruct`
- AI fallback: `@cf/zai-org/glm-4.7-flash`

再deploy:

```bash
npm run d1:migrate:remote
npm run deploy:worker
```

## 停止条件

- `release:check` がfalse
- Stripe Checkoutから戻ったLicense keyが `GET/POST /api/entitlement/check` で有料activeにならない
- 拡張ZIP内の `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- Chrome拡張内にAPI keyやStripe secretが入っている
- 送信ボタンを自動クリックする動作が入っている

## 現在のブロッカー

- Chrome Web Storeは `審査待ち`。次の停止点は審査結果確認、公開確認、または差し戻し対応。
- Stripeの実購入/入金確認はプロジェクトオーナーの決済操作またはDashboard確認が必要
- Azure DeepSeek V4のdeployment作成は `ReadOnlyDisabledSubscription` で停止。Azure利用を続けるならsubscription再有効化が必要

## 現在の非ブロッカー

- 通常リリースではAI provider未投入時も `rules_fallback` で動作する。`check:production:strict-ai` だけはこれをブロッカー扱いにする。
- Cloudflare Workerはlive検証済み。Chrome拡張の公開初版はVercel endpointのまま出し、6/7以降にWorkerへ切替可能。
