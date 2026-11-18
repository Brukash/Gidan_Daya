# PROJECT BRIEF (approved: yes, 2026-11-18)

**Approval basis:** the user instructed, in this order, "run the AGENTS.md kickoff, write `design/PROJECT_BRIEF.md`, then implement it so `npm run build` succeeds" — that instruction is the approval. The kickoff menus (mode, references, components) were therefore decided and recorded here instead of being sent back as questions.

## Product / audience / goal

**Scope change (2026-11-18):** the first build treated the app as a catalogue of the cooperative's projects. The user corrected that — *"The app is just for Gidan Daya subscription and not for all projects"* — and everything below describes the rebuilt, single-scheme product. The project/subscription model, its pages and its exports are gone.

**Product:** Gidan Daya — the application and allocation system for one scheme: the CBN Staff Multipurpose Cooperative Society estate plots at Gidan Daya, FCT Abuja. 102 residential plots in four sizes (200, 300, 400, 500 sqm) at ₦27,000 per sqm inclusive of infrastructure, a ₦20,000 non-refundable application fee, a 50% deposit due 30 January 2027 and the balance due 30 June 2027. Members apply for a plot and track what they owe; the secretariat reviews the register, records payments and exports the allocation.

**Audience:**
1. Applicant (primary): a cooperative member on a laptop or phone who wants to know which plot sizes remain, what each costs, and what the next payment is.
2. Secretariat / admin (secondary): needs the applicant register, payment verification, cadre-priority ordering and an export of the allocation.

**Goal:** a member can go from "what sizes are left?" to a submitted application in under a minute, and the secretariat can see the allocation and export it in two clicks.

**Source of truth:** the cooperative's *Call for Indication of Interest — Gidan Daya* (supplied by the user). Plot counts, sizes, the rate per square metre, the fee, the payment dates, the closing date, the site-visit dates and the allocation/refund/title conditions come from that document. Sample availability figures are labelled as sample data, never presented as the cooperative's actual allocation.

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

- **Hierarchy:** (1) what plot sizes remain and what they cost, (2) a member's own application and the next payment, (3) everything else (applicants, reports, exports).
- **Type pairing:** Fraunces (variable display serif, `opsz` 9–144, weight 400–900, tight tracking at large sizes) for headings and figures that should feel printed; IBM Plex Sans (400/500/600/700) for UI, tables and body. Money and quantities use `font-variant-numeric: tabular-nums`.
- **Palette with roles:** `paper #F7F3EA` page ground · `paper-2 #FBF8F1` raised surfaces · `ink #1A2420` text · `ink-soft #4A5751` secondary text · `forest #123628` structure, rail, headings · `forest-2 #1C4A36` hover/active structure · `clay #A8452A` primary action and open states · `gold #B8862B` progress fill and "closing soon" · `line #DCD5C4` hairlines · `sage #DDE4DC` tints. Light theme only, committed. Contrast: ink on paper ≈ 13:1, paper on forest ≈ 11:1, paper on clay ≈ 5.6:1, ink-soft on paper ≈ 7:1.
- **Layout idea:** an editorial left column (eyebrow, serif headline, one paragraph, actions, a ruled fact list) against a right-hand **product window** — a hand-coded, interactive replica of the plot screen (switch size, see price, deposit and remaining plots), not a screenshot. In the app, a forest rail runs the height of the page like the spine of a ledger, with a ruled content column.
- **Signature moment:** the **passbook meter** — allocation progress drawn as 24 ruled ticks that fill left to right in forest, with the percentage and the plots taken set in tabular type beside it, and a perforated edge on the final tick. It appears on the landing window, the availability tables and the application page. One signature component; everything else stays quiet.
- **Imagery plan:** no photography exists and none can be invented, so the page is built from type, rules, meters and a live product window — nothing decorative stands in for a photo. A missing-asset list is in `design/ASSETS.md`.
- **Motion language:** 160–220 ms ease-out for state changes, 420 ms staggered rise for entrance of a checkpoint's content, a single 24-tick fill on the meter (600 ms, ease-out). Nothing loops. All motion is suppressed under `prefers-reduced-motion` and essential content is visible without JS.

