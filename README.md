# FormPilot Vault

**AI form autofill that keeps private values on the user's device.**

FormPilot Vault is a Chrome extension MVP for people who repeatedly fill out signup, contact, lead, event, trial, and application forms. It reads the form structure, prepares a fill plan, and fills fields only after the user reviews the plan. It never presses submit.

The product thesis is simple:

> AI should understand the form, not collect the user's private data.

## 30-Second Judge Path

1. Open the live app: <https://daideguchi.github.io/formpilot-vault/>
2. Watch the demo: <https://youtu.be/q-HreuLw5F8>
3. Open the judge demo page: <https://daideguchi.github.io/formpilot-vault/demo.html>
4. Check the Novus/Pendo proof: [`submission/evidence/novus-dashboard.png`](submission/evidence/novus-dashboard.png)
5. Run the verification commands below.

## Who It Helps

FormPilot Vault is for solo builders, operators, founders, and small teams who fill out the same kinds of forms every week while shipping products, joining tools, applying to platforms, setting up trials, contacting partners, and running customer workflows.

## The Problem

Browser autofill works for simple forms, but it breaks down when forms:

- split first and last names in unusual ways
- ask for kana, company, department, or role fields
- divide addresses into multiple fields
- use different wording for the same meaning
- need site-specific context
- require the user to check uncertain fields before sending

People still waste time typing the same safe information into slightly different forms.

## The Solution

FormPilot Vault turns repeated form typing into a reviewed workflow:

1. The extension scans the form structure.
2. The form schema engine maps fields to safe profile keys.
3. Private values stay in the encrypted local Vault.
4. The user reviews the fill plan.
5. The extension fills the page after user action.
6. The user decides whether to submit.

Raw names, addresses, phone numbers, emails, passwords, cookies, and selectors are not sent to AI.

## What Is Built

- Chrome extension MVP
- Encrypted local Profile Vault
- Site memory and mapping cache
- Safe AI schema payload that excludes raw personal values
- Human review before filling
- No automatic submit
- English/Japanese public landing page
- 21 Chrome extension locales
- Real browser extension E2E proof
- Public form probes with no submission
- Novus/Pendo install and public event verification
- Demo video under three minutes

## Hackathon Fit

This repository is prepared for the **Mind the Product Presents: World Product Day Hackathon**.

Submission requirements covered:

- Public deployed app: <https://daideguchi.github.io/formpilot-vault/>
- Demo video under 3 minutes: <https://youtu.be/q-HreuLw5F8>
- Demo page: <https://daideguchi.github.io/formpilot-vault/demo.html>
- Novus/Pendo install proof: [`submission/evidence/novus-dashboard.png`](submission/evidence/novus-dashboard.png)
- Novus install notes: [`submission/evidence/novus-install-notes.md`](submission/evidence/novus-install-notes.md)
- Devpost draft: [`submission/mind-the-product-devpost-draft.md`](submission/mind-the-product-devpost-draft.md)
- Submit packet: [`submission/mind-the-product-submit-packet.md`](submission/mind-the-product-submit-packet.md)

## Built With

- JavaScript
- Chrome Extensions Manifest V3
- Playwright
- GitHub Pages
- Novus/Pendo
- Cloudflare Worker entrypoint
- D1 schema for future entitlement storage
- Stripe Checkout API contracts

## Verification

```bash
npm test
npm run test:extension
npm run test:public-probe
npm run novus:verify
npm run novus:public
npm run release:check
```

Latest verified state:

- Extension E2E fills 12 fields.
- Public probes run without submitting forms.
- Novus/Pendo is installed on the public app and demo page.
- Public smoke observes `cdn.pendo.io` and `data.pendo.io` requests.
- GitHub Pages is live.

## Honest Boundaries

- FormPilot Vault does not submit forms.
- It does not bypass CAPTCHA, SMS, email verification, identity checks, or login gates.
- It does not bulk-create accounts.
- AI receives form structure, not raw personal values.
- If live AI credentials are unavailable, deterministic rules fallback keeps the demo working.
- Cloudflare Worker/D1 is prepared as a production path; the current hackathon proof is the public app plus local extension verification.

## Japanese Summary

FormPilot Vaultは、同じようなフォーム入力を何度もする人のためのChrome拡張MVPです。

AIはフォームの形だけを読みます。名前、住所、電話番号、メールなどの実データは、端末内の暗号化Vaultに置きます。入力前に人間が確認し、送信ボタンは自動で押しません。

一言で言うと、**AIに個人情報を渡さず、面倒なフォーム入力を速くする道具**です。

審査員向けの確認先:

- 公開ページ: <https://daideguchi.github.io/formpilot-vault/>
- デモ動画: <https://youtu.be/q-HreuLw5F8>
- デモページ: <https://daideguchi.github.io/formpilot-vault/demo.html>
- Novus/Pendo証拠: [`submission/evidence/novus-dashboard.png`](submission/evidence/novus-dashboard.png)
