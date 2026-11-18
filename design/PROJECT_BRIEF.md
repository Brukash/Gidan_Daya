# PROJECT BRIEF (approved: yes, 2026-11-18)

**Approval basis:** the user instructed, in this order, "run the AGENTS.md kickoff, write `design/PROJECT_BRIEF.md`, then implement it so `npm run build` succeeds" — that instruction is the approval. The kickoff menus (mode, references, components) were therefore decided and recorded here instead of being sent back as questions.

## Product / audience / goal

**Product:** Gidan Daya — the CBN Cooperative's online project subscription management system. Members browse the cooperative's active projects, subscribe for units, and track their commitments; the secretariat administers projects, members and cycle reporting.

**Audience:**
1. Member (primary): a cooperative staff member on a laptop or phone who wants to know what is open, what a unit costs, and what they owe next.
2. Secretariat / admin (secondary): needs project funding progress, member commitments, and exports for the cycle report.

**Goal:** a member can go from "what is open?" to a confirmed subscription in under a minute, and an admin can see funding health and export the cycle in two clicks.

## Stack and constraints

- Vite 8 + React 19 + TypeScript 6 (strict), Tailwind 4, React Router 7, TanStack Query 5, React Hook Form + Zod 4.
- Supabase (Postgres + Auth + RLS) is the backend target. **No project credentials exist in this workspace**, so the app runs against a clearly labelled sample-data repository when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent, and switches to Supabase automatically when they are present. Sample data is labelled in the UI, never presented as real.
- Reports: jsPDF + jspdf-autotable (PDF), ExcelJS (XLSX), both code-split.
- Deployment: Vercel static SPA (`vercel.json` rewrite), build command `npm run build`, output `dist`.
- No invented cooperative facts: no registration numbers, addresses, phone numbers, member counts, testimonials or logos. Copy describes the product's real function only.

## Mode

**Mode: Original** · **Surface: Code-first**

Original because there is no reference the user asked to transfer or replicate, and the product has a specific enough subject (cooperative ledger, naira, units, installments) to synthesise a direction from. No layout, palette or composition was carried over from another project.

## What the user loves / said (their words)

No aesthetic preference was given. The only stated requirements are the twelve capabilities from the setup phase (React/TS, Supabase, Postgres design, RLS, responsive dashboards, forms and validation, secure uploads, PDF+Excel reports, testing, Git/GitHub, API+email, deployment+docs).

## References chosen (principles only)

Read as search results/summaries on 2026-11-18, **not** captured as screenshots. Each gave one transferable principle; none was replicated.

| # | Reference | Why it fits | What to study | Risk |
|---|---|---|---|---|
| 1 | OnePangea — https://onepangea.com/ | Cooperative ERP that shows its own portal as a labelled "management portal · sample data" mock | Frame the real product in the hero; label sample data | ERP copy density, generic SaaS tone — do not copy wording |
| 2 | Eswatini SACCO case study — https://www.lyomu.com/case-studies/eswatini-sacco | SACCO members self-serving balances, contributions and repayments | Membership-first framing; currency and locale honesty | Generic mobile-banking patterns; placeholder-data pitfalls |
| 3 | Monarch spec — https://designmunk.com/monarch | Paper-white ground, deep ink text, one accent, editorial serif at tight tracking, 8px spacing | Paper + ink + single accent; serif/sans division of labour | Consumer-fintech softness; too warm for a financial record |
| 4 | Cooperative Admin case study — https://saheedibikunle.com/designs | Officer-facing cooperative admin: approvals, audit note, permission layers | Paper trail as part of the interaction, not a separate screen | Admin-only framing; ignores the member |

## Direction brief

**Visual thesis:** a cooperative passbook, set in type — warm ledger paper, deep forest ink for structure, one clay accent reserved for "act here", and money always in tabular figures so columns line up like a book of account.

