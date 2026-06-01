# Chrome Web Store Submission Packet

作成日: 2026-06-01
状態: `ready_for_human_dashboard_input`

## 使うファイル

- 拡張ZIP: `dist/ai-form-autofill-0.1.0.zip`
- アイコン: `store-assets/icon-128.png`
- 小プロモ画像: `store-assets/promo-small-440x280.png`
- スクリーンショット:
  - `store-assets/screenshot-main-1280x800.png`
  - `store-assets/screenshot-popup-1280x800.png`
  - `store-assets/screenshot-pricing-1280x800.png`
- Privacy URL: `https://formpilot-vault-api.vercel.app/privacy.html`
- Product URL: `https://formpilot-vault-api.vercel.app/`

## Store Listing

Extension name:

```text
FormPilot Vault
```

Short description:

```text
日本語フォームを読み取り、端末内Vaultのプロフィールから確認つきで自動入力します。
```

Category:

```text
Productivity
```

Language:

```text
Japanese
```

Detailed description:

```text
FormPilot Vaultは、会員登録、資料請求、問い合わせ、イベント申込、無料トライアル登録などで発生する反復入力を減らすChrome拡張です。

フォーム上のラベル、placeholder、autocomplete、選択肢、周辺テキストを読み取り、入力欄の意味を推定します。氏名、住所、電話番号、メール、会社情報などの実値は、ユーザーの端末内Vaultから入力します。

AIへ送るのはフォーム構造だけです。プロフィールの実値、入力済みvalue、Cookie、Authorization情報、パスワードは送信しません。

送信ボタンは自動で押しません。入力後は必ずユーザーが内容を確認して送信します。CAPTCHA、SMS認証、メール認証、本人確認の突破や、大量アカウント作成を目的にした機能は提供しません。

Freeは月5回まで利用できます。Plus/Pro/Teamでは、利用回数、複数プロフィール、会社プロフィール、チーム用途へ広げます。
```

## Privacy Practices

Single purpose:

```text
ユーザー本人が開いたフォームへ、端末内プロフィール情報を確認つきで自動入力すること。
```

Permission justifications:

```text
activeTab:
ユーザーが現在開いているフォームを、ユーザーの明示操作時だけ解析するために使います。

scripting:
ユーザー操作時にcontent scriptを注入し、フォームDOMの収集と入力反映を行うために使います。

storage:
端末内プロフィール、ライセンス状態、利用回数、サイト別マッピング、ユーザー修正イベントを保存するために使います。
```

Remote code:

```text
No. The extension does not load or execute remotely hosted JavaScript. It only calls HTTPS APIs for schema inference, entitlement checks, and Stripe Checkout session creation. All executable extension code is packaged in the submitted ZIP.
```

User data disclosure:

```text
Collected/stored locally:
- Personally identifiable information entered by the user into the local profile Vault, such as name, email, phone number, address, company, department, and title.
- Usage count, license key, entitlement state, and site-specific mapping memory.

Sent to server:
- Form structure from the active page, such as field labels, placeholder text, autocomplete attributes, field types, option labels, and nearby text.
- Memory context made of profile keys and field signatures, not profile values.
- License key for entitlement checks.
- Stripe checkout/subscription metadata needed for paid plan activation.

Not sent:
- Profile values such as actual name, address, phone number, email, or company details.
- Filled input values from the page.
- Cookies, Authorization headers, browser credentials, CAPTCHA/SMS/email verification codes, or passwords.
- Payment card details. Stripe handles checkout directly.
```

Limited use certification:

```text
The data is used only to provide user-confirmed form autofill and paid entitlement checks. It is not sold, not used for advertising, not used for unrelated profiling, and not transferred except to service providers required to provide this functionality.
```

## Distribution

Visibility:

```text
Public
```

Countries:

```text
Japan first
```

Pricing in Chrome Web Store:

```text
Free install. Paid upgrades are handled outside Chrome Web Store through Stripe.
```

Paid plans:

```text
Free: 月5回まで
Plus: 580円/月
Pro: 1,480円/月
Team: 1,500円/人/月
```

Publishing:

```text
Automatic publish after review is acceptable for MVP unless DD wants staged publishing.
```

## Test Instructions For Reviewers

```text
No test account is required.

1. Install the extension.
2. Open https://httpbin.org/forms/post or https://www.selenium.dev/selenium/web/web-form.html.
3. Open the FormPilot Vault extension popup.
4. Click "Load sample" if the sample profile is not already visible.
5. Click "Save profile".
6. Click "Scan page".
7. Confirm that fields are listed as ready or needing review.
8. Click "Fill page".
9. Confirm that supported fields are filled.
10. Do not submit the form. The extension intentionally does not click submit buttons.

The extension uses only activeTab, so it reads and fills the current page only after the user opens the popup and starts the action.
```

## 人間操作が必要な停止点

- Chrome Web Store Developer Dashboardへのログイン
- 初回開発者登録、本人確認、支払い/登録費確認が出た場合の承認
- Item upload: `dist/ai-form-autofill-0.1.0.zip`
- Store Listing / Privacy / Distribution / Test instructions の貼り付け
- 最終 `Submit for Review` ボタン
- 審査後の公開確認または差し戻し対応

## 公式確認元

- `https://developer.chrome.com/docs/webstore/publish/`
- `https://developer.chrome.com/docs/webstore/cws-dashboard-privacy`
- `https://developer.chrome.com/docs/webstore/best_practices`
