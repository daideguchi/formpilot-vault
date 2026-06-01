# Production Launch Runbook

作成日: 2026-06-01
状態: `vercel_live_checkout_ready`

## ゴール

Chrome拡張を公開し、Plus/Pro/Teamの課金がoperator Stripe accountへ入り、拡張側のLicense checkで有料権利が解除される状態にする。

## いま達成済み

- Chrome拡張MVP
- Profile Vault / Memory Space最小DB
- Profile Vault AES-GCM encrypted-at-rest storage
- AI schema proxy
- Cloudflare Worker入口
- D1 entitlement schema
- Stripe Checkout Session作成
- Stripe webhook署名検証
- LP / Privacy / Terms
- Chrome Web Store素材
- 提出用ZIP
- 21 locale extension package i18n
- 実ブラウザ拡張E2E
- release readiness check
- Vercel本番LP/API: `https://formpilot-vault-api.vercel.app/`
- Production Stripe bridge: configured by `FORMPILOT_STRIPE_BRIDGE_BASE_URL`
- 本番Stripe Checkout Session作成
- 本番License check Free/月5回応答
- AI schema proxyの `rules_fallback`
- GitHub Pages静的公開LP: `https://daideguchi.github.io/formpilot-vault/`
- 公開Privacy URL: `https://daideguchi.github.io/formpilot-vault/privacy.html`

注意: 2026-06-01時点の本番はVercelを正にします。Cloudflare Worker/D1は将来の無料枠移行先であり、現在のChrome Web Store提出を止める条件ではありません。

## 現行本番接続

- LP/API: `https://formpilot-vault-api.vercel.app/`
- Checkout: `POST https://formpilot-vault-api.vercel.app/api/stripe/checkout-session`
- Entitlement: `POST https://formpilot-vault-api.vercel.app/api/entitlement/check`
- Stripe bridge: `https://kurogane-edge-core-lp.vercel.app/api/formpilot`
- Extension config: `extension/src/release-config.js`
- Extension ZIP: `dist/ai-form-autofill-0.1.0.zip`

## 現行本番の再デプロイ

```bash
npm test
npm run build:vercel-app
cd deploy/formpilot-vault-api
vercel link --yes --scope daideguchis-projects --project formpilot-vault-api
vercel deploy --prod --yes --scope daideguchis-projects
```

環境変数:

- `FORMPILOT_STRIPE_BRIDGE_BASE_URL=https://kurogane-edge-core-lp.vercel.app/api/formpilot`
- `PUBLIC_SITE_URL=https://formpilot-vault-api.vercel.app`
- `ENTITLEMENT_SOURCE=stripe_bridge`

## 本番確認コマンド

まず一括確認:

```bash
npm run check:production
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

## 将来Cloudflareへ移す時の順番

0. Cloudflare CLIへログインする

```bash
npx wrangler login
npx wrangler whoami
```

2026-06-01の確認では `wrangler whoami` は `not authenticated`。ここは人間のCloudflare認証が必要。

1. CloudflareでD1 DBを作る

```bash
npx wrangler d1 create ai-form-autofill-prod
```

返ってきた `database_id` を `wrangler.toml` の `database_id` へ入れる。

2. D1 migrationを適用する

```bash
npm run d1:migrate:remote
```

3. Worker secretを入れる

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put AZURE_DEEPSEEK_ENDPOINT
npx wrangler secret put AZURE_DEEPSEEK_API_KEY
```

4. Workerをdeployする

```bash
npm run deploy:worker
```

## 停止条件

- `release:check` がfalse
- Stripe Checkoutから戻ったLicense keyが `GET/POST /api/entitlement/check` で有料activeにならない
- 拡張ZIP内の `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- Chrome拡張内にAPI keyやStripe secretが入っている
- 送信ボタンを自動クリックする動作が入っている

## 現在のブロッカー

- Chrome Web Storeの最終 `Submit for review` はDD確認が必要
- Azure DeepSeek V4の本番endpoint/key未投入。既存Azure AI Servicesは見えるがmodel deploymentは空

## 現在の非ブロッカー

- Cloudflare CLI未ログイン
- Cloudflare D1 `database_id` 未設定
- Worker本番deploy未実施
- 通常リリースではAI provider未投入時も `rules_fallback` で動作する。`check:production:strict-ai` だけはこれをブロッカー扱いにする。
