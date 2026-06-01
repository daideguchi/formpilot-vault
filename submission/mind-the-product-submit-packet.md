# FormPilot Vault - Mind the Product Submit Packet

Status: `ready_for_human_review`

## Paste-Ready Links

- Live app: https://daideguchi.github.io/formpilot-vault/
- Demo page: https://daideguchi.github.io/formpilot-vault/demo.html
- Demo MP4: https://daideguchi.github.io/formpilot-vault/assets/mind-the-product-demo-en.mp4
- GitHub: https://github.com/daideguchi/formpilot-vault
- Novus/Pendo proof: `submission/evidence/novus-dashboard.png`

If Devpost only accepts YouTube/Vimeo for the video field, upload `assets/mind-the-product-demo-en.mp4` as an unlisted video and paste that URL.

## Project Name

FormPilot Vault

## Tagline

Finish repetitive forms with human review.

## One-Sentence Explanation

FormPilot Vault helps solo builders and small teams finish repetitive signup, contact, lead, event, and trial forms faster while keeping private values in a local Vault and leaving final submission to the human.

## Who It Is For

Solo builders, operators, founders, and small teams who repeatedly fill out similar forms while shipping products, applying to platforms, setting up tools, and running customer or partner workflows.

## Problem

Browser autofill is helpful for simple fields, but it breaks down when forms split names, ask for kana, divide addresses, include company fields, use different labels, or require site-specific context. People still waste time typing the same safe information into slightly different forms.

## Solution

FormPilot reads the form structure, maps each field to a profile key, and creates a fill plan. The user reviews the plan, then FormPilot fills the page. It does not press submit. Raw names, addresses, phone numbers, emails, passwords, cookies, and selectors are not sent to AI.

## What Is Built

- Chrome extension MVP
- Local Profile Vault
- Site memory and mapping cache
- Safe AI schema payload that excludes raw personal values
- English/Japanese public landing page
- 2-minute demo page
- English narrated demo MP4 under three minutes
- Real browser extension E2E proof
- Public form probes with no submission
- Novus/Pendo frontend install and dashboard proof

## Built With

JavaScript, Chrome Extensions Manifest V3, Playwright, Cloudflare Worker entrypoint, D1 schema, Stripe Checkout API contracts, GitHub Pages, Novus/Pendo.

## 30-Second Judge Path

1. Open the live app.
2. Open the demo page.
3. Check the four proof cards: user, problem, workflow, proof.
4. Review the Novus/Pendo proof screenshot.
5. Review the verification commands below.

## Verification Commands

```bash
npm test
npm run test:extension
npm run test:public-probe
npm run novus:verify
npm run release:check
```

## Honest Boundaries

- FormPilot never submits a form.
- CAPTCHA, SMS, email verification, identity checks, and bulk account creation are not automated.
- Gemini is not required for this submission package.
- If live AI/provider credentials are unavailable, the product continues with deterministic rules fallback.
- Cloudflare Worker/D1 are prepared for the future production path; the current public demo is GitHub Pages plus local extension proof.
