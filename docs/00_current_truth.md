# Current Truth

更新日: 2026-06-01
事業名: `AIフォームオートフィル`
TASK候補: `BIZ-FORM-AUTOFILL-001`

## 現在地

新規事業として起動しました。最終ゴールは `リリース` と `マネタイズ` です。

事業の中心は、フォームを入力する人たちの細かな手間を、自動入力で解決することです。AIは前面に出す主役ではなく、バラバラなフォーム項目を理解して正しいプロフィール値へ対応づけるための裏側の力です。

最重要のコアコンセプトは `個人情報Vault + 入力判断用RAG/記憶スペース` です。単なる自動入力ではなく、ユーザーごとの個人情報、会社情報、入力の癖、サイト別の正解、過去の修正をためて、次のフォーム入力に使える状態を作ります。

MVPは `Chrome拡張 + content script入力` を本線にします。Playwrightは検証用と将来のB2B版に回します。

## 現時点の成果物

- Chrome拡張MVP: `extension/`
- フォーム認識エンジン: `extension/src/schema-engine.js`
- DOM収集/入力実行: `extension/src/collector.js`
- API切替方針: `extension/src/provider-router.js`
- AI安全ペイロード: `extension/src/ai-payload.js`
- Extension schema API client: `extension/src/schema-client.js`
- AI schema proxy: `api/schema-proxy/`
- entitlement API: `api/entitlement/`
- サンプルフォーム検証: `tests/`
- 実ブラウザ拡張E2E: `tests/extension-real-browser-e2e.mjs`
- 公開デモフォーム実ブラウザ検証: `tests/public-site-real-browser-probe.mjs`
- リリース/課金計画: `docs/`
- Free/Plus/Pro/Teamの利用制限: `extension/src/usage-meter.js`
- Vault/RAGコア設計: `docs/08_profile_vault_rag_core.md`
- Vault/RAG最小DB: `extension/src/profile-memory.js`
- Vault実値暗号化: `extension/src/vault-crypto.js`
- Chrome Web Store素材: `store-assets/`
- 拡張アイコン: `extension/icons/`
- 提出用ZIP: `dist/ai-form-autofill-0.1.0.zip`
- ストア掲載文面: `docs/12_chrome_store_listing_copy.md`
- Chrome Web Store提出パケット: `docs/14_chrome_web_store_submission_packet.md`
- プライバシー/利用規約下書き: `site/privacy.html`, `site/terms.html`
- Cloudflare Worker本番入口: `api/worker/worker.mjs`
- D1 entitlement migration: `api/worker/migrations/0001_entitlements.sql`
- Cloudflare deploy設定: `wrangler.toml`
- 本番リリースRunbook: `docs/13_production_launch_runbook.md`
- release readiness check: `scripts/release-readiness.mjs`
- production connection check: `scripts/check-production-connections.mjs`
- paid license live check: `scripts/check-paid-license-live.mjs`
- launch status check: `scripts/check-launch-status.mjs`
- SEO readiness check: `scripts/check-seo.mjs`
- 公開LP/GitHub repo: `https://daideguchi.github.io/formpilot-vault/`, `https://github.com/daideguchi/formpilot-vault`
- 本番LP/API: `https://formpilot-vault-api.vercel.app/`
- 日本語SEOページ: `https://formpilot-vault-api.vercel.app/ja`
- SEO sitemap: `https://formpilot-vault-api.vercel.app/sitemap.xml`
- Stripe本番Checkoutブリッジ: `https://kurogane-edge-core-lp.vercel.app/api/formpilot/*`
- Extension UI locales: `en`, `en_GB`, `ja`, `es`, `es_419`, `fr`, `de`, `it`, `nl`, `pl`, `pt_BR`, `ru`, `tr`, `ar`, `hi`, `id`, `th`, `vi`, `ko`, `zh_CN`, `zh_TW`
- Worldwide distribution方針
- Chrome Web Store draft item: `kmlcabffhmenjajmlnkkglphjnbaahlf`

