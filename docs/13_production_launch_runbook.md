# Production Launch Runbook

作成日: 2026-06-01
状態: `published_update_package_ready`

## ゴール

Chrome拡張を公開し、Plus/Pro/Teamの課金がDDのStripeへ入り、拡張側のLicense checkで有料権利が解除される状態にする。

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
- 152キー x 21 locale extension package i18n
- Extension schema API client
- 実ブラウザ拡張E2E
- release readiness check
- Vercel本番LP/API: `https://formpilot-vault-api.vercel.app/`
- Kurogane Stripe本番ブリッジ: `https://kurogane-edge-core-lp.vercel.app/api/formpilot/*`
- 本番Stripe Checkout Session作成
- 本番License check Free/月20回応答
- 0円Checkout後のPlus active license確認
- AI schema proxyの `rules_fallback`
- Azure未投入時のVercel -> Cloudflare Worker live schema委譲
- GitHub Pages静的公開LP: `https://daideguchi.github.io/formpilot-vault/`
- 公開Privacy URL: `https://daideguchi.github.io/formpilot-vault/privacy.html`
- Chrome Web Store公開URL: `https://chromewebstore.google.com/detail/formpilot-vault/kmlcabffhmenjajmlnkkglphjnbaahlf`
- 更新用Chrome拡張ZIP: `dist/ai-form-autofill-0.1.1.zip` / `105172 bytes`（11:48 JSTローカル最新。CWSへ09:47 JSTに送信済みの審査中artifactは `105168 bytes`）
- ZipCloud郵便番号住所検索、電話番号3分割、空の初期値とプレースホルダー、保存完了表示

注意: 2026-06-01時点のChrome Web Store提出用本番はVercelを正にします。Cloudflare Worker/D1は6/7以降の無料枠移行先として本番検証済みですが、現在のChrome Web Store提出を止める条件ではありません。

世界配信は初期リリース戦略です。Chrome Web Storeは英語Primary、全155地域、21 locale packageのまま進め、Store Listingの追加翻訳は公開後に拡張します。初版を遅らせる理由にはしません。

## 現行本番接続

- LP/API: `https://formpilot-vault-api.vercel.app/`
- Checkout: `POST https://formpilot-vault-api.vercel.app/api/stripe/checkout-session`
- Entitlement: `POST https://formpilot-vault-api.vercel.app/api/entitlement/check`
- Stripe bridge: `https://kurogane-edge-core-lp.vercel.app/api/formpilot`
- Checkout success: `https://formpilot-vault-api.vercel.app/success?license_key=...`
- GitHub Pages mirror checkout: `github.io` 上ではVercel本番APIへ接続
- Extension config: `extension/src/release-config.js`
- Extension ZIP: `dist/ai-form-autofill-0.1.1.zip`
- Cloudflare Worker: `https://ai-form-autofill.dd-1107-11107.workers.dev`
- Latest Vercel deployment: `dpl_HMAXzQgody4kr7zCQ6CLSCHo97US`

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

実購入テストを1コマンドで始める場合:

```bash
npm run purchase:verify -- --plan plus --open --wait
```

このコマンドは本番Checkout Sessionを作り、Checkout URL、License key、success URLを表示し、`--open` でStripe Checkoutを開く。DDが支払いを完了すると、`--wait` がVercel本番とCloudflare Worker本番のEntitlementをポーリングし、有料activeになるまで確認する。支払い前に止める場合は、表示されたCheckout URLを閉じればよい。

2026-06-02 12:04 JSTに、DD指定のプロモーションコードを使ってPlusの0円Checkoutを完了した。Stripe画面上は `今日期日の合計額 ￥0`、`1カ月間 100% 割引`、`その後、￥580/月、来月以降` の表示。`npm run purchase:verify -- --plan plus --open --wait` は `live_purchase_verified` で完了し、Vercel本番とCloudflare Worker本番の両方で `plan: plus`、`active: true`、`monthly_fills: unlimited`、`current_period_end: 2026-07-02T03:02:05.000Z` を確認した。続けて `npm run check:paid-license` と `npm run check:launch -- --require-published --require-paid-license` もブロッカー0で通過した。これは0円Checkoutなので即時入金は発生していない。

