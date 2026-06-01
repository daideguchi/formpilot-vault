# Chrome Web Store Listing Copy

作成日: 2026-06-01
状態: `ready_for_submission`

## 拡張名

FormPilot Vault

## 短い説明

日本語フォームを読み取り、端末内Vaultのプロフィールから確認つきで自動入力します。

## 詳細説明

AIフォームオートフィルは、会員登録、資料請求、問い合わせ、イベント申込、無料トライアル登録などで発生する反復入力を減らすChrome拡張です。

フォーム上のラベル、placeholder、autocomplete、選択肢、周辺テキストを読み取り、入力欄の意味を推定します。氏名、住所、電話番号、メール、会社情報などの実値は、ユーザーの端末内Vaultから入力します。

AIへ送るのはフォーム構造だけです。プロフィールの実値、入力済みvalue、Cookie、Authorization情報、パスワードは送信しません。

送信ボタンは自動で押しません。入力後は必ずユーザーが内容を確認して送信します。CAPTCHA、SMS認証、メール認証、本人確認の突破や、大量アカウント作成を目的にした機能は提供しません。

## 単一目的

ユーザー本人が開いたフォームへ、端末内プロフィール情報を確認つきで自動入力すること。

## 権限説明

- `activeTab`: ユーザーが現在開いているフォームを、明示操作時だけ解析するため。
- `scripting`: ユーザー操作時にcontent scriptを注入し、DOM収集と入力反映を行うため。
- `storage`: 端末内プロフィール、ライセンス状態、利用回数、サイト別マッピングを保存するため。

## データ利用説明

- ローカル保存: プロフィール、利用回数、サイト別マッピング、ユーザー修正イベント、ライセンス状態。
- サーバー送信: フォーム構造、Memory context、ライセンス確認情報、Stripe subscription event。
- 送信しない情報: プロフィール実値、入力済みvalue、Cookie、Authorization token、パスワード、CAPTCHA/SMS/メール認証情報。

## 掲載アセット

- アイコン: `store-assets/icon-128.png`
- 小プロモ: `store-assets/promo-small-440x280.png`
- スクリーンショット:
  - `store-assets/screenshot-main-1280x800.png`
  - `store-assets/screenshot-popup-1280x800.png`
  - `store-assets/screenshot-pricing-1280x800.png`

## 公開URL

- Product URL: `https://formpilot-vault-api.vercel.app/`
- Privacy URL: `https://formpilot-vault-api.vercel.app/privacy.html`
- Checkout API: `https://formpilot-vault-api.vercel.app/api/stripe/checkout-session`
- Entitlement API: `https://formpilot-vault-api.vercel.app/api/entitlement/check`

## 提出パケット

Dashboardに貼り付ける詳細値は `docs/14_chrome_web_store_submission_packet.md` を使います。
