# Chrome Web Store Listing Copy

作成日: 2026-06-01
状態: `ready_for_submission`

## 拡張名

FormPilot Vault

## 短い説明

Multilingual form autofill with a local profile vault and user confirmation.

## Global short description

Multilingual form autofill with a local profile vault and user confirmation.

## 詳細説明

FormPilot Vault is a multilingual Chrome extension that reduces repetitive form-filling work for signups, contact forms, applications, event registrations, and trial forms.

It reads form labels, placeholders, autocomplete hints, options, and nearby text to understand what each field means. Profile values such as name, address, phone number, email, and company details are filled from the user's local Vault after user action.

The AI receives form structure only. It does not receive raw profile values, existing input values, cookies, authorization data, verification codes, or passwords.

FormPilot Vault does not click submit buttons. The user always reviews the filled form before submitting. It does not bypass CAPTCHA, SMS verification, email verification, identity checks, or create accounts in bulk.

The extension UI is localized for English, Japanese, Spanish, French, German, Portuguese, Korean, and Simplified Chinese. The form understanding rules cover common labels in those languages.

Free includes 5 fills per month. Plus, Pro, and Team plans unlock higher usage, multiple profiles, company profiles, and learned site mappings.

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
- Support URL: `https://formpilot-vault-api.vercel.app/support.html`
- Checkout API: `https://formpilot-vault-api.vercel.app/api/stripe/checkout-session`
- Entitlement API: `https://formpilot-vault-api.vercel.app/api/entitlement/check`

## 言語対応

- Extension package: `default_locale: en`
- UI locales: `en`, `ja`, `es`, `fr`, `de`, `pt_BR`, `ko`, `zh_CN`
- Form label rules: English, Japanese, Spanish, French, German, Portuguese, Korean, Chinese
- Distribution: Worldwide
- Chrome Web Store category: Workflow and Planning
- Chrome Web Store payment disclosure: In-app purchases

## 提出パケット

Dashboardに貼り付ける詳細値は `docs/14_chrome_web_store_submission_packet.md` を使います。
