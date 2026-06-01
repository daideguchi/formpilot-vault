# FormPilot Vault

FormPilot Vault is a Chrome extension MVP that helps people finish repetitive forms with human review.

It reads the form structure, maps fields to a local profile, drafts a fill plan, and fills the page only after the user clicks. It does not press submit.

Live app: https://daideguchi.github.io/formpilot-vault/

Repository: https://github.com/daideguchi/formpilot-vault

## Who It Helps

People who repeatedly fill out:

- signup forms
- lead forms
- contact forms
- event registration forms
- free-trial forms

## Problem

The same name, address, phone, email, company, department, and title fields appear again and again. Browser autofill helps with simple fields, but it is weak on split Japanese names, kana fields, address parts, company fields, and site-specific wording.

## Solution

FormPilot Vault keeps real values in a local profile Vault and uses rules, memory, and optional AI schema inference to map each form field to a safe profile key.

Privacy boundary:

- AI receives form structure only.
- Raw names, addresses, phone numbers, emails, passwords, cookies, and auth tokens are not sent to AI.
- The extension fills fields after user action.
- The user reviews the page before submitting.
- CAPTCHA, login verification, financial, medical, government, and identity forms are out of scope for this MVP.

## 30-Second Proof Path

The public page has a compact English/Japanese review path:

1. Who is it for?
2. What pain does it solve?
3. How does it work?
4. What proof exists?

Current local proof:

- `npm test` passes.
- Chrome extension E2E scans 12 fields and fills 12 fields.
- Public form probe scans 2 public demo forms without submitting.
- Cloudflare Worker API contract tests pass locally with no paid deployment.
- Checkout smoke proves the Plus plan flow reaches the license success page.
- English/Japanese UI switch has no horizontal overflow on desktop or mobile.
- Public GitHub Pages deployment returns HTTP 200 and passes English/Japanese desktop/mobile checks.

## Hackathon Strategy

Primary target:

- Mind the Product: `FormPilot Vault`

Secondary variants:

- UiPath AgentHack: `Form Intake Case Room`
- Google Cloud Rapid Agent: `FormOps Agent`

See [docs/11_hackathon_submission_strategy.md](docs/11_hackathon_submission_strategy.md).

## Run Locally

```bash
npm install
npm test
npm run test:extension
npm run test:public-probe
```

Open the static page:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://127.0.0.1:8080/
```

To try the extension manually, open `chrome://extensions`, enable developer mode, and load the `extension/` directory as an unpacked extension.

## Status

This is an MVP and hackathon submission package. It is not yet published on the Chrome Web Store, and paid Stripe production credentials are not included in this repository.

日本語の要約:

```text
FormPilot Vault は、会員登録・資料請求・問い合わせフォームのくり返し入力を減らすChrome拡張MVPです。AIへ個人情報の実値を送らず、端末内Vaultから確認つきで入力します。
```
