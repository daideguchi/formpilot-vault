# AIフォームオートフィル

状態: `vercel_live_checkout_ready`
作成日: 2026-06-01
最終ゴール: `Chrome拡張のリリースと課金開始`

## 事業の芯

フォームを入力する人たちの細かな手間を、自動入力で解決する。

日本語の新規登録フォーム、資料請求フォーム、問い合わせフォームで毎回発生する、名前、住所、電話番号、会社情報、カナ、郵便番号、生年月日などの反復入力を、ユーザー本人の確認つきで減らす。

一番のコアは、個人情報をためておく `Profile Vault` と、AIがどの情報を使うべきか推論するための `入力判断用RAG/記憶スペース` です。ここが事業価値の中心です。

最初の中核はこの4つです。

1. DOMを収集する
2. AIまたはルールでフォームスキーマを作る
3. 端末内のプロフィールDBから値を選ぶ
4. Chrome拡張のcontent scriptで入力する

初期MVPでは送信ボタンを押しません。入力後、ユーザーが画面で確認して送信します。

## いま作るもの

- `extension/`: Chrome拡張MVP
- `tests/`: サンプルフォームと精度検証
- `site/`: リリース前LPのたたき台
- `docs/`: 事業、API、リリース、課金の正本
- `data/templates/`: プロフィールDBと意味キーのテンプレート

Vault/RAGの最小DBは `extension/src/profile-memory.js` に実装済みです。ローカルVault、サイト別mapping cache、ユーザー修正イベント、フォーム単位のmemory retrievalを持ち、入力成功後に次回用のマッピングを学習します。不確定項目はpopup上の `Learn` UIでプロフィールキーへ紐づけられます。AIへ渡す安全ペイロードは `extension/src/ai-payload.js` で作り、実値とselectorを除外します。

リリース/課金用のAPI土台も入っています。AI schema proxyは `api/schema-proxy/`、課金解除用のentitlement APIは `api/entitlement/` です。拡張側にはLicense key確認UIを追加済みです。

DDの初期思想は `api/schema-proxy/schema-proxy.js` の実プロンプトへ組み込み済みです。Stripe CheckoutはPlus/Pro/Teamのボタンから `POST /api/stripe/checkout-session` を呼ぶ形で実装済みです。

Chrome Web Store向けのロゴ/アイコン/プロモ画像/スクリーンショットは `npm run assets:store` で生成します。提出用ZIPは `npm run package:extension` で `dist/ai-form-autofill-0.1.0.zip` に作成します。
Dashboardに貼る提出項目は `docs/14_chrome_web_store_submission_packet.md` にまとめています。

現行本番はVercelで、LP、AI schema proxy、Stripe Checkout、license entitlementを `https://formpilot-vault-api.vercel.app/` にまとめています。StripeはKurogane側の本番secretを使うFormPilot専用ブリッジへ中継し、Checkout Session作成まで本番で確認済みです。Cloudflare Worker/D1は、2026-06-07以降の無料枠移行に向けた将来経路です。手順は `docs/13_production_launch_runbook.md` が正本です。

実ブラウザ検証は `tests/extension-real-browser-e2e.mjs` で通過済みです。Chromiumへ拡張を読み込み、content scriptを実DOMへ投入して14項目を入力し、登録台帳の会員ID/紹介コード、License key確認UIのPlus表示まで確認しています。フォーム確認で見つけた未登録項目を、その場で登録台帳へ追加する導線も入っています。

公開デモフォーム検証は `tests/public-site-real-browser-probe.mjs` で通過済みです。送信はせず、公開ページ上でDOM収集と入力反映だけ確認しています。

Freeは月20回までの自動入力に制限し、Plus/Pro/Teamで無制限入力、複数プロフィール、会社プロフィール、チーム共有へ広げます。

## ハッカソン転用

このプロダクトは、賞金狙いのハッカソンにも転用します。

優先順位:

1. Mind the Product: `FormPilot Vault`
2. UiPath AgentHack: `Form Intake Case Room`
3. Google Cloud Rapid Agent: `FormOps Agent`

詳細は `docs/11_hackathon_submission_strategy.md` を正本にします。

## API方針

- 2026-06-06 までは `Azure DeepSeek V4`
- 2026-06-07 以降は `Cloudflare Workers AI` の無料枠モデル
- AIへ送るのはフォーム構造だけ
- 氏名、住所、電話、メール、パスワードなどの実値は送らない
- Azure未投入時のVercel本番はCloudflare Worker live schemaへ委譲し、それも失敗した時だけ `rules_fallback` でフォーム理解を継続する

## 実行コマンド

```bash
cd /Users/dd/000_AI組織/10_事業記録/事業別/90_AIフォームオートフィル
npm test
npm run test:checkout-site
npm run test:extension
npm run test:public-probe
npm run assets:store
npm run package:extension
npm run setup:stripe:dry
npm run release:check
npm run dev:schema-proxy
npm run dev:entitlement
```

Chromeで試す時は `chrome://extensions` から `extension/` を「パッケージ化されていない拡張機能」として読み込みます。
