# Novus / Pendo Install Notes

Recorded: 2026-06-01 JST

## Current State

Novus/Pendo frontend snippet is installed in the public FormPilot Vault page.

Installed surfaces:

- `index.html`
- `site/index.html`

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

This note is not a replacement for the required dashboard proof.
Do not claim the Mind the Product Novus requirement is complete until `submission/evidence/novus-dashboard.png` exists and passes `npm run novus:verify`.

## Commands

```bash
npm run novus:install
npm run novus:verify
```
