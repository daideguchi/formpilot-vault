# API / Entitlement Release Path

作成日: 2026-06-01
状態: `vercel_live_with_stripe_bridge`

## 目的

Chrome拡張にAPIキーや課金秘密情報を入れず、リリース時に安全にAI推論と課金解除を動かすための土台です。

## 実装済み

### AI schema proxy

- 実装: `api/schema-proxy/schema-proxy.js`
- ローカル起動: `npm run dev:schema-proxy`
- endpoint: `POST /api/schema/infer`
- 役割:
  - 拡張からsafe payloadを受け取る
  - 2026-06-06まではAzure DeepSeek V4へ送る
  - 2026-06-07以降はCloudflare Workers AIへ送る
  - AIの返答を `field_id -> semantic_key` のJSONへ正規化する
  - live providerの環境変数が未投入/障害の場合、`rules_fallback` としてローカルのフォーム理解ルールでsemantic keyを返す

安全条件:

- `value`、`selector`、Cookie、Authorization風文字列を拒否
- AIへ渡すのはフォーム構造とMemory contextだけ
- 実値の氏名、住所、電話、メール、パスワードは渡さない

### Entitlement API

- 実装: `api/entitlement/entitlement.js`
- Stripe metadata source: `api/entitlement/stripe-source.js`
- ローカル起動: `npm run dev:entitlement`
- endpoints:
  - `POST /api/stripe/checkout-session`
  - `GET /api/entitlement/check?license_key=...`
  - `POST /api/entitlement/check`
  - `POST /api/stripe/webhook`
- 役割:
  - Stripe Checkout Sessionをsubscription modeで作成する
  - Free/Plus/Pro/Teamの権利を返す
- Stripe webhookからlicense entitlementを更新する
- Stripe署名を `STRIPE_WEBHOOK_SECRET` で検証する
- Vercel本番では `FORMPILOT_STRIPE_BRIDGE_BASE_URL` がある場合、既存のStripe本番ブリッジへ中継する

### Cloudflare Worker

- 実装: `api/worker/worker.mjs`
- 設定: `wrangler.toml`
- D1 migration: `api/worker/migrations/0001_entitlements.sql`
- endpoints:
  - `GET /api/health`
  - `POST /api/schema/infer`
  - `POST /api/stripe/checkout-session`
  - `POST /api/stripe/webhook`
  - `GET/POST /api/entitlement/check`
- 静的サイト: `site/` をWorkers Static Assetsで配信する
- D1: `entitlements` tableにlicense状態を保存する
- AI: `env.AI.run()` bindingがあればCloudflare Workers AIを直接呼ぶ

### Vercel production API

- 生成: `npm run build:vercel-app`
- deploy先: `https://formpilot-vault-api.vercel.app/`
- 生成スクリプト: `scripts/build-vercel-app.mjs`
- endpoints:
  - `GET /api/health`
  - `POST /api/schema/infer`
  - `POST /api/stripe/checkout-session`
  - `POST /api/entitlement/check`
  - `POST /api/stripe/webhook`
- 本番環境変数:
  - `FORMPILOT_STRIPE_BRIDGE_BASE_URL=production-stripe-bridge`
  - `PUBLIC_SITE_URL=https://formpilot-vault-api.vercel.app`
  - `ENTITLEMENT_SOURCE=stripe_bridge`
- 2026-06-01確認:
  - `/api/health` は `entitlement_source: stripe_bridge`
  - `/api/schema/infer` はAzure未投入時に `rules_fallback` で `person.email.primary` を返す
  - `/api/stripe/checkout-session` はStripe Checkout URLを返す
  - `/api/entitlement/check` は購入前licenseをFree/月5回で返す

### Extension接続

- 実装: `extension/src/entitlement-client.js`
- popupにLicense key欄と `Check` ボタンを追加
- Plus/Pro/Teamがactiveなら月5回制限を解除する

### Checkout UI

- 実装: `site/index.html`
- 実装: `site/pricing.js`
- 実装: `site/success.html`
- Plus/Pro/Teamのボタンから `POST /api/stripe/checkout-session` を呼ぶ
- Checkout成功後、License keyをsuccessページに表示する
- 拡張のUpgradeボタンはLicense keyを生成してpricingへ渡す

### Stripe商品/価格セットアップ

- 実装: `scripts/setup-stripe-products.mjs`
- dry run: `npm run setup:stripe:dry`
- live: `STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_URL=... npm run setup:stripe`
- 作成する価格:
  - Plus: 580円/月
  - Pro: 1,480円/月
  - Team: 1,500円/人/月
- 出力された `STRIPE_PLAN_PRICE_MAP` と `STRIPE_PRICE_PLAN_MAP` を本番環境変数へ入れる
- 2026-06-01時点では、FormPilot専用の独立Stripe商品/price id作成は未実行。
- ただし本番課金導線は、既存のStripe本番ブリッジでCheckout Session作成まで成功。

### Store / Public Pages

- LP: `site/index.html`
- Pricing JS: `site/pricing.js`
- Checkout success: `site/success.html`
- Privacy draft: `site/privacy.html`
- Terms draft: `site/terms.html`
- Store listing copy: `docs/12_chrome_store_listing_copy.md`
- Store assets: `store-assets/`
- Extension package: `dist/ai-form-autofill-0.1.0.zip`
- Production runbook: `docs/13_production_launch_runbook.md`
- Release check: `npm run release:check`
- Production connection check: `npm run check:production`

## 環境変数

テンプレート: `.env.example`

秘密情報はGitに入れません。

## 次にやること

1. Chrome Web Storeへ提出する
2. Azure DeepSeek V4の実endpoint/keyをVercelへ入れてlive smoke testする
3. 2026-06-07以降、Workers AI bindingで同じJSON応答を返せるか確認
4. 日本語デモフォームを増やし、`rules_fallback` とAI liveの精度差を測る
5. 将来移行としてCloudflare D1を作成し、`wrangler.toml` の `database_id` へ反映する

## 公式仕様メモ

- Stripe Checkout Sessionはサーバー側で作成し、subscriptionではrecurring priceをline itemに入れる。
- Stripe webhook署名検証はraw bodyが必要。JSON parse後のbodyでは検証しない。
- Azure AI Foundryのserverless model deploymentはTarget URIとKeyを使い、Azure AI Model Inference APIとして呼べる。2026-06-01時点の既存Azure AI Services 2件にはmodel deploymentがないため、live AI接続は未投入。
