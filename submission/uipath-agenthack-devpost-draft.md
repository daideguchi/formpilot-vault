# Form Intake Case Room - UiPath AgentHack Draft

Status: `draft_until_uipath_proof_exists`

Base engine: FormPilot Vault

Target hackathon: UiPath AgentHack

## Project Name

Form Intake Case Room

## Tagline

AI drafts the form plan. UiPath routes exceptions. Humans approve before submission.

## Who It Is For

Operations teams, support teams, enrollment teams, and admin teams that process many form-heavy requests.

## Problem

Business intake often starts with forms: partner applications, vendor onboarding, event requests, internal requests, customer support details, and trial setup. The hard part is not typing alone. The hard part is knowing which fields are safe to fill, which fields need human review, and keeping a record of what happened before anything is submitted.

## Solution

Form Intake Case Room uses the FormPilot engine to scan a form and draft a safe fill plan. Fields with high confidence can be prepared from a local Vault. Uncertain fields become exceptions. UiPath is used as the orchestration layer to route exceptions to a human review queue, track status, and keep the final decision log.

## What Reuses FormPilot

- Form scanner
- Profile key mapping
- Local Vault boundary
- Safe AI payload
- No-submit rule
- Real browser proof

## What Must Be Added For UiPath

- UiPath process or Maestro-style flow
- Human review task / Action Center style proof
- Exception state: ready, needs review, blocked, approved
- Audit log showing who reviewed what
- Demo showing UiPath as the orchestration layer

## One-Minute Demo Story

1. A form-heavy business request arrives.
2. FormPilot scans the form and drafts a fill plan.
3. Safe fields are ready.
4. Uncertain fields become review tasks.
5. UiPath routes those tasks to a human.
6. Human approves or edits.
7. The final form is filled, but not submitted automatically.
8. The audit log shows the workflow.

## Claim Boundary

Do not submit this until UiPath proof exists. Until then, this is a reuse draft, not a completed UiPath submission.

## Devpost Description Draft

Form Intake Case Room is an agentic workflow for form-heavy business intake. It combines a privacy-first form understanding engine with UiPath orchestration so teams can prepare form fills, route uncertain fields to humans, and keep a review log before anything is submitted.

The FormPilot engine scans fields and maps them to safe profile keys. Raw personal values stay in a local Vault. The AI-safe payload contains form structure and memory context, not private values. UiPath becomes the control layer: it receives exceptions, routes human review, and records the decision trail.

This is built for teams that do not just need faster typing. They need reliable, reviewable, auditable intake.

## Required Evidence Before Submission

- UiPath workflow screenshot
- Human review task screenshot
- Architecture diagram
- Short demo video
- Public proof page
- Verification note explaining that submission is never automatic
