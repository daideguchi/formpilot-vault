# Production Launch Runbook

作成日: 2026-06-01
状態: `release_candidate_pending_external_values`

## ゴール

Chrome拡張を公開し、Plus/Pro/Teamの課金がDDのStripeへ入り、拡張側のLicense checkで有料権利が解除される状態にする。

## いま達成済み

- Chrome拡張MVP
- Profile Vault / Memory Space最小DB
- AI schema proxy
- Cloudflare Worker入口
- D1 entitlement schema
- Stripe Checkout Session作成
- Stripe webhook署名検証
- LP / Privacy / Terms
- Chrome Web Store素材
- 提出用ZIP
- 実ブラウザ拡張E2E
- release readiness check
- GitHub Pages静的公開LP: `https://daideguchi.github.io/formpilot-vault/`
- 公開Privacy URL: `https://daideguchi.github.io/formpilot-vault/privacy.html`

注意: GitHub Pagesは静的公開用です。Stripe Checkout、AI schema proxy、entitlement APIはCloudflare Workerの公開URLで動かす。

## 本番接続の順番

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

3. 公開URLを決めて反映する

```bash
AFA_PUBLIC_URL=https://YOUR_PUBLIC_URL npm run configure:release
```

これで `extension/src/release-config.js` と `wrangler.toml` の `PUBLIC_SITE_URL` が更新される。

4. Stripe商品/価格/Webhookを作る

```bash
STRIPE_SECRET_KEY=sk_live_xxx \
STRIPE_WEBHOOK_URL=https://YOUR_PUBLIC_URL/api/stripe/webhook \
npm run setup:stripe
```

出力された `STRIPE_PRICE_ID_PLUS`、`STRIPE_PRICE_ID_PRO`、`STRIPE_PRICE_ID_TEAM`、`STRIPE_PRICE_PLAN_MAP`、`STRIPE_WEBHOOK_SECRET` をWorker環境へ入れる。

5. Worker secretを入れる

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put AZURE_DEEPSEEK_ENDPOINT
npx wrangler secret put AZURE_DEEPSEEK_API_KEY
```

6. Workerをdeployする

```bash
npm run deploy:worker
```

7. 本番ヘルスチェック

```bash
curl https://YOUR_PUBLIC_URL/api/health
curl -X POST https://YOUR_PUBLIC_URL/api/entitlement/check \
  -H 'content-type: application/json' \
  -d '{"license_key":"afa_smoke"}'
```

8. release checkを通す

```bash
npm run release:check
STRIPE_SECRET_KEY=sk_live_xxx \
STRIPE_WEBHOOK_SECRET=whsec_xxx \
STRIPE_PRICE_ID_PLUS=price_xxx \
STRIPE_PRICE_ID_PRO=price_xxx \
STRIPE_PRICE_ID_TEAM=price_xxx \
AZURE_DEEPSEEK_ENDPOINT=https://xxx \
AZURE_DEEPSEEK_API_KEY=xxx \
npm run release:check:strict
```

9. 拡張ZIPを再生成する

```bash
npm run package:extension
```

10. Chrome Web Storeへ提出する

使うもの:

- `dist/ai-form-autofill-0.1.0.zip`
- `store-assets/icon-128.png`
- `store-assets/promo-small-440x280.png`
- `store-assets/screenshot-main-1280x800.png`
- `store-assets/screenshot-popup-1280x800.png`
- `store-assets/screenshot-pricing-1280x800.png`
- `docs/12_chrome_store_listing_copy.md`
- 公開済み `privacy.html`

## 停止条件

- `release:check` がfalse
- `release:check:strict` が失敗
- Stripe Checkoutから戻ったLicense keyが `GET/POST /api/entitlement/check` で有料activeにならない
- 拡張ZIP内の `extension/src/release-config.js` が `REPLACE_WITH_PUBLIC_URL` のまま
- Chrome拡張内にAPI keyやStripe secretが入っている
- 送信ボタンを自動クリックする動作が入っている

## 現在のブロッカー

- Cloudflare CLI未ログイン
- 公開URL未設定
- Cloudflare D1 `database_id` 未設定
- Stripe live secret / price id / webhook secret 未投入
- Azure DeepSeek V4の本番endpoint/key未投入
- Chrome Web Storeの提出操作は人間の開発者アカウント確認が必要
