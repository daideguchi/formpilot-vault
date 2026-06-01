# FormPilot Vault Reuse Strategy

Status: `active_reuse_plan`

Core product: FormPilot Vault

Core sentence:

```text
FormPilot Vault turns repetitive form work into a reviewed fill plan, while keeping raw personal values in a local Vault.
```

## Reuse Judgment

Yes, this local product can be reused.

The safe way is not to submit the already-public page or the exact same story everywhere. The safe way is:

```text
Same engine
Different user
Different workflow wrapper
Different required technology proof
```

## Shared Core

The shared engine is already real:

- Scan form fields
- Map fields to profile keys
- Keep real values in local Vault
- Use Memory to improve repeated mappings
- Build AI-safe schema payloads without raw personal values
- Fill only after user action
- Never auto-submit
- Log proof through tests and screenshots

This core can support several submissions because the problem appears in many places: product launches, enterprise intake, agent workflows, and personal productivity.

## Submission Split

| Track | Product Face | User | Main Pain | Required Proof |
|---|---|---|---|---|
| Mind the Product | FormPilot Vault | Solo builders and operators | Repeated signup/contact/trial forms | Novus.ai install, 2-3 min video, public URL |
| UiPath AgentHack | Form Intake Case Room | Ops teams handling intake | Many forms create exceptions and review queues | UiPath orchestration / Action Center style proof |
| Google Rapid Agent | FormOps Agent | Agent builders and AI operators | Agents need safe form tasks without private values | Gemini + Agent Builder + Partner MCP proof |

## What Must Stay True

- Do not claim the same submission is three finished products.
- Do not claim UiPath or Google integration before the evidence exists.
- Do not send raw personal values to AI.
- Do not add fake metrics or fake dashboards.
- Do not create paid resources without an explicit zero-cost path.
- Do not press submit automatically in demos.

## Why This Is Strong

The story is simple:

```text
Everyone ships more now.
More shipping creates more forms.
Forms still require private data and human judgment.
FormPilot makes that repeated work fast, reviewable, and safe.
```

That same story can be told from product, enterprise automation, or agent-safety angles.

## Current Best Use

Priority 1 is Mind the Product because it needs the least extra platform integration and has the clearest story.

Priority 2 is UiPath because form intake is a natural enterprise automation use case.

Priority 3 is Google Rapid Agent because the prize is large but the required Gemini / Agent Builder / Partner MCP evidence is heavier and the deadline is closer.

## Next Build Steps

1. Finish Mind the Product eligibility: Novus.ai proof and external hosted demo if needed.
2. Create a UiPath-flavored public proof page only after UiPath evidence exists.
3. Create a Google-flavored public proof page only after Gemini / Agent Builder / MCP evidence exists.
4. Keep this repository as the reusable proof base.