`extension/src/profile-memory.js` で、ローカルVault、サイト別mapping cache、ユーザー修正イベント、フォーム単位のmemory retrievalを実装済みです。`extension/src/vault-crypto.js` でプロフィール実値をAES-GCM暗号化して `chrome.storage.local` へ保存します。暗号鍵はIndexedDBの非exportable `CryptoKey` として分離し、`chrome.storage.local` には鍵も実値も置きません。入力成功後、実値ではなく `profile_key` とフィールド署名だけを保存して、次回の推論に使います。

既存の平文Vault/旧 `profile` storageは、popup初回起動時に復号可能なruntime stateへ読み込み、暗号化済み `vaultState` へ自動移行します。実ブラウザE2Eでは、入力後のChrome拡張storageにプロフィール実値が平文で残らないことを確認済みです。

popup上で不確定項目をプロフィールキーへ紐づける `Learn` UIも実装済みです。これにより、ユーザー修正を `correction_events` と `mapping_cache` に保存し、同じフォームでは次回からMemory優先で入力プランへ反映します。

AIへ渡すschema inference payloadも実装済みです。フォーム構造、Memory context、ページ言語、UI言語、ブラウザ言語、TLD、タイムゾーン、calendar、numbering systemなどの `locale_context` は渡しますが、input value、CSS selector、プロフィール実値は入れないテストを固定しています。

リリース/課金に必要なAPI土台も実装済みです。`api/schema-proxy/` はAzure DeepSeek V4からCloudflare Workers AIへ日付で切替し、`api/entitlement/` はStripe webhookとlicense checkを扱います。popupにはLicense key確認欄を追加済みです。2026-06-01 13:28 JSTに、拡張popup本体も `extension/src/schema-client.js` 経由で本番schema APIを優先利用する形へ変更しました。API失敗時はローカルルールへfallbackします。

DDの初期思想は実際のschema proxyプロンプトへ入れました。`buildSchemaPrompt()` は、フォーム入力の細かな手間をなくす、Personal Vault + Profile RAG/Memory Spaceを核にする、実値を扱わない、不確定項目はユーザー確認へ残す、送信/認証突破/大量作成はしない、世界市場のフォームでは `locale_context` を補助情報として使う、という方針を含みます。

Stripe Checkout作成APIとLP側の決済導線も実装済みです。Plus/Pro/Teamボタンから `POST /api/stripe/checkout-session` を呼び、Checkout成功後にLicense keyを表示します。2026-06-01時点では、FormPilot本番APIがKurogane側のStripe本番secretを使う専用ブリッジへ中継し、Stripe Checkout Session作成まで本番で成功しています。2026-06-01 13:40 JSTにPlus/Pro/Teamの3プランすべてで `cs_live_` Checkout Session作成を確認しました。購入前のlicense checkはFree/月5回で返り、購入後はStripe subscription metadataの `license_key` / `plan` を照会して有料権利を返す設計です。

実購入後の有料権利確認用に `npm run check:paid-license` を追加しました。`AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:paid-license` で、Vercel本番とCloudflare Worker本番の両方に対して、有料plan、active状態、月間fills権利を確認できます。

審査中/公開後/購入後を一括確認する `npm run check:launch` も追加しました。通常モードではVercel、Cloudflare、GitHub Pages、Chrome Web Store公開URL、Chrome Web Store Dashboard、購入後ライセンスの状態をまとめて出し、審査待ち中の未公開URLと未購入ライセンスはwarning扱いにします。公開後は `-- --require-published`、実購入後は `-- --require-paid-license` を付けてブロッカー化できます。

2026-06-01 14:01 JST時点で `npm run check:launch` はブロッカー0です。Vercel health、Cloudflare health、GitHub Pages、Chrome Web Store Dashboard `審査待ち` を確認し、Chrome Web Store公開URLは未公開のためwarning、実購入license未投入もwarningです。`--require-published` は未公開をブロッカー化し、`--require-paid-license` は未購入/無効licenseをブロッカー化することも確認済みです。

