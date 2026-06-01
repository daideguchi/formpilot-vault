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
English, English UK, Japanese, Spanish, Spanish Latin America, French, German, Italian, Dutch, Polish, Portuguese Brazil, Russian, Turkish, Arabic, Hindi, Indonesian, Thai, Vietnamese, Korean, Chinese Simplified, Chinese Traditional
```

Detailed description:

```text
FormPilot Vault is a multilingual Chrome extension that reduces repetitive form-filling work for signups, contact forms, applications, event registrations, and trial forms.

It reads form labels, placeholders, autocomplete hints, options, and nearby text to understand what each field means. Profile values such as name, address, phone number, email, and company details are encrypted at rest in the user's local Vault and filled only after user action.

The AI receives form structure only. It does not receive raw profile values, existing input values, cookies, authorization data, verification codes, or passwords.

FormPilot Vault does not click submit buttons. The user always reviews the filled form before submitting. It does not bypass CAPTCHA, SMS verification, email verification, identity checks, or create accounts in bulk.

The extension UI is localized for 21 Chrome package locales across the Americas, Europe, the Middle East, and Asia. The form understanding layer uses the production schema API first, then falls back to local rules. It covers common labels across major global signup markets, including country and country-code fields.

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
- Personally identifiable information entered by the user into the local profile Vault, such as name, email, phone number, address, company, department, and title. Profile values are encrypted at rest before being stored.
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
The submitted ZIP includes default_locale: en and _locales for en, en_GB, ja, es, es_419, fr, de, it, nl, pl, pt_BR, ru, tr, ar, hi, id, th, vi, ko, zh_CN, and zh_TW. As of 2026-06-01 13:28 JST, the package has 65 localized message keys per locale and the rebuilt ZIP size is 69309 bytes.
```

Recommended first Store Listing locales:

```text
English: primary
Japanese: already prepared
Spanish, Spanish (Latin America), Portuguese (Brazil), French, German, Italian, Dutch, Polish, Turkish, Arabic, Hindi, Indonesian, Thai, Vietnamese, Korean, Chinese (Simplified), Chinese (Traditional): add as localized Store Listing variants after review if dashboard work does not slow the first public release.
```

Global positioning:

```text
Use "multilingual form autofill" rather than "Japanese-only form autofill" for global listing copy. The strongest local claim remains Japanese form support, but the product now scans common labels across major global signup markets.
```

Language strategy:

```text
Worldwide release is part of the business strategy. Language support means UI locale, form label understanding, locale_context for schema inference, country-specific formatting, and learned site mappings. The first release should stay English-primary in the Store to avoid delaying submission; localized Store Listing variants can be added after review. The extension sends only safe form structure and locale context to the schema API, not profile values.
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
- 多言語ZIP upload済み。2026-06-01 13:35 JSTに最新ZIP `69309 bytes` をPackage画面から再upload済み
- Store Listing保存済み
- Privacy保存済み
- Distribution: Public / Worldwide / In-app purchases
- Test instructions保存済み
- 2026-06-01 13:43 JST時点のDashboardステータスは `審査待ち`
- `審査のため送信` ボタンはdisabled。最終提出は完了済み。

## 人間操作が必要な停止点

- 審査後の公開確認または差し戻し対応
- Stripe実購入/入金確認

## 公式確認元

- `https://developer.chrome.com/docs/webstore/publish/`
- `https://developer.chrome.com/docs/webstore/cws-dashboard-privacy`
- `https://developer.chrome.com/docs/webstore/best_practices`
