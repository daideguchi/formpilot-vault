# FormOps Agent - Google Cloud Rapid Agent Draft

Status: `draft_until_google_agent_proof_exists`

Base engine: FormPilot Vault

Target hackathon: Google Cloud Rapid Agent

## Project Name

FormOps Agent

## Tagline

A Gemini-powered agent that prepares safe form work without sending private values to the model.

## Who It Is For

AI operators, solo builders, and teams that ask agents to prepare operational work but still need privacy and human review.

## Problem

As more people use agents, agents will handle more operational steps around products: signups, vendor forms, support forms, trial forms, event forms, and handoff forms. The risk is clear: an agent may need to understand a form, but it should not receive raw private profile values or submit forms without review.

## Solution

FormOps Agent separates form understanding from private value filling. Gemini can reason over form structure, missing fields, and next actions. The local Vault keeps raw personal values out of the model. The agent produces safe tasks: ready fields, uncertain fields, missing proof, and human review steps.

## What Reuses FormPilot

- DOM/form schema collection
- Local Profile Vault
- Memory/mapping cache
- Safe AI schema payload
- Human review before fill
- No auto-submit rule

## What Must Be Added For Google Rapid Agent

- Gemini proof
- Google Cloud Agent Builder proof
- Partner MCP selection and usage proof
- Agent task graph or workflow screenshot
- Demo showing the agent prepares a reviewable form task

## Agent Workflow

1. Agent receives a form task.
2. Agent reads the safe form schema.
3. Gemini classifies fields and missing context.
4. FormPilot maps ready fields to profile keys.
5. Raw personal values stay local.
6. Agent creates a review checklist.
7. Human approves the fill plan.
8. The extension fills fields, but does not submit.

## Claim Boundary

Do not submit this until Gemini, Agent Builder, and Partner MCP evidence exists. Until then, this is a reuse draft, not a completed Google Cloud Rapid Agent submission.

## Devpost Description Draft

FormOps Agent is a safety layer for agent-assisted form work. It lets an agent understand what a form needs, prepare a fill plan, and ask for human review without sending raw personal values to the model.

The core idea is that future agents will do more operational work, but privacy and consent still matter. FormOps Agent uses Gemini for form reasoning and missing-context planning, while the FormPilot Vault keeps real names, addresses, phone numbers, emails, and passwords local. The result is a reviewable checklist of safe fields, uncertain fields, and required human decisions.

The agent helps prepare work. The human stays in control.

## Required Evidence Before Submission

- Gemini request/response proof
- Agent Builder configuration proof
- Partner MCP proof
- Public proof page
- 2-3 minute demo video
- Note showing raw private values are excluded from model payloads