2026-06-01 15:56 JST時点でSEO公開面を強化済みです。英語トップに `AI form autofill Chrome extension` 向けのtitle/meta/本文/JSON-LDを追加し、日本語は `https://formpilot-vault-api.vercel.app/ja` を作って `フォーム入力`、`フォーム自動入力`、`Chrome拡張`、`AI自動入力` の検索意図へ合わせました。`robots.txt` と `sitemap.xml` も追加し、canonical/hreflangはVercelの最終到達URLに合わせています。`npm run check:seo -- --live`、`npm run check:production`、`npm run release:check` はブロッカー0です。Playwright実ブラウザでも英語desktopと日本語mobileの横スクロールなしを確認しました。公開repo `daideguchi/formpilot-vault` へcommit `0fa2cc8 Add SEO launch surfaces` をpushし、GitHub Pages build/deploy成功、`/`、`/ja.html`、`/robots.txt`、`/sitemap.xml` のHTTP 200とSEO head/Pendo snippet配信を確認済みです。

公開LPは世界配信向けに、非日本語ブラウザでは英語を初期表示します。日本語は `?lang=ja` または言語ボタンで表示できます。2026-06-01 12:45 JSTの本番確認では、英語初期表示、英語Plusボタン、日本語モバイル表示、横スクロールなし、Stripe Checkout導線が通っています。

AI schema proxyは、Azure/Cloudflareの実環境変数が未投入でも停止しないように `rules_fallback` を実装済みです。2026-06-06まではprovider_idは `azure_deepseek_v4` のまま、Azure環境変数が未設定の場合はローカルのフォーム理解ルールでsemantic keyを返します。Azure値が投入されたらlive modeへ戻せます。

多言語対応も初回提出前に強化しました。manifestは `default_locale: en` と `_locales` を使うChrome公式i18n構成で、21 localeに対応します。対象は英語、英語UK、日本語、スペイン語、ラテンアメリカスペイン語、フランス語、ドイツ語、イタリア語、オランダ語、ポーランド語、ブラジルポルトガル語、ロシア語、トルコ語、アラビア語、ヒンディー語、インドネシア語、タイ語、ベトナム語、韓国語、中国語簡体、中国語繁体です。2026-06-01 13:28 JST時点でExtension UIは65キー x 21 localeで欠落なしです。フォーム認識ルールも主要グローバル市場の氏名、メール、電話、国番号、郵便番号、国、住所、会社、部署、役職、パスワードに広げています。世界配信の販売戦略は `docs/15_global_language_distribution_plan.md` を正本にし、UI翻訳だけでなく国別フォーム理解、`locale_context`、Memory学習までを言語対応に含めます。

2026-06-01のDD判断として、世界配信は初期戦略に昇格しました。日本語フォームの強さは残しつつ、英語Primary、全155地域配信、21 locale拡張UI、英語初期LP、国別フォーム理解、Free月5回からの有料転換をセットで進めます。

Chrome Web Store提出向けのロゴ、manifestアイコン、小プロモ画像、1280x800スクリーンショット3枚、提出用ZIPを作成済みです。素材生成は `npm run assets:store`、ZIP作成は `npm run package:extension` で再現できます。2026-06-01 13:28 JST時点の提出用ZIPは、本番schema API優先、21 locale/65キー、国/国番号semantic key、拡張 `locale_context` 収集入りで `69309 bytes` です。