2026-06-02 12:17 JSTにVercel本番へAzure未投入時のCloudflare Worker live schema委譲を追加し、deployment `dpl_HMAXzQgody4kr7zCQ6CLSCHo97US` をproduction aliasへ反映した。`npm run check:production:strict-ai` はブロッカー0/警告0で通過し、schema inferenceは `provider_id: cloudflare_workers_ai_free`、`mode: live`、`delegated_from_provider_id: azure_deepseek_v4`、`delegated_from_error: azure_env_missing`、`semantic_key: person.email.primary` を返した。`npm run check:seo -- --live`、`npm run check:cloudflare:live`、`npm run check:launch -- --require-published` も通過した。有料licenseの生値は公開正本へ残していないため、この12:17 JSTの再検証では `--require-paid-license` は再実行していない。

2026-06-02 12:32 JSTに本番再確認を実施した。`npm run check:production:strict-ai`、`npm run check:cloudflare:live`、`npm run check:seo -- --live`、`npm run check:launch -- --require-published` はすべてブロッカー0。Chrome Web Store公開URLはpublished、Dashboard上の `0.1.1` は `審査待ち`。FormPilot本番経由のFree entitlementは月20回で返る。Kurogane Stripe bridgeのFree権利も商品設計に合わせるため、bridge生コードの `planLimits.free.monthly_fills` を20へ修正し、`npm run typecheck` 通過を確認した。FXProject側のローカルcommitは `264ef2dc6 Align FormPilot Free entitlement limit`。ただしKurogane bridge直接本番URLは未デプロイのため、直叩きではまだ月5回を返す。FormPilot/Vercel/Cloudflare側はFree20へ正規化しているため、公開運用上のブロッカーではない。

0円Checkoutは本番Checkout、Stripe subscription metadata、successページ、Vercel/Cloudflare両方の有料entitlementを確認するための実機検証として扱う。即時入金は発生していない。今回のPlus subscriptionは `current_period_end: 2026-07-02T03:02:05.000Z` が確認済みなので、将来請求を発生させない場合はこの日時より前にStripe Dashboardでキャンセル、または100%割引の継続設定を確認する。

Checkout成功ページも確認する:

```bash
curl -Ls 'https://formpilot-vault-api.vercel.app/success?license_key=afa_probe' | rg 'ライセンスを確認|権利を再確認|entitlementStatus'
```

成功ページはLicense key表示、コピー、`/api/entitlement/check` による有料権利確認、反映待ち時の再確認ボタンを持つ。実購入後は、このページ上の表示と `check:paid-license` の両方でactive確認する。

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

`check:seo` は英語トップ、日本語 `/ja`、日本語SEO専用 `/form-input`、ロングテールSEO専用 `/form-autofill`、`/signup-autofill`、`/contact-form-autofill`、canonical、hreflang、meta description、SoftwareApplication/FAQPage構造化データ、`robots.txt`、`sitemap.xml`、フォーム入力/フォーム自動入力/会員登録 自動入力/問い合わせフォーム 自動入力/AI form autofill系の本文コピーを確認する。Google Search Consoleは2026-06-02 10:07 JSTに `https://formpilot-vault-api.vercel.app/` のURL prefix所有権確認済み。`/sitemap.xml` は送信済みだが、初回読み込みステータスは `取得できませんでした`。外部HTTPではGooglebot UAでも200/`application/xml` のため、後続でSearch Consoleの再取得結果を読み戻す。`/form-input` はURL検査で未登録、インデックス登録リクエストは日次割り当て超過のため明日以降に再実行する。2026-06-02 11:05 JSTに3つのロングテールSEOページを追加し、Vercel deployment `dpl_GBRpH16xHpyhWVFqWhjRaEinr11u`、公開repo commit `0c4be7d`、Pages run `26793869132`、`npm run check:seo -- --live` / `npm run check:production` / `npm run novus:public` 通過まで確認済み。2026-06-02 11:31 JSTには各SEOページへ料金カードとCheckoutボタンを直接追加し、Vercel deployment `dpl_BHoz4wbEmubUbJodJKkjcgdefjm2`、`npm run test`、`npm run check:seo -- --live`、`npm run check:production`、`npm run check:launch -- --require-published`、`npm run purchase:verify -- --plan plus` 通過まで確認済み。2026-06-02 12:06 JST時点でもSearch Consoleは `割り当て量を超えています` のため、インデックス登録リクエストは翌日以降の停止点。

