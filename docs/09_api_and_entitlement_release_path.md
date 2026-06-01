# API / Entitlement Release Path

作成日: 2026-06-01
状態: `mvp_api_scaffolded`

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

安全条件:

- `value`、`selector`、Cookie、Authorization風文字列を拒否
- AIへ渡すのはフォーム構造とMemory contextだけ
- 実値の氏名、住所、電話、メール、パスワードは渡さない

### Entitlement API

- 実装: `api/entitlement/entitlement.js`
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

## 環境変数

テンプレート: `.env.example`

秘密情報はGitに入れません。

## 次にやること

1. schema proxyをCloudflare Worker/Vercel Functionsのどちらへ置くか決める
2. Azure DeepSeek V4の実endpointを環境変数へ入れてsmoke test
3. Cloudflare Workers AIの実tokenで2026-06-07以降のsmoke test
4. Stripe商品/価格を作り、`STRIPE_PRICE_PLAN_MAP` を本番値にする
5. entitlement DBをローカルJSONから永続DBへ移す

## 公式仕様メモ

- Stripe Checkout Sessionはサーバー側で作成し、subscriptionではrecurring priceをline itemに入れる。
- Stripe webhook署名検証はraw bodyが必要。JSON parse後のbodyでは検証しない。
