# Novus Resubmission Proof - 2026-06-11

## Project

FormPilot Vault

## Public Surfaces

- Live app: https://daideguchi.github.io/formpilot-vault/
- Demo page: https://daideguchi.github.io/formpilot-vault/demo.html
- GitHub repository: https://github.com/daideguchi/formpilot-vault

## Novus Install State

Novus scanned the connected GitHub repository and recognized the public web install.

- Novus workspace: `DD AI Organization`
- Novus App ID shown by the install screen: `b147308a-8db6-4ecb-ba89-29c921a8ca58`
- Platform detection: `Framework: web`, `Type: b2c`
- Install target files shown by Novus include:
  - `daideguchi-formpilot-vault/index.html`
  - `daideguchi-formpilot-vault/ja.html`
  - `daideguchi-formpilot-vault/form-input.html`
  - `daideguchi-formpilot-vault/form-autofill.html`
  - `daideguchi-formpilot-vault/signup-autofill.html`
  - `daideguchi-formpilot-vault/contact-form-autofill.html`
  - `daideguchi-formpilot-vault/demo.html`
  - `daideguchi-formpilot-vault/success.html`
  - `daideguchi-formpilot-vault/site/index.html`
  - `daideguchi-formpilot-vault/site/demo.html`

## Public Live Verification

Command:

```bash
npm run novus:public
```

Latest result:

```json
{
  "ok": true,
  "checked_paths": [
    "/",
    "/form-input.html",
    "/form-autofill.html",
    "/signup-autofill.html",
    "/contact-form-autofill.html",
    "/success.html?license_key=afa_public_probe_success",
    "/demo.html"
  ],
  "all_pages": {
    "hasPendo": true,
    "hasTrack": true,
    "hasInitialize": true,
    "horizontalOverflow": false
  },
  "pendoRequestKinds": [
    "cdn.pendo.io",
    "data.pendo.io"
  ]
}
```

## Evidence Files

- `submission/evidence/novus-dashboard.png`
- `submission/evidence/novus-dashboard-recheck-2026-06-11.png`
- `submission/evidence/novus-install-notes.md`

## Resubmission Note

The public pages now have both repository-level Novus scan proof and live browser proof. The smoke test opens the deployed GitHub Pages surfaces and confirms the Pendo object, `pendo.track`, `pendo.initialize`, and live `pendo.io` requests.
