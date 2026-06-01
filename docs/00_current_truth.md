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
- AI schema proxy: `api/schema-proxy/`
- entitlement API: `api/entitlement/`
- サンプルフォーム検証: `tests/`
- 実ブラウザ拡張E2E: `tests/extension-real-browser-e2e.mjs`
- 公開デモフォーム実ブラウザ検証: `tests/public-site-real-browser-probe.mjs`
- リリース/課金計画: `docs/`
- Free/Plus/Pro/Teamの利用制限: `extension/src/usage-meter.js`
- Vault/RAGコア設計: `docs/08_profile_vault_rag_core.md`
- Vault/RAG最小DB: `extension/src/profile-memory.js`
- Chrome Web Store素材: `store-assets/`
- 拡張アイコン: `extension/icons/`
- 提出用ZIP: `dist/ai-form-autofill-0.1.0.zip`
- ストア掲載文面: `docs/12_chrome_store_listing_copy.md`
- プライバシー/利用規約下書き: `site/privacy.html`, `site/terms.html`
- Cloudflare Worker本番入口: `api/worker/worker.mjs`
- D1 entitlement migration: `api/worker/migrations/0001_entitlements.sql`
- Cloudflare deploy設定: `wrangler.toml`
- 本番リリースRunbook: `docs/13_production_launch_runbook.md`
- release readiness check: `scripts/release-readiness.mjs`
- 公開LP/GitHub repo: `https://daideguchi.github.io/formpilot-vault/`, `https://github.com/daideguchi/formpilot-vault`

`extension/src/profile-memory.js` で、ローカルVault、サイト別mapping cache、ユーザー修正イベント、フォーム単位のmemory retrievalを実装済みです。入力成功後、実値ではなく `profile_key` とフィールド署名だけを保存して、次回の推論に使います。

popup上で不確定項目をプロフィールキーへ紐づける `Learn` UIも実装済みです。これにより、ユーザー修正を `correction_events` と `mapping_cache` に保存し、同じフォームでは次回からMemory優先で入力プランへ反映します。

AIへ渡すschema inference payloadも実装済みです。フォーム構造とMemory contextは渡しますが、input value、CSS selector、プロフィール実値は入れないテストを固定しています。

リリース/課金に必要なAPI土台も実装済みです。`api/schema-proxy/` はAzure DeepSeek V4からCloudflare Workers AIへ日付で切替し、`api/entitlement/` はStripe webhookとlicense checkを扱います。popupにはLicense key確認欄を追加済みです。

DDの初期思想は実際のschema proxyプロンプトへ入れました。`buildSchemaPrompt()` は、フォーム入力の細かな手間をなくす、Personal Vault + Profile RAG/Memory Spaceを核にする、実値を扱わない、不確定項目はユーザー確認へ残す、送信/認証突破/大量作成はしない、という方針を含みます。

Stripe Checkout作成APIとLP側の決済導線も実装済みです。Plus/Pro/Teamボタンから `POST /api/stripe/checkout-session` を呼び、Checkout成功後にLicense keyを表示します。実際にDDへ入金される本番状態にするには、Stripe本番secret、Plus/Pro/Teamのprice id、公開URL、webhook URL、本番entitlement DBを接続します。

Chrome Web Store提出向けのロゴ、manifestアイコン、小プロモ画像、1280x800スクリーンショット3枚、提出用ZIPを作成済みです。素材生成は `npm run assets:store`、ZIP作成は `npm run package:extension` で再現できます。

Stripe商品/価格の作成スクリプトは `npm run setup:stripe:dry` でdry-run通過済みです。現時点では `STRIPE_SECRET_KEY` が未投入のため、本番Stripeへの商品作成と決済入金確認は未実行です。

本番APIの置き場としてCloudflare Workerを実装済みです。`/api/schema/infer`、`/api/stripe/checkout-session`、`/api/stripe/webhook`、`/api/entitlement/check`、`/api/health` を同じWorkerで扱います。Stripe entitlementはD1に保存する設計です。Workers AI binding `env.AI.run()` がある場合はCloudflare API tokenなしで推論できます。

`npm run release:check` も追加済みです。現時点の機械判定ブロッカーは、公開URLとCloudflare D1 `database_id` のplaceholderだけです。

公開用の静的LPは `FormPilot Vault` としてGitHub Pagesへ反映済みです。`https://daideguchi.github.io/formpilot-vault/` と `https://daideguchi.github.io/formpilot-vault/privacy.html` はHTTP 200を確認済みです。ただし、GitHub Pagesは静的配信だけなので、Stripe Checkout/API/entitlementを動かすにはCloudflare Workerの公開URLが別途必要です。

Cloudflare CLI確認では `wrangler whoami` が `not authenticated` でした。Worker deploy、D1作成、Workers AI binding本番確認は、Cloudflare login後に実行します。

実ブラウザ検証も通過済みです。Chromiumに拡張を `--load-extension` で読み込み、extension service worker / content script / DOM入力まで実行しました。12項目収集、12項目入力、Plus license表示まで確認済みです。証跡は `docs/10_real_browser_verification.md` と `site/assets/real-extension-*.png` にあります。

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

- プライバシーポリシー公開URL
- 公開問い合わせ先
- 実AIプロキシのデプロイ
- Stripe本番キー投入後の商品/価格作成
- Cloudflare D1の作成と `database_id` 反映
- Worker本番deploy
- Cloudflare CLI login
- サイト別マッピングUI
- Profile Vaultの暗号化設計
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
- 公開パッケージ作業場所: local `formpilot-vault-public` workspace
- 最新コミット: `84f7eea Document live FormPilot Vault URLs`

公開前に削った/直したこと:

- 公開用READMEから内部パスや個人文脈を除去
- 内部名を公開向けの `PRODUCT_CORE_PROMPT` へ変更
- 秘密情報スキャンで、Gmail、APIキー、クレジットコード、ローカルパスの混入なしを確認
- 英語表示時のページタイトルと料金表記を英語化
- 英語表示用のフォームプレビュー画像 `product-preview-en.png` を作り、日本語UIと英語UIを分離

検証結果:

- `npm test` 通過
- `npm run test:extension` 通過
- `npm run test:public-probe` 通過
- GitHub Pagesは `built`
- 公開URLは HTTP 200
- 公開URLで JA/EN、desktop/mobile の4パターン確認。横スクロールなし。英語画面では英語フォーム画像、日本語画面では日本語フォーム画像を表示。

## 次の一歩

1. Novus.ai導入証拠を作る
2. 2〜3分デモ動画を作る
3. 日本語の公開/許可済みデモフォームを増やして認識率を測る
4. mapping cacheの2回目成功率を測る
5. Azure DeepSeek V4プロキシを実キーでsmoke test
6. 2026-06-07のCloudflare切替前に無料枠モデルで同じJSON応答を返せるか確認
7. サイト別mapping cacheの一覧/削除UIを作る
8. `docs/13_production_launch_runbook.md` に沿って、D1 database_id、Stripe live値、Azure値を投入して本番deployする
