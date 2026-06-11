# FormPilot Vault - Mind the Product Devpost Draft

Status: `final_devpost_submitted`

Submitted: `2026-06-03 09:03 JST`

Devpost project: https://devpost.com/software/formpilot-vault

Final submit proof: Devpost showed `Project submitted!` after the submit click, and the `DRAFT` state was gone.

Live app: https://daideguchi.github.io/formpilot-vault/

GitHub: https://github.com/daideguchi/formpilot-vault

Demo page: https://daideguchi.github.io/formpilot-vault/demo.html

Demo MP4: https://daideguchi.github.io/formpilot-vault/assets/mind-the-product-demo-en.mp4

YouTube demo: https://youtu.be/q-HreuLw5F8

## Project Name

FormPilot Vault

## Tagline

AI form autofill that keeps private values on the user's device.

## Who It Is For

FormPilot Vault is for solo builders, operators, founders, and small teams who fill out the same signup, lead, contact, event, and trial forms again and again.

## Problem

Browser autofill works for simple fields, but it breaks down when forms split names, ask for kana, divide addresses, include company fields, or use site-specific wording. People still waste time typing the same identity and business details into slightly different forms.

## Solution

FormPilot Vault reads the form structure, maps each field to a safe profile key, and fills the page only after the user reviews the plan. Real names, addresses, phone numbers, emails, and passwords stay in the local Vault. AI can help understand the form, but it does not receive raw personal values and it never presses submit.

## Why It Fits World Product Day

Everyone is shipping faster now, but shipping creates more repetitive operational work: tool signups, trial forms, partner applications, event pages, lead forms, and support workflows. FormPilot Vault turns one common piece of that work into a narrow, understandable product.

It also shows a practical AI boundary. The AI helps understand the page, but the sensitive values stay local and the final decision stays with the human.

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
- Novus/Pendo installed on the public app and demo page
- Public Novus/Pendo smoke verification

## 30-Second Judge Path

1. Open the live app.
2. Open the demo page or YouTube demo.
3. Switch between English and Japanese.
4. Read the four proof cards: who, pain, workflow, proof.
5. Check the Novus/Pendo proof screenshot.
6. Review the privacy boundary: form structure can go to AI, raw personal values stay local.

## Demo Video Outline

Target length: 2-3 minutes.

Current public page includes a 2-minute muted autoplay demo near the top.
The same video is also available as a standalone judge demo page:
https://daideguchi.github.io/formpilot-vault/demo.html

Use the YouTube demo link in the Devpost video field:
https://youtu.be/q-HreuLw5F8

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
- Dashboard screenshot is attached.
- Public page smoke confirms Pendo/Novus script and event requests are firing.
- Devpost final submission is complete.

Evidence:

- Screenshot of Novus/Pendo install state: `submission/evidence/novus-dashboard.png`
- 2026-06-11 resubmission proof: `submission/evidence/novus-resubmission-proof-2026-06-11.md`
- 2026-06-11 Novus recheck screenshot: `submission/evidence/novus-dashboard-recheck-2026-06-11.png`
- Install notes: `submission/evidence/novus-install-notes.md`
- Public smoke command: `npm run novus:public`

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
npm run novus:verify
npm run novus:public
npm run release:check
```

Mind the Product submission blockers:

- None known after final Devpost submission.
- YouTube demo is uploaded, the YouTube thumbnail was corrected to an English FormPilot Vault thumbnail, and Novus proof is attached.

Known release blockers before Chrome Web Store / full production launch:

- Production Worker URL
- Cloudflare D1 database id
- Stripe live values
- Chrome Web Store submission, if pursuing store launch
