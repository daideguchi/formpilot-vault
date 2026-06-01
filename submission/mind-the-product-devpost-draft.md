# FormPilot Vault - Mind the Product Devpost Draft

Status: `ready_except_novus_dashboard_proof`

Live app: https://daideguchi.github.io/formpilot-vault/

GitHub: https://github.com/daideguchi/formpilot-vault

## Project Name

FormPilot Vault

## Tagline

Finish repetitive forms with human review.

## Who It Is For

FormPilot Vault is for solo builders, operators, founders, and small teams who fill out the same signup, lead, contact, event, and trial forms again and again.

## Problem

Browser autofill works for simple fields, but it breaks down when forms split names, ask for kana, divide addresses, include company fields, or use site-specific wording. People still waste time typing the same identity and business details into slightly different forms.

## Solution

FormPilot Vault reads the form structure, maps each field to a safe profile key, and fills the page only after the user reviews the plan. Real names, addresses, phone numbers, emails, and passwords stay in the local Vault. AI can help understand the form, but it does not receive raw personal values and it never presses submit.

## What Is Built

- Chrome extension MVP
- Local Profile Vault
- Site memory and mapping cache
- Safe AI schema payload
- Entitlement and Stripe Checkout API contracts
- Cloudflare Worker API entrypoint
- Privacy and Terms pages
- English/Japanese public landing page
- Real browser extension E2E tests
- Public form probes with no submission

## 30-Second Judge Path

1. Open the live app.
2. Switch between Japanese and English.
3. Read the four proof cards: who, pain, workflow, proof.
4. Check the screenshots and evidence in the repository.
5. Review the privacy boundary: form structure can go to AI, raw personal values stay local.

## Demo Video Outline

Target length: 2-3 minutes.

Current public page includes a 2-minute muted autoplay demo near the top.
Use it as the always-visible judge preview.
If Devpost requires an external video URL, export or re-record this flow as the final hosted video.

1. Open with the pain: repeated signup and contact forms waste time.
2. Show the public page and 30-second proof path.
3. Show the Chrome extension scanning a form.
4. Show local Vault values filling 12 fields after user action.
5. Show uncertain fields staying for review.
6. Show public form probes and no-submit boundary.
7. Close with product thesis: faster forms without giving AI your private values.

## Novus.ai Requirement

Mind the Product requires Novus.ai installed on the deployed project before submission.

Current status:

- Public app is live.
- Novus/Pendo frontend snippet is installed in the repository.
- Dashboard screenshot is not yet attached.
- Do not submit until the dashboard screenshot and behavior proof are added.

Evidence to add after Novus setup:

- Screenshot of Novus installed on `https://daideguchi.github.io/formpilot-vault/`
- Screenshot or export showing page view / interaction events
- Short note explaining what events are tracked

## Submission Description

FormPilot Vault is a privacy-first Chrome extension MVP for repetitive web forms. It helps people finish signup, lead, contact, event, and trial forms faster while keeping humans in control.

The core idea is simple: AI should help understand the form, not take your personal data. FormPilot Vault keeps real values in a local Profile Vault. The AI-safe payload contains form labels, types, options, and memory context, but not raw names, addresses, emails, phone numbers, passwords, cookies, or selectors. The extension prepares a fill plan, the user reviews it, and the extension fills fields only after user action. It never submits the form.

This matters because everyone is shipping faster now, but the boring operational work around shipping is still real. Every new product, partnership, application, and support workflow creates more forms. FormPilot Vault turns that repeated work into a small, reviewable workflow that can improve with memory over time.

## Built With

- JavaScript
- Chrome Extensions Manifest V3
- Playwright
- Cloudflare Worker entrypoint
- D1 schema for future entitlement storage
- Stripe Checkout API contracts
- GitHub Pages

## Verification Commands

```bash
npm test
npm run test:extension
npm run test:public-probe
npm run release:check
```

Known release blockers before production launch:

- Novus.ai install proof
- External hosted demo video, if Devpost requires a separate video URL
- Production Worker URL
- Cloudflare D1 database id
- Stripe live values
- Chrome Web Store submission, if pursuing store launch