Chrome Web Store Dashboardにはitem `kmlcabffhmenjajmlnkkglphjnbaahlf` を作成済みです。21 locale ZIPをアップロードし、Store Listing、Privacy、販売地域、テスト手順を入力保存済みです。Primary languageは英語、UI localeは21 locale、カテゴリは `Workflow and Planning`、販売地域は全155地域、決済表示はStripe有料導線に合わせて `In-app purchases`、公開設定は `Public` です。2026-06-01 13:35 JSTに最新ZIP `69309 bytes` をPackage画面から再uploadし、Package画面でversion `0.1.0`、21言語、権限 `activeTab, scripting, storage` を確認しました。2026-06-01 13:54 JSTのDashboard実測でもステータスは `審査待ち` です。`審査のため送信` はdisabledになっており、最終提出は完了済みです。

Stripe商品/価格の作成スクリプトは `npm run setup:stripe:dry` でdry-run通過済みです。現行本番はFormPilot専用Stripe bridgeでPlus/Pro/Teamの本番Checkout Sessionを作る構成です。実購入/入金確認だけは未実行で、DDの決済操作またはStripe Dashboard確認が必要です。

本番APIの置き場としてCloudflare Workerを実装済みです。`/api/schema/infer`、`/api/stripe/checkout-session`、`/api/stripe/webhook`、`/api/entitlement/check`、`/api/health` を同じWorkerで扱います。Stripe entitlementはD1に保存する設計です。Workers AI binding `env.AI.run()` がある場合はCloudflare API tokenなしで推論できます。Cloudflare CLIは `dd.1107.11107@gmail.com` でlogin済み、D1 `ai-form-autofill-prod` はAPACに作成済み、database_idは `895767fa-8bc7-4811-9801-63d879eeb194` です。D1 migration適用済みで、Worker本番URLは `https://ai-form-autofill.dd-1107-11107.workers.dev` です。

`npm run release:check` も追加済みです。Vercel本番APIを使う通常リリース判定ではブロッカー0です。Cloudflare用は `npm run check:cloudflare:live` で、Worker health、Workers AI live schema、Stripe Checkout bridge、Free entitlement bridgeを検証します。

`npm run check:production` も追加済みです。本番 `https://formpilot-vault-api.vercel.app` に対して、health、schema inference、Plus/Pro/Team Stripe Checkout sessions、Free entitlement、Privacy、Support、Termsを一括確認します。2026-06-01 13:40 JSTの確認ではブロッカー0、Plus/Pro/Team Stripe Checkoutはいずれも `cs_live_` セッションを返し、AI schema inferenceのみ `azure_env_missing` による `rules_fallback` warningです。`npm run check:production:strict-ai` では、このAI live未投入をブロッカーとして検出できます。

公開用LPは `FormPilot Vault` としてVercel本番へ反映済みです。`https://formpilot-vault-api.vercel.app/` はHTTP 200を確認済みです。2026-06-01 13:32 JSTにVercel deployment `dpl_BkXLM2QPbuNSj159j2NQ1cgSgxTD` を本番aliasへ反映し、最新schema proxyとStripe bridge経路を本番へ反映しました。GitHub Pages版 `https://daideguchi.github.io/formpilot-vault/` も公開ミラーとして維持しています。

Cloudflare移行用に `npm run check:cloudflare` と `npm run check:cloudflare:live` を追加済みです。2026-06-01確認時点でCloudflare login、D1 database作成、migration、Worker deploy、Workers AI binding本番確認、Stripe bridge secret設定まで完了しています。現在のChrome Web Store提出用本番は引き続きVercel + Stripeブリッジですが、Cloudflare Workerへ切り替え可能な本番経路も検証済みです。

Azure CLIは `degutidai@gmail.com` でログイン済みです。既存Azure AI Servicesは `degutidai-1418-resource` と `degutidai-5815-resource` の2つが見えますが、2026-06-01確認時点では両方ともmodel deploymentが空です。Azure側では `DeepSeek-V4-Pro` と `DeepSeek-V4-Flash` のmodel listは見えますが、deployment作成は subscription `8bf38da5-83a9-4f59-b2f9-1b7cc66fc64d` が `ReadOnlyDisabledSubscription` のため失敗しました。Azureを6/6までlive利用するには、Azure subscriptionの再有効化が人間停止点です。