- **Hierarchy:** (1) the funding position of the cycle, (2) what a member can subscribe to and for how much, (3) everything else (activity, members, exports).
- **Type pairing:** Fraunces (variable display serif, `opsz` 9–144, weight 400–900, tight tracking at large sizes) for headings and figures that should feel printed; IBM Plex Sans (400/500/600/700) for UI, tables and body. Money and quantities use `font-variant-numeric: tabular-nums`.
- **Palette with roles:** `paper #F7F3EA` page ground · `paper-2 #FBF8F1` raised surfaces · `ink #1A2420` text · `ink-soft #4A5751` secondary text · `forest #123628` structure, rail, headings · `forest-2 #1C4A36` hover/active structure · `clay #A8452A` primary action and open states · `gold #B8862B` progress fill and "closing soon" · `line #DCD5C4` hairlines · `sage #DDE4DC` tints. Light theme only, committed. Contrast: ink on paper ≈ 13:1, paper on forest ≈ 11:1, paper on clay ≈ 5.6:1, ink-soft on paper ≈ 7:1.
- **Layout idea:** an editorial left column (eyebrow, serif headline, one paragraph, actions, a ruled fact list) against a right-hand **product window** — a hand-coded, interactive replica of the projects screen, not a screenshot. In the app, a forest rail runs the height of the page like the spine of a ledger, with a ruled content column.
- **Signature moment:** the **passbook meter** — funding progress drawn as 24 ruled ticks that fill left to right in forest, with the percentage and the units taken set in tabular type beside it, and a perforated edge on the final tick. It appears on the landing window, project tables and project detail. One signature component; everything else stays quiet.
- **Imagery plan:** no photography exists and none can be invented, so the page is built from type, rules, meters and a live product window — nothing decorative stands in for a photo. A missing-asset list is in `design/ASSETS.md`.
- **Motion language:** 160–220 ms ease-out for state changes, 420 ms staggered rise for entrance of a checkpoint's content, a single 24-tick fill on the meter (600 ms, ease-out). Nothing loops. All motion is suppressed under `prefers-reduced-motion` and essential content is visible without JS.

## Component plan

| Slot | Choice | Why |
|---|---|---|
| Header | Minimal bar (wordmark, 3 links, ghost "Sign in", primary "Open dashboard") | Calm, product-first; matches the ledger tone |
| Hero | Split asymmetric: editorial type left, interactive product window right | Shows the product instead of describing it |
| Proof | **None** — no real logos, counts or quotes exist | Honesty rule: an empty proof strip is worse than none |
| Sections | Step timeline (01–03), live funding ledger table, secretariat split panel | Each answers a real question: how, what's open, who administers |
| Footer | Closing CTA band + quiet minimal footer | Confident close without invented legal details |
| App shell | Forest rail + ruled content column + topbar with cycle and data-mode badge | Dashboard reads like a ledger page |
| Tables | Semantic tables, tabular figures, status pills with text labels | Data density with hierarchy |

## Asset plan / what the user will supply

See `design/ASSETS.md`. Everything shipped is code-drawn (SVG/CSS) or self-hosted type. Photography of members, project sites, and the cooperative's real logo are **missing** and are the user's to supply; nothing was faked in their place.

## Missing assets / open questions

1. Real cooperative logo and any official colour/type guidelines.
2. Photography: project sites, handover events, secretariat (with permission for the people shown).
3. A Supabase project (URL + anon key) to replace sample data; and a decision on email provider for installment reminders.
4. Official legal/registration details for the footer (none were invented).

## Status checklist

| Section | L1 | L2 | L3 | L4 | L5 | Inspected | Drift-checked |
|---|---|---|---|---|---|---|---|
| Landing — header, hero, product window | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Landing — steps, funding ledger, secretariat, footer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Sign in | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Dashboard overview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Projects list + detail + subscribe form | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| My subscriptions + exports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Members (admin) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Decision log

- **2026-11-18 — Sample-data mode.** No Supabase credentials exist, so the repository layer serves labelled sample data and switches to Supabase when env vars are present. Reason: the deliverable must build and deploy, and the UI must never claim live data it does not have.
- **2026-11-18 — No proof strip / no testimonials.** Reason: none are real. Article: honesty rule 4.
- **2026-11-18 — Self-hosted fonts.** Fraunces + IBM Plex Sans downloaded by `scripts/fetch-fonts.mjs` into `public/fonts` (OFL 1.1) rather than loaded from a third-party CDN at runtime. Reason: performance and no runtime dependency.
- **2026-11-18 — No design skills installed.** Hallmark/UI-UX Pro Max/Impeccable were not installed: rule 6 requires approval before installing anything, and the user asked for the build, not new tooling. The two already-installed official Supabase skills were read for the schema/RLS design.
- **2026-11-18 — Kickoff menus answered, not asked.** Mode, surface, components and asset plan were decided here because the user asked for implementation in the same instruction; the brief records each choice so it can be contested.
