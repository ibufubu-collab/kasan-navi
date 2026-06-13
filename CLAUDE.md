# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js / React versions are newer than your training data.** This repo uses Next.js 16.2.9 (App Router) and React 19. APIs and conventions may differ from what you remember. The canonical docs ship inside the package at `node_modules/next/dist/docs/` — run `npm install` first (node_modules is gitignored and absent on a fresh clone), then read the relevant guide before writing Next.js code.

## What this is

**加算ナビ(仮)** — a single-operator web tool that diagnoses missed pharmacy dispensing-fee add-ons (加算) under Japan's FY2026 (令和8年度) reimbursement revision. A pharmacist enters monthly aggregate counts; the app reports which add-ons they're claiming, which they could claim immediately, and the estimated monthly revenue being left on the table. **No patient data is ever entered** — only monthly aggregates — which is why result URLs are shareable.

`MVP-DESIGN.md` is the product spec and the source of truth for scope, screen flow, and intentional non-goals (no login, no payments, no LLM-generated explanations, no レセコン integration). Read it before making product-level decisions.

## Commands

```bash
npm install        # required first — pulls deps AND the Next.js docs under node_modules/
npm run dev        # dev server at http://localhost:3000
npm test           # Vitest unit tests for the calculation engine (vitest run, one-shot)
npm run build      # production build check
npm run lint       # eslint (flat config, eslint-config-next)
```

Run a single test by name: `npx vitest run -t "後発品率84%は全区分未達"`
Watch a file: `npx vitest lib/engine.test.ts`

Vitest resolves the `@/` alias to the repo root via `vitest.config.ts` (mirrors the `tsconfig.json` path mapping), and only picks up `**/*.test.ts`.

## Architecture

The product's value lives in **data, not code**. The flow is deliberately a pure, deterministic pipeline so there's zero risk of LLM hallucination in fee math:

```
data/kasan-master.ts  →  lib/engine.ts  →  app/shindan/kekka  (result UI)
   (the asset)            (pure calc)        (presentation)
        ↑
   lib/codec.ts encodes/decodes DiagnosisInputs ⇆ URL query (shareable, no PII)
```

### `data/kasan-master.ts` — the core asset

All add-on definitions (points, requirements, advice, source links, review dates) live here, decoupled from code. When a fee revision or 疑義解釈 (official Q&A) is published, **this file is the only thing that changes** and it propagates to every screen. Two tiers:

- **`KASAN_MASTER`** — diagnosable add-ons (the engine evaluates these). Some have `variants` (e.g. 地域支援 加算1〜5) that are scored independently rather than via flat `requirements`.
- **`KASAN_CATALOG`** — reference-only add-ons (heavy facility/track-record requirements or small amounts); shown on `/ichiran`, never scored.

Each `Kasan` carries `sourceUrl` and `lastReviewed`. The convention (per MVP-DESIGN.md): point values and requirements are AI-cross-referenced against MHLW source PDFs but **require the operator's final confirmation against official notices** — entries reviewed by AI read `lastReviewed: REVIEWED_MHLW`; unconfirmed ones read `"未確認"`. Do not silently mark something confirmed.

### `lib/engine.ts` — pure, deterministic, tested

No I/O, no randomness, no dates. `evaluate(inputs, master)` maps each add-on to a `KasanResult` with a status:

- `taking` — self-reported as currently claimed
- `ready` — requirements met but not claimed (immediate missed revenue)
- `near` — exactly one requirement short
- `unmet` — two or more short

Totals are partitioned without double-counting into `gotYen` / `readyYen` / `buildYen` / `upgradeYen`, and split by `santeiType` into `autoLostYen` (claimed automatically once the system is set up) vs `actionLostYen` (claimed per pharmacist action/task). `nextActions()` ranks the biggest opportunities.

Key domain logic to preserve: the 地域支援 実績①〜⑨ track-record requirements are normalized **per 10,000 prescriptions/year** (`achievedJisseki`), so a higher `rx` raises the required counts; items ⑥ (在宅) and ⑦ (服薬情報等提供) are `derived` — auto-judged from numeric inputs, never accepted via self-report. `gate: true` requirements (e.g. 調剤基本料 区分) are preconditions that can't be changed by action and are excluded from upgrade suggestions.

**Money math is the trust boundary.** A wrong yen figure destroys credibility instantly (see MVP-DESIGN.md risk table). Any change to engine math or master point values must be accompanied by a passing `lib/engine.test.ts` — the suite encodes the intended boundary behavior (e.g. 在宅 23 vs 24 件, 後発品率 84% vs 85%, normalization factors). Treat a test change as a deliberate spec change, not a way to make red turn green.

### App routes (`app/`, App Router)

`/` LP → `/shindan` input form → `/shindan/kekka` result → `/touroku-kanryo` lead-capture done; plus `/ichiran` (catalog) and `/legal` (disclaimer/operator info). `app/layout.tsx` is the shared shell (Japanese, Tailwind). Only `app/shindan/page.tsx` and `app/shindan/kekka/page.tsx` are client components (`"use client"`) — they read/write the URL query via `next/navigation` and wrap query access in `<Suspense>`. The result page is fully recomputed client-side from the decoded URL, so it works even with tracking disabled.

### `lib/track.ts` — best-effort Supabase

Logs diagnoses / leads / feedback to Supabase (`diagnoses`, `leads`, `feedback` tables; anon key + RLS insert-only). **Every function is best-effort**: if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, the client is `null` and all calls no-op without blocking the UI. Preserve this — the app must run with zero backend config. The table schema and RLS policies live in `README.md`.

## Conventions

- **UI text and domain comments are Japanese.** Match the surrounding voice; advice strings in the master are hand-written prose, not generated boilerplate.
- Tailwind CSS v4 (via `@tailwindcss/postcss`), no config file — utility classes inline.
- Avoid words like 機会損失/取りこぼし as *guarantees*. The product is information-only; the result and `/legal` pages deliberately frame numbers as 概算 (estimates) and defer final判断 to the 厚生局. Keep that framing intact.
- Pre-launch checklist (point-table verification, operator profile TODOs, Supabase setup, Vercel deploy) lives in `README.md`.
