# リリースロードマップ

作成日: 2026-06-01

## Phase 0: コンセプト固定

状態: `done`

- 初期コンセプトを固定
- B2CはChrome拡張を本線に決定
- Playwrightは検証/B2Bへ分離
- AIに個人情報を渡さない設計を固定

## Phase 1: ローカルMVP

状態: `in_progress`

完了条件:

- サンプルフォームでDOM収集できる
- 日本語ラベルからプロフィールキーへ対応づけできる
- ユーザー確認つき入力プランを表示できる
- content scriptで入力できる
- 送信ボタンは押さない
- Playwright smokeが通る
- Profile Vault / mapping cache / correction eventsの最小DBがある
- 入力成功後にサイト別マッピングを学習できる
- 実ブラウザに拡張を読み込み、content scriptで実DOMへ入力できる

現状:

- 上記はローカルMVPとして通過
- 実ブラウザE2Eも通過
- 公開デモフォーム2件の実ブラウザ検証も通過
- 次は日本語フォームの検証数を増やす

## Phase 2: AIスキーマ推定

状態: `worker_ready_pending_live_secrets`

完了条件:

- ルールで分からない項目だけAIに渡す
- AIにはフォーム構造だけ送る
- Azure DeepSeek V4でJSONマッピングを返す
- 2026-06-07以降、Cloudflare Workers AI無料枠モデルへ切替できる
- プロバイダ差し替えで同じ入力プラン形式を維持できる
- Memory Spaceの候補ルールをAIプロンプトへ渡し、実値は渡さない

現状:

- AI schema proxyのコードは実装済み
- Cloudflare Worker routeを実装済み
- Workers AI binding `env.AI.run()` から呼べるように実装済み
- 初期プロダクト方針を実schema promptへ反映済み
- unsafe payload拒否とprovider response正規化のテストは通過
- 次はAzure/Cloudflareの実環境変数を入れたsmoke test

## Phase 3: Beta配布

状態: `assets_ready_pending_public_url`

完了条件:

- Chrome Web Store向け素材を作る
- プライバシーポリシーを公開
- 利用規約を作る
- 10人の初期ユーザーで実フォーム検証
- KPI計測をローカル匿名集計で始める

現状:

- Chrome Web Store素材、提出用ZIP、Privacy/Terms下書き、掲載文面は作成済み
- 公開URLと問い合わせ先の確定が残り

## Phase 4: 課金開始

状態: `worker_ready_pending_stripe_live`

完了条件:

- Free: 月5回まで
- Plus: 無制限 + 複数プロフィール
- Pro: 会社プロフィール + 履歴 + 長文補助
- Stripe CheckoutまたはChrome Web Store外の安全な課金導線

現状:

- entitlement APIとStripe webhook受け口は実装済み
- Stripe Checkout Session作成APIは実装済み
- LPのPlus/Pro/Team決済ボタンとsuccessページは実装済み
- popupのLicense key確認UIは実装済み
- Cloudflare D1 entitlement schemaとWorker routeは実装済み
- 次はStripe商品/価格作成、D1 database_id反映、Worker deploy

## Phase 5: Team/B2B

状態: `planned`

完了条件:

- チームプロフィール
- 共有テンプレート
- 監査ログ
- CSVから複数システムへ入力するPlaywrightエージェント
- 導入費と月額の法人プラン