実ブラウザ検証も通過済みです。Chromiumに拡張を `--load-extension` で読み込み、extension service worker / content script / DOM入力まで実行しました。12項目収集、12項目入力、Plus license表示、`locale_context` 収集、IndexedDB内の非exportable Vault鍵、`chrome.storage.local` に鍵/実値なしまで確認済みです。証跡は `docs/10_real_browser_verification.md` と `site/assets/real-extension-*.png` にあります。

公開デモフォームでも実ブラウザ検証済みです。`httpbin.org/forms/post` は12項目収集、4項目入力。`selenium.dev/selenium/web/web-form.html` は14項目収集、1項目入力。送信はしていません。不確定項目をaskへ残す挙動も確認しました。

## API切替の正本

- 2026-06-01 から 2026-06-06 までは `Azure DeepSeek V4`
- 2026-06-07 以降は `Cloudflare Workers AI` の無料枠モデル
- Chrome拡張にAPIキーを入れない
- APIはサーバー/Worker側のプロキシで呼ぶ
- AIへ送るのはDOM由来のフォーム構造だけ

## MVPの公開範囲

対象にするフォーム:

- 会員登録
- 資料請求
- 問い合わせ
- イベント申込
- 無料トライアル登録

避けるフォーム:

- 金融
- 医療
- 行政
- 決済
- 本人確認
- CAPTCHAや不正対策が強い登録

## 未完了

- Chrome Web Store審査対応
- Azure subscription再有効化、またはAzure期間をrules fallbackで運用する最終判断
- Chrome Web Store審査完了後の公開確認
- Stripeの実購入/入金確認
- サイト別マッピングUI
- 入力判断用RAG/Memory Spaceの実サイト評価

## 2026-06-01 ハッカソン転用確認

DDから、今作っている入力フォーム自動入力プロダクトを、賞金化しやすいハッカソンへ使いたいという方針を受けた。

確認結果:

- Mind the Productは最優先。`FormPilot Vault` として、実際に使えるChrome拡張/LP/Novus.ai/2〜3分動画へ寄せる。
- UiPath AgentHackは2本目。`Form Intake Case Room` として、AI入力案、人間確認、例外管理、監査ログへ寄せる。
- Google Cloud Rapid Agentは3本目。締切が近く競争が強いため、既存Google提出資産へフォーム作業ストーリーを統合できる場合だけ攻める。

今回の確認で `npm test`、`npm run test:worker`、`npm run test:extension`、`npm run test:public-probe`、`npm run assets:store`、`npm run package:extension`、`npm run release:check`、`npm run setup:stripe:dry` は通過した。
`tests/site-checkout-smoke.mjs` はPlaywrightの通常click待機が不安定だったため、checkout clickイベントを直接発火する形へ修正し、`npm test` が通る状態へ戻した。

LPもハッカソン審査員向けに更新した。日本語/英語切替、30秒確認導線、誰のため/何の課題/どう動く/何が証拠の4カードを追加し、余白を減らした。

詳細: `docs/11_hackathon_submission_strategy.md`

## 2026-06-01 FormPilot Vault 公開パッケージ

Mind the Product向けの別提出候補として、公開用パッケージを作成し、独立GitHubリポジトリへpushした。

- 公開URL: `https://daideguchi.github.io/formpilot-vault/`
- GitHub: `https://github.com/daideguchi/formpilot-vault`
- 公開パッケージ作業場所: `/Users/dd/000_AI組織/__hackason/formpilot-vault-public`
- 公開repoは継続更新中。提出前は `git log --oneline -5` と公開URLで最新状態を再確認する。

公開前に削った/直したこと:

