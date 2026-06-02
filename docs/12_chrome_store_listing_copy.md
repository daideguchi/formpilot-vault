# Chrome Web Store Listing Copy

作成日: 2026-06-01
状態: `ready_for_submission`

## 拡張名

FormPilot Vault

## 短い説明

Reduce repeated name, address, and email typing. Check the current form and fill only fields that match your saved info.

## Global short description

Reduce repeated name, address, and email typing. Check the current form and fill only fields that match your saved info.

## 詳細説明

FormPilot Vault helps you avoid typing the same information again and again.

When you sign up for a service, request a trial, register for an event, or fill in a contact form, you often have to enter the same name, email, phone number, address, and company details. This extension is built for that moment.

How it works:

1. Save the information you often type.
2. Open a form.
3. Click the extension button.
4. Click "Check this form".
5. Review the fields it found.
6. Click "Fill matching fields".

FormPilot Vault only fills fields that match your saved information. If a field is unclear, it leaves the field for you to enter manually.

It does not click submit buttons. You always review the page before sending anything. It does not bypass CAPTCHA, SMS checks, email checks, identity checks, payment pages, or create accounts in bulk.

Use it for signups, trial registrations, contact forms, event forms, application forms, and business inquiry forms.

Saved information stays in your browser. FormPilot Vault reads and fills the current page only after you click the extension button and start the action.

Free includes 20 fills per month. Paid plans add more fills, multiple saved information sets, and site-specific learning.

## 単一目的

ユーザー本人が開いたフォームへ、端末内プロフィール情報を確認つきで自動入力すること。

## 権限説明

- `activeTab`: ユーザーが現在開いているフォームを、明示操作時だけ解析するため。
- `scripting`: ユーザー操作時にcontent scriptを注入し、DOM収集と入力反映を行うため。
- `storage`: 端末内プロフィール、ライセンス状態、利用回数、サイト別マッピングを保存するため。

## データ利用説明

- ローカル保存: 暗号化されたプロフィール、利用回数、サイト別マッピング、ユーザー修正イベント、ライセンス状態。
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
- UI locales: `en`, `en_GB`, `ja`, `es`, `es_419`, `fr`, `de`, `it`, `nl`, `pl`, `pt_BR`, `ru`, `tr`, `ar`, `hi`, `id`, `th`, `vi`, `ko`, `zh_CN`, `zh_TW`
- Form label rules: English, Japanese, Spanish, French, German, Portuguese, Korean, Chinese, Italian, Dutch, Polish, Russian, Turkish, Arabic, Hindi, Indonesian, Thai, Vietnamese
- Distribution: Worldwide
- Chrome Web Store category: Workflow and Planning
- Chrome Web Store payment disclosure: In-app purchases

## 提出パケット

Dashboardに貼り付ける詳細値は `docs/14_chrome_web_store_submission_packet.md` を使います。