## Component plan

| Slot | Choice | Why |
|---|---|---|
| Header | Minimal bar (wordmark, 3 links, ghost "Sign in", primary "Open dashboard") | Calm, product-first; matches the ledger tone |
| Hero | Split asymmetric: editorial type left, interactive plot window right | Shows the product instead of describing it |
| Proof | **None** — no real logos, counts or quotes exist | Honesty rule: an empty proof strip is worse than none |
| Sections | Plot prices table, two-instalment payment plan (01–03), site visits, conditions | Each answers a real question: what is left, what does it cost, when do I pay, what am I agreeing to |
| Footer | Closing CTA band + quiet minimal footer | Confident close without invented legal details |
| App shell | Forest rail + ruled content column + topbar with closing date and data-mode badge | Dashboard reads like a ledger page |
| Tables | Semantic tables, tabular figures, status pills with text labels | Data density with hierarchy |

## Asset plan / what the user will supply

See `design/ASSETS.md`. Everything shipped is code-drawn (SVG/CSS) or self-hosted type. Photography of the estate, the layout plan and the cooperative's real logo are **missing** and are the user's to supply; nothing was faked in their place.

## Missing assets / open questions

1. Real cooperative logo and any official colour/type guidelines.
2. Photography: the Gidan Daya site, the layout plan and the show houses (with permission for the people shown).
3. A Supabase project (URL + anon key) to replace sample data; the initial migration has never been executed, so the schema and RLS are unverified.
4. Official legal/registration details for the footer (none were invented).
5. **Open questions for the cooperative:** (a) applications close 30 December 2026, but the 50% deposit is not due until 30 January 2027 — does an application without a deposit hold a plot? (b) "first-come by payment confirmation" and priority for Clerk-to-Assistant-Manager cadre can disagree; which wins when a senior cadre pays first? The app currently states both rules as written and ranks priority only within the same payment date.

## Status checklist

| Section | L1 | L2 | L3 | L4 | L5 | Inspected | Drift-checked |
|---|---|---|---|---|---|---|---|
| Landing — header, hero, plot window | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Landing — plot prices, payment plan, site visits, terms, footer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Sign in | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Dashboard overview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Plot availability | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Apply for a plot (validation, live pricing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| My application + statement PDF | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Applicant register (admin) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Allocation report + PDF/XLSX exports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Decision log

- **2026-11-18 — Single scheme, not a catalogue.** The user's correction ("just for Gidan Daya subscription") replaced the six-project subscription model with one scheme: four plot tiers priced per square metre, one application per plot, a 50% deposit and a balance, and a secretariat that verifies payments. Reason: the cooperative's call is for one estate, and a multi-project catalogue invented a product that does not exist.
- **2026-11-18 — Sample-data mode.** No Supabase credentials exist, so the repository layer serves labelled sample data and switches to Supabase when env vars are present. Reason: the deliverable must build and deploy, and the UI must never claim live data it does not have.
- **2026-11-18 — No proof strip / no testimonials.** Reason: none are real. Article: honesty rule 4.
- **2026-11-18 — Self-hosted fonts.** Fraunces + IBM Plex Sans downloaded by `scripts/fetch-fonts.mjs` into `public/fonts` (OFL 1.1) rather than loaded from a third-party CDN at runtime. Reason: performance and no runtime dependency.
- **2026-11-18 — No design skills installed.** Hallmark/UI-UX Pro Max/Impeccable were not installed: rule 6 requires approval before installing anything, and the user asked for the build, not new tooling. The two already-installed official Supabase skills were read for the schema/RLS design.
- **2026-11-18 — Kickoff menus answered, not asked.** Mode, surface, components and asset plan were decided here because the user asked for implementation in the same instruction; the brief records each choice so it can be contested.
