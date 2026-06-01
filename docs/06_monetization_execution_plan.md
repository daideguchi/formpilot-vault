# マネタイズ実行計画

作成日: 2026-06-01
状態: `mvp_monetization_wired`

## 原則

売るものはAIではなく、フォーム入力の細かな手間が減ることです。

最初の課金理由はこの3つに絞ります。

1. 月5回を超えて使いたい
2. 複数プロフィールを使いたい
3. 会社情報、部署、役職、住所複数を保存したい

中長期の一番強い課金理由は、ユーザー専用に育った `Profile Vault + 入力判断用RAG/記憶スペース` です。これは使うほど価値が増え、乗り換えにくくなる資産になります。

実装上も、入力成功後に `mapping_cache` が育つ形へ寄せました。Freeは月5回なので学習価値を体験できるが、日常的に記憶を育て続けるにはPlus以上が必要、という課金構造にします。

世界配信では、言語対応を単独課金にしません。多言語フォームを自然に埋められることを利用開始の入口にし、課金理由は月5回超過、複数プロフィール、会社プロフィール、サイト別Memoryに集中させます。

この判断により、初期グロースは日本語専用ではなく世界配信を本線にします。Free月5回は維持し、海外ユーザーにも早い段階でPlus/Pro/Teamの価値が見えるようにします。

## Free / Paid境界

| 機能 | Free | Plus | Pro | Team |
|---|---:|---:|---:|---:|
| 月間自動入力 | 5回 | 無制限 | 無制限 | 無制限 |
| 基本プロフィール | 1個 | 複数 | 複数 | チーム共有 |
| サイト別学習 | ローカルのみ | あり | あり | 共有テンプレート |
| 会社プロフィール | なし | なし | あり | あり |
| 入力判断RAG/記憶 | なし | ローカル | ローカル強化 | チーム共有 |
| 監査ログ | なし | なし | 簡易 | あり |

## 課金導線

Chrome Web Store Paymentsは既に非推奨/終了済みのため、課金は外部決済とライセンスAPIで行います。

初期候補:

- Stripe Checkout + Supabase/Vercel DB
- Paddle/DodoなどMerchant of Record
- ExtensionPayなど拡張向け決済ラッパー

MVPではまず `Stripe Checkout + webhook -> entitlement API -> extension storage` を基本線にします。

```text
extension
  -> pricing page
  -> Stripe Checkout
  -> webhook
  -> entitlement DB
  -> extension checks license
  -> Plus/Pro features unlock
```

## 実装済み

- `api/entitlement/entitlement.js`
  - Stripe Checkout Session作成
  - Free/Plus/Pro/Teamのentitlement正規化
  - Stripe webhookイベントからplanを更新
  - Stripe署名検証
- `api/entitlement/server.mjs`
  - `POST /api/stripe/checkout-session`
  - `GET/POST /api/entitlement/check`
  - `POST /api/stripe/webhook`
- `extension/src/entitlement-client.js`
  - License keyをAPIへ送り、active planだけを保存

- `extension/src/usage-meter.js`
  - Free月5回の制限
  - Plus/Pro/Teamの無制限枠
  - origin単位の安全な利用イベント
- `extension/src/profile-memory.js`
  - ローカルVault
  - サイト別mapping cache
  - ユーザー修正イベント
  - 実値を保存しない入力判断用Memory
- `popup.html`
  - Plan表示
  - Upgrade導線
  - Free使用量表示
  - Vault memory表示
  - 不確定項目をプロフィールキーへ保存するLearn UI
  - License key確認欄
- `site/index.html` / `site/pricing.js` / `site/success.html`
  - Plus/Pro/TeamのCheckoutボタン
  - Checkout成功後のLicense key表示
- `scripts/setup-stripe-products.mjs`
  - Plus/Pro/TeamのStripe商品/価格作成
  - webhook endpoint作成
  - 本番環境変数に入れるprice map出力

## 次に作るもの

1. Stripe商品/価格IDを `STRIPE_PLAN_PRICE_MAP` と `STRIPE_PRICE_PLAN_MAP` に接続
2. entitlement DBをローカルJSONから永続DBへ移す
3. 拡張側で本番entitlement URLを参照
4. Free制限到達時だけ自然にアップグレード提示
5. 本番Checkoutを1件テストする

## 公式確認メモ

- Chrome Web Storeのポリシーは、責任あるマーケティング/マネタイズ、支払い、プライバシー、権限最小化を要求している。
- Chrome Web Store Paymentsは非推奨化され、別の支払い処理とライセンス追跡への移行が必要とされている。
- Stripe Checkoutはsubscription modeで定額、従量、階層型などのサブスクリプションを扱える。

参照:

- https://developer.chrome.com/docs/webstore/program-policies
- https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/webstore/cws-payments-deprecation/index.md
- https://docs.stripe.com/payments/subscriptions