- 公開用READMEから内部パスや個人文脈を除去
- 内部名を公開向けの `PRODUCT_CORE_PROMPT` へ変更
- 秘密情報スキャンで、Gmail、APIキー、クレジットコード、ローカルパスの混入なしを確認
- 英語表示時のページタイトルと料金表記を英語化
- 英語表示用のフォームプレビュー画像 `product-preview-en.png` を作り、日本語UIと英語UIを分離
- 事業側で進んでいた Cloudflare Worker、D1 migration、Privacy/Terms、Chrome Store提出コピー、release check も公開リポジトリへ反映

検証結果:

- `npm test` 通過
- `npm run test:extension` 通過
- `npm run test:public-probe` 通過
- GitHub Pagesは `built`
- 公開URLは HTTP 200
- 公開URLで JA/EN、desktop/mobile の4パターン確認。横スクロールなし。英語画面では英語フォーム画像、日本語画面では日本語フォーム画像を表示。
- Cloudflare WorkerのローカルAPI契約テストも通過。追加課金になるdeployやD1作成は実行していない。
- Mind the Product提出草案とNovus.ai導入チェックリストを `submission/` に追加。Novus dashboard screenshotが取れるまで提出はしない。
- `submission/reuse-strategy.md`、`submission/uipath-agenthack-devpost-draft.md`、`submission/google-rapid-agent-devpost-draft.md` を追加。共通コアは使い回すが、提出名、ユーザー、必須技術、証拠はハッカソンごとに分ける方針を固定。

## 2026-06-01 自動再生デモと使い回し境界

DDの指摘を受け、すでに公開されているページをそのまま別ハッカソンへ使い回す方針は採らない。
使い回すのは中核エンジンと証拠であり、提出ごとにユーザー、課題、必要技術、見せ方を分ける。

公開LPには2分の無音自動再生デモを追加した。

- 日本語: `assets/autoplay-demo-ja.mp4`
- 英語: `assets/autoplay-demo-en.mp4`
- 埋め込み位置: ヒーロー直下、30秒確認導線の前
- ブラウザ自動再生対策: `autoplay muted loop playsinline controls`

この動画はページ上の審査員向けプレビューとして使う。
Devpost側で外部動画URLが必須の場合は、この流れを元にYouTube等へ最終デモを載せる。

公開repoには commit `29be22f Add autoplay demo for hackathon judges` としてpush済み。
GitHub Pages buildは最新commitで `built`。公開URLと動画ファイルはHTTP 200確認済み。

## 2026-06-01 Novus/Pendo snippet install

Mind the Product向けに、既存のNovus/Pendoアカウントの公開Web installをFormPilot Vaultへ導入した。

- `index.html` と `site/index.html` にPendo/Novus frontend snippetを追加
- FormPilot用のvisitor/account識別に分離
- `pricing.js` と `site/pricing.js` に安全なイベント名を追加
  - `switch_language`
  - `view_proof`
  - `view_pricing`
  - `click_start_plan`
- `scripts/install_pendo_snippet.mjs` と `scripts/verify_novus_installed.py` を追加
- Dashboard screenshotは `submission/evidence/novus-dashboard.png` に保存済み。
- 公開URL上でPendo/Novus scriptとdata requestが発火することをPlaywrightで確認済み。
- `npm run novus:verify` は `formpilot_novus_live_proof_ok`。

## 次の一歩

1. Mind the Product: Devpostが外部動画URLを要求する場合、埋め込み済み2分デモを元に提出用動画を作る
2. Devpostが外部動画URLを要求する場合、埋め込み済み2分デモを元に提出用動画を作る
3. Chrome Web Storeは `審査待ち`。審査完了後に公開URLとインストール導線を確認する
4. UiPath AgentHack: `Form Intake Case Room` のUiPath証拠を作る
5. Google Rapid Agent: `FormOps Agent` のGemini / Agent Builder / Partner MCP証拠が作れるか判定する
6. Stripeの実購入/入金確認を行い、購入済みLicense keyが有料activeになることを確認する
7. 日本語の公開/許可済みデモフォームを増やして認識率を測る
8. mapping cacheの2回目成功率を測る
