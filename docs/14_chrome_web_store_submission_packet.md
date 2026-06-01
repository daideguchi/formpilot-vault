# Chrome Web Store Submission Packet

作成日: 2026-06-01
状態: `dashboard_filled_submit_for_review_pending`

## 使うファイル

- 拡張ZIP: `dist/ai-form-autofill-0.1.0.zip`
- アイコン: `store-assets/icon-128.png`
- 小プロモ画像: `store-assets/promo-small-440x280.png`
- スクリーンショット:
  - `store-assets/screenshot-main-1280x800.png`
  - `store-assets/screenshot-popup-1280x800.png`
  - `store-assets/screenshot-pricing-1280x800.png`
- Privacy URL: `https://formpilot-vault-api.vercel.app/privacy.html`
- Support URL: `https://formpilot-vault-api.vercel.app/support.html`
- Product URL: `https://formpilot-vault-api.vercel.app/`

## Store Listing

Extension name:

```text
FormPilot Vault
```

Short description:

```text
Multilingual form autofill with a local profile vault and user confirmation.
```

Category:

```text
Workflow and Planning
```

Primary language:

```text
English
```

Localized extension UI:

```text
English, Japanese, Spanish, French, German, Portuguese (Brazil), Korean, Chinese (Simplified)
```

Detailed description:

```text
FormPilot Vault is a multilingual Chrome extension that reduces repetitive form-filling work for signups, contact forms, applications, event registrations, and trial forms.

It reads form labels, placeholders, autocomplete hints, options, and nearby text to understand what each field means. Profile values such as name, address, phone number, email, and company details are filled from the user's local Vault after user action.

The AI receives form structure only. It does not receive raw profile values, existing input values, cookies, authorization data, verification codes, or passwords.

FormPilot Vault does not click submit buttons. The user always reviews the filled form before submitting. It does not bypass CAPTCHA, SMS verification, email verification, identity checks, or create accounts in bulk.

The extension UI is localized for English, Japanese, Spanish, French, German, Portuguese, Korean, and Simplified Chinese. The form understanding rules cover common labels in those languages.

Free includes 5 fills per month. Plus, Pro, and Team plans unlock higher usage, multiple profiles, company profiles, and learned site mappings.
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
- Generated password values if the user keeps them in the local Vault.
- Usage count, license key, entitlement state, site origin/path mapping memory, and correction memory.

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
Worldwide
```

Pricing in Chrome Web Store:

```text
In-app purchases. The extension can be installed without paying, and paid upgrades are handled through Stripe Checkout.
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

## Localization Notes

Chrome extension package localization:

```text
The submitted ZIP includes default_locale: en and _locales for en, ja, es, fr, de, pt_BR, ko, and zh_CN.
```

Recommended first Store Listing locales:

```text
English: primary
Japanese: already prepared
Spanish, Portuguese (Brazil), French, German, Korean, Chinese (Simplified): add after initial review if the dashboard allows localized listings without slowing submission.
```

Global positioning:

```text
Use "multilingual form autofill" rather than "Japanese-only form autofill" for global listing copy. The strongest local claim remains Japanese form support, but the product now scans common labels in English, Japanese, Spanish, French, German, Portuguese, Korean, and Chinese.
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

## Dashboard入力済み

- Item ID: `kmlcabffhmenjajmlnkkglphjnbaahlf`
- 多言語ZIP upload済み
- Store Listing保存済み
- Privacy保存済み
- Distribution: Public / Worldwide / In-app purchases
- Test instructions保存済み
- `Submit for review` ボタンは有効。ただし未クリック。

## 人間操作が必要な停止点

- 最終 `Submit for Review` ボタン
- 審査後の公開確認または差し戻し対応

## 公式確認元

- `https://developer.chrome.com/docs/webstore/publish/`
- `https://developer.chrome.com/docs/webstore/cws-dashboard-privacy`
- `https://developer.chrome.com/docs/webstore/best_practices`
