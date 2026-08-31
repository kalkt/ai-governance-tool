# AGENTS.md — AI Governance Readiness Assessment Tool

Instructions for any AI agent working in this repo — Claude Code, Cowork (via
device bridge), Antigravity, or otherwise. This file covers agent *behavior*
only. For project content — what this tool is, current architecture, full
research findings, and the living Build checklist — **read
`ai-governance-tool-backlog.md` in full before doing any work here.** That
file is the single source of truth; this one does not restate it.

## Stack & commands

Vite `^7.1.9`, vanilla JS (no framework — template-literal HTML in
`index.html`, pure functions in `src/logic.js`, pure data in `src/data.js`),
Vitest `^4.1.11` (`@vitest/coverage-v8`), Playwright `^1.62.1`.

- `npm install` — install deps
- `npm test` — unit tests (Vitest). Run this after **any** change to
  `src/logic.js` or `src/data.js`, before considering the change done.
- `npm run test:e2e` — Playwright E2E (separate from `npm test`; excluded
  from the Vitest run via `vitest.config.js`)
- `npm run dev` / `npm run build` / `npm run preview`

CI (`.github/workflows/test.yml`) runs `npm test` and `npx vitest run
--coverage` on every push/PR to `main`, and **fails the build below 90%
coverage** on branches/functions/lines/statements. Don't merge or push work
that drops under that line.

## Conventions

- `TOOL_MASTER_LIST` entries (`src/data.js`): `{ id: 't-xxx', name, category,
  industries: [...], classification: 'lower-risk'|'caution'|'high-risk',
  reasoning, sources: [...], lastReviewed: 'YYYY-MM' }`. Use `--` for
  em-dashes inside `reasoning` strings (matches existing entries).
- Before adding a new `TOOL_MASTER_LIST` entry, grep for its likely `id` and
  for near-duplicate `name`s first — this repo has already had one real
  collision (two sessions independently researching the same tool without
  knowing it). If a plausible match exists, resolve it explicitly rather
  than adding a second entry.
- Git identity: commits in this repo are authored to match the existing
  history. Check it with `git log --format='%an <%ae>' | sort -u` and match
  it — don't invent a new author identity.
- On the Cowork device-bridge VM specifically: git can create a
  `.git/*.lock` file during a write but this sandbox can't unlink it
  afterward, so every commit leaves one behind. Move it into `_to_delete/`
  (never delete) before retrying — see that folder's contents for examples.
  This is a bridge-specific sandboxing quirk, not a repo problem, and
  shouldn't come up when git runs natively (a local terminal, Antigravity,
  VS Code).

## Permission boundaries

✅ **Always**
- Run `npm test` after touching `src/logic.js` or `src/data.js`.
- Cite a real, dated, checkable source for any classification, certification,
  regulatory finding, or legal case referenced in a `TOOL_MASTER_LIST` entry.
- Check for an existing/duplicate entry before adding a new one (see above).

⚠️ **Ask first**
- Adding a new `TOOL_MASTER_LIST` category, or changing the scoring/tiering
  logic in `src/logic.js` (`computeScores`, `computeTier`, `GAP_THRESHOLD`).
- Starting any numbered Build item (B1–B25+ in the backlog) not already
  explicitly authorized by Kartik in this conversation.
- Any visual/UI redesign decision — colors, typography, layout — that isn't
  already specified in `ai-governance-tool-backlog.md`.
- Committing/pushing when something genuinely went wrong or is ambiguous
  (tests fail, coverage drops below the 90% gate, a real design judgment
  call came up that isn't resolved by this file or the backlog, scope crept
  past what was authorized) — stop and report instead of pushing through.

✅ **Commit and push, standing authorization (2026-08-31, Kartik):**
When a task's deliverables are done cleanly — `npm test` passes, coverage
clears the 90% gate, `npm run build` succeeds, nothing flagged as broken or
ambiguous — commit and push without waiting to be asked each time. This
replaces the old blanket "never commit without being asked" rule below;
that rule now only covers the not-clean case. Still applies regardless:
match the existing git identity (see Conventions above), write a real
commit message (what changed and why, not just "B_ done"), and mark the
relevant backlog item `[x]` with the same level of detail as existing
entries in the same commit or an immediately following one.

🚫 **Never**
- Invent a tool classification, certification, citation, or regulatory
  finding not backed by a real, checkable source. If uncertain, say so
  rather than filling the gap.
- Silently overwrite or duplicate another session's work — the R36 research
  batch and the confidence-gap/scope feature both existed in this repo
  without this file's author knowing, until specifically checked for. Check
  `git log` and grep for existing entries before assuming a clean slate.
- Commit or push when the ask-first case above applies — see there.

## Where things actually live

- Repo (this file's home): the real, versioned source of truth for code.
- `ai-governance-tool-backlog.md` (repo root): the master project-context
  and Build-checklist doc — read this first, always.
- A mirror of that file also lives as a Cowork Project doc
  (`claude/ai-governance-tool-backlog.md` in the "Kartik – Career Paths &
  Résumés" project) for cross-surface search from claude.ai chat. The
  **repo copy is canonical**; after editing it here, push the same content
  to the Project doc too so the mirror doesn't go stale.
