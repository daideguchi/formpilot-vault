# Chrome Web Store Submission Packet

作成日: 2026-06-01
状態: `published_update_package_ready`

## 使うファイル

- 拡張ZIP: `dist/ai-form-autofill-0.1.1.zip`
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
Reduce repeated name, address, and email typing. Check the current form and fill only fields that match your saved info.
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
Free: 月20回まで
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
The latest built ZIP includes default_locale: en and _locales for en, en_GB, ja, es, es_419, fr, de, it, nl, pl, pt_BR, ru, tr, ar, hi, id, th, vi, ko, zh_CN, and zh_TW. As of 2026-06-02 09:47 JST, the package has 152 localized message keys per locale, a clearer non-selectable 3-step popup flow, clearer "will autofill" status copy, tabbed saved info / ledger / plan settings, a user-friendly registration ledger used as a personal dictionary, ledger search, row categories, quick-add dictionary rows for customer IDs, spreadsheet terms, and internal IDs, aliases for custom matching, an in-scan action to add newly detected fields to the ledger with a highlighted saved row, blank initial values with examples as placeholders, split phone-number inputs, ZipCloud postal-code address lookup for Japanese addresses, a visible "Registered." save confirmation, Free 20 fills per month, and the rebuilt ZIP size is 105168 bytes.
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
4. Open "Saved Info / Saved info ledger / Plan" only if you need to edit saved information, add ledger rows, or check the plan.
5. Click "Check this form".
7. Confirm that fields are listed as ready or needing review.
8. Click "Fill matching fields".
9. Confirm that supported fields are filled.
10. Do not submit the form. The extension intentionally does not click submit buttons.

The extension uses only activeTab, so it reads and fills the current page only after the user opens the popup and starts the action.
```

## Dashboard入力済み

- Item ID: `kmlcabffhmenjajmlnkkglphjnbaahlf`
- 多言語ZIP upload済み。2026-06-02 08:36 JSTの公開URL確認で `published: true`
- 2026-06-02 09:47 JSTにUIUX改善/辞書登録強化/住所自動検索/電話番号3分割/空の初期値/Free月20回版ZIP `0.1.1` / `105168 bytes` をCWS Dashboardへuploadし、更新審査へ送信済み
- Dashboard読み戻しは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`
- `store-assets/screenshot-popup-1280x800.png` は辞書登録UI版へ更新済み
- Store Listing保存済み。短い説明と詳細説明は「repeated name/address/email typing」「saved info」「Check this form」「Fill matching fields」に統一済み
- Privacy保存済み
- Distribution: Public / Worldwide / In-app purchases
- Test instructions保存済み。次回更新時は最新UIの `Saved info / Saved info ledger / Plan`, non-selectable 3-step flow, and dictionary ledger controlsに合わせて確認する
- 2026-06-02 08:36 JST時点の公開URLは `published: true`
- 2026-06-02 09:47 JSTに `0.1.1` をDashboardへuploadし、更新審査へ送信済み。Dashboard読み戻しは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`

## 人間操作が必要な停止点

- `0.1.1` 更新審査の通過後公開確認、または差し戻し対応
- 実購入/入金確認

## 公式確認元

- `https://developer.chrome.com/docs/webstore/publish/`
- `https://developer.chrome.com/docs/webstore/cws-dashboard-privacy`
- `https://developer.chrome.com/docs/webstore/best_practices`
