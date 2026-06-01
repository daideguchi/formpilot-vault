# Novus.ai Install Checklist

Status: `dashboard_proof_attached`

Mind the Product requires Novus.ai to be installed before submission. Projects without the Novus install are ineligible.

Official references:

- Hackathon page: https://mindtheproduct.devpost.com/
- Rules: https://mindtheproduct.devpost.com/rules
- Novus registration URL from rules: https://novus.pendo.io/register

## What Must Be Produced

1. Novus account/project access. `done via existing Novus/Pendo account`
2. Novus installed on `https://daideguchi.github.io/formpilot-vault/` or on the final production URL. `snippet installed in repo`
3. Screenshot of the Novus dashboard showing the install state. `attached`
4. Short proof note explaining what Novus sees:
   - page view
   - language switch
   - proof-section view
   - pricing-section view
   - privacy-page view

## Do Not Fake

- Do not claim Novus is installed until the dashboard proves it.
- Do not add a fake dashboard screenshot.
- Do not submit to Mind the Product without the screenshot.

## Recommended Event Names

If Novus supports custom event naming, use simple product-language events:

- `view_home`
- `switch_language`
- `view_proof`
- `view_pricing`
- `open_privacy`
- `click_start_plan`

## Submission Evidence Slot

Save the final proof here:

```text
submission/evidence/novus-dashboard.png
submission/evidence/novus-install-notes.md
```

## Current Decision

The product can continue without paid resources. The frontend snippet is installed, the public page fires Pendo/Novus requests, and the dashboard proof screenshot is attached.