## Chrome Web Store提出

```bash
AFA_PUBLIC_URL=https://formpilot-vault-api.vercel.app npm run configure:release
npm run package:extension
npm run release:check
```

使うもの:

- `dist/ai-form-autofill-0.1.1.zip`
- `store-assets/icon-128.png`
- `store-assets/promo-small-440x280.png`
- `store-assets/screenshot-main-1280x800.png`
- `store-assets/screenshot-popup-1280x800.png`
- `store-assets/screenshot-pricing-1280x800.png`
- `docs/12_chrome_store_listing_copy.md`
- Privacy URL: `https://formpilot-vault-api.vercel.app/privacy.html`

2026-06-02 09:47 JST時点のローカル更新用ZIPは `dist/ai-form-autofill-0.1.1.zip` / `105168 bytes`。Chrome Web Store初版は公開済みで、この `0.1.1` 版はDashboardへuploadし、更新審査へ送信済み。Dashboard読み戻しは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`。

2026-06-02 11:48 JSTに、DDの最新指定としてFreeは月20回を再固定した。ローカル最新ZIPは `dist/ai-form-autofill-0.1.1.zip` / `105172 bytes`、Vercel deploymentは `dpl_2Sz1QfJmP7DYE44VU2zguRTvPYob`、Cloudflare Worker version idは `dfffe4e1-856b-4768-8125-97aaea970e0b`。`npm run check:production` はVercel本番Free月20回とPlus/Pro/Team `cs_live_` Checkout Sessionを確認し、`npm run check:cloudflare:live` はCloudflare schema live / Stripe bridge / Free月20回を確認した。公開repo commit `6c7ad36`、GitHub Pages run `26795204977` も成功。11:52 JSTに実ブラウザでCWS Package画面を確認し、審査待ち中は `新しいパッケージをアップロード` ボタンがdisabledで差し替え不可と確認した。審査通過後、必要なら `0.1.2` で再提出する。

## Cloudflare移行/再確認

Cloudflare CLI login、D1作成、migration、Worker deploy、Stripe bridge secret、Workers AI live schema確認は完了済み。

再確認:

```bash
npx wrangler whoami
npm run check:cloudflare
npm run check:cloudflare:live
```

現在のCloudflare本番:

- Account: `dd.1107.11107@gmail.com`
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

- Chrome Web Storeは2026-06-02 08:36 JST時点で公開済み。`0.1.1` 更新版は2026-06-02 09:47 JSTに更新審査へ送信済み。次の停止点は審査通過後の公開版 `0.1.1` 読み戻し、または差し戻し対応。
- 0円CheckoutのPlus active確認は完了。即時入金確認は無料プロモーションなしの有料決済またはStripe Dashboard上の売上確認が必要
- 0円Plus subscriptionの将来請求回避確認。次回請求を発生させない場合は、2026-07-02T03:02:05.000Zより前にStripe Dashboardでキャンセルまたは割引継続設定を確認する
- Kurogane bridge直接本番URLのFree月20回反映。FormPilot本番は正規化済みで月20回を返すが、bridge直叩きは未デプロイのため月5回を返す。汚れた作業ディレクトリを巻き込むローカルデプロイは避け、安全なbridge反映手順で進める
- Azure DeepSeek V4のdeployment作成は `ReadOnlyDisabledSubscription` で停止。Azureそのものを使い続けるならsubscription再有効化が必要。ただしVercel本番はCloudflare Worker live schemaへ委譲済みなので、公開運用上のAI liveブロッカーではない

## 現在の非ブロッカー

- 通常リリースでは、Azure env未投入時にVercelがCloudflare Worker live schemaへ委譲する。それも失敗した時だけ `rules_fallback` で継続する。
- Cloudflare Workerはlive検証済み。Chrome拡張の公開初版はVercel endpointのままでも、Vercel内部でCloudflare liveを使える。6/7以降にWorkerへ直接切替も可能。
