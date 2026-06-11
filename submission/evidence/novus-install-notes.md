# Novus / Pendo Install Notes

Recorded: 2026-06-11 JST

## Current State

Novus/Pendo frontend snippet is installed in the public FormPilot Vault pages.
The 2026-06-11 proof screenshot was captured from Novus after connecting GitHub
and scanning the `daideguchi/formpilot-vault` repository.

Installed surfaces:

- `index.html`
- `site/index.html`
- `demo.html`
- `site/demo.html`
- `form-autofill.html`
- `site/form-autofill.html`
- `signup-autofill.html`
- `site/signup-autofill.html`
- `contact-form-autofill.html`
- `site/contact-form-autofill.html`
- `form-input.html`
- `site/form-input.html`
- `success.html`
- `site/success.html`

Public URL:

```text
https://daideguchi.github.io/formpilot-vault/
```

## Safe Event Names

The page can send these product-language events:

- `switch_language`
- `view_proof`
- `view_pricing`
- `click_start_plan`

## Boundary

Novus scan proof is attached at `submission/evidence/novus-dashboard.png`.
The 2026-06-11 resubmission recheck is attached at `submission/evidence/novus-dashboard-recheck-2026-06-11.png` and summarized in `submission/evidence/novus-resubmission-proof-2026-06-11.md`.
The local verifier now passes.

## Commands

```bash
npm run novus:install
npm run novus:verify
npm run novus:public
```

## Latest Public Smoke

`npm run novus:public` opens the public app and demo page, confirms the `pendo` object exists, confirms `pendo.track` is available, observes `pendo.io` requests, and checks that the pages have no horizontal overflow.

The latest recheck covered `/`, `/form-input.html`, `/form-autofill.html`, `/signup-autofill.html`, `/contact-form-autofill.html`, `/success.html?license_key=afa_public_probe_success`, and `/demo.html`. All checked pages returned `hasPendo=true`, `hasTrack=true`, `hasInitialize=true`, and no horizontal overflow; live requests included `cdn.pendo.io` and `data.pendo.io`.
